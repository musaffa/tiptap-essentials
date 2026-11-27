import { findParentNode, Node } from '@tiptap/core';
import {
  DOMSerializer,
  type DOMOutputSpec,
  type Node as ProseMirrorNode,
  type Schema
} from '@tiptap/pm/model';
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
  type Selection,
  type Transaction
} from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { creditText, figureAt, placeAfter } from './figure.js';
import { Image, isFromHost, type ImageAttributes } from './image.js';

/**
 * Where a gallery stands: across its column, or reaching past it, wide to the
 * page's width and full to the window's, as a figure does.
 */
export type GalleryLayout = 'column' | 'wide' | 'full';

const LAYOUTS: readonly GalleryLayout[] = ['column', 'wide', 'full'];

// The narrowest and the widest shape a gallery draws an image at, its width
// over its height: one past either is drawn cropped to it.
const NARROWEST_RATIO = 0.05;
const WIDEST_RATIO = 20;

// What an image of a gallery carries while it is dragged, in place of the
// browser's own data, its URL and its markup, which a drop anywhere else in
// the editor would put in as a copy of it.
const DRAGGED_IMAGE = 'application/x-tiptap-gallery-image';

export interface GalleryOptions {
  /** The most images a gallery holds: an insert or an addition past it is refused. */
  maxImages: number;

  /** Where the site's images are served from, as the image's `host`. */
  host: string | null;
}

/** An image a gallery is given: its picture's attributes, and its credit. */
export interface GalleryImageAttributes extends ImageAttributes {
  credit?: string | null;
}

/** What a gallery is inserted with. */
export interface GalleryAttributes {
  images: GalleryImageAttributes[];
  caption?: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    gallery: {
      /**
       * Inserts a gallery of two images or more, up to its `maxImages`, where
       * a figure would go in.
       */
      insertGallery: (gallery: GalleryAttributes) => ReturnType;
      /**
       * Adds images at the end of the gallery selected, holding the cursor or
       * one of whose images is selected; or makes the figure selected or
       * holding the cursor a gallery of its image and them. Refused past the
       * gallery's `maxImages`.
       */
      addGalleryImages: (images: GalleryImageAttributes[]) => ReturnType;
      /** Removes the gallery's image selected. */
      removeGalleryImage: () => ReturnType;
      /**
       * Moves the gallery's image selected to `index` among its images,
       * counted from 0.
       */
      moveGalleryImageTo: (index: number) => ReturnType;
      /**
       * Sets the layout of the gallery selected, holding the cursor or one of
       * whose images is selected.
       */
      setGalleryLayout: (layout: GalleryLayout) => ReturnType;
      /**
       * Deletes the gallery selected, holding the cursor or one of whose
       * images is selected.
       */
      deleteGallery: () => ReturnType;
    };
  }
}

/**
 * Several images in justified rows under one caption: `<figure>` holding a
 * `div.tiptap-gallery-images` of its pictures and a `<figcaption>`, the
 * caption written in place and followed by its images' credits. Each picture
 * carries its image's shape, `--tiptap-ratio: 1.5`, from which the page's
 * stylesheet works out the rows, and its credit, `data-credit`. A gallery
 * stands at the body's level alone, as a figure does, and one left with a
 * single image becomes a figure of it.
 */
export const Gallery = Node.create<GalleryOptions>({
  name: 'gallery',

  group: 'topLevel',

  content: 'galleryImages figcaption',

  isolating: true,

  addOptions() {
    return { maxImages: 10, host: null };
  },

  addExtensions() {
    return [GalleryImages, GalleryImage.configure({ host: this.options.host })];
  },

  addAttributes() {
    return {
      layout: {
        default: 'column',
        parseHTML: (element) => layoutOf(element),
        renderHTML: (attributes) => ({
          class: classesOf(attributes['layout'] as GalleryLayout).join(' ')
        })
      }
    };
  },

  parseHTML() {
    const { host } = this.options;

    return [
      {
        tag: 'figure.tiptap-gallery',
        // One its host leaves fewer than two images of is read as a figure
        // or as what it holds, as any other figure is.
        getAttrs: (figure) =>
          Array.from(figure.querySelectorAll('img')).filter((img) =>
            isFromHost(img.closest('picture') ?? img, host)
          ).length >= 2
            ? null
            : false
      }
    ];
  },

  // Written by hand rather than through a content hole, which would write a
  // caption with neither text nor a credit as an empty `<figcaption>`.
  renderHTML({ node, HTMLAttributes }) {
    const serializer = DOMSerializer.fromSchema(node.type.schema);
    const gallery = document.createElement('figure');

    for (const [name, value] of Object.entries(HTMLAttributes)) {
      gallery.setAttribute(name, String(value));
    }

    gallery.appendChild(serializer.serializeNode(node.child(0)));

    const caption = node.child(1);
    if (caption.content.size > 0 || caption.attrs['credit']) {
      gallery.appendChild(serializer.serializeNode(caption));
    }

    return gallery;
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('figure');

      // Its classes are added and taken off one by one: ProseMirror draws the
      // gallery's selection and decorations as classes on it too.
      const draw = (shown: ProseMirrorNode) => {
        const drawn = classesOf(shown.attrs['layout'] as GalleryLayout);

        for (const layout of LAYOUTS) {
          for (const name of classesOf(layout)) {
            dom.classList.toggle(name, drawn.includes(name));
          }
        }
      };
      draw(node);

      return {
        dom,
        contentDOM: dom,
        update: (updated) => {
          if (updated.type !== node.type) {
            return false;
          }

          draw(updated);
          return true;
        },
        ignoreMutation: (mutation) =>
          mutation.type === 'attributes' && mutation.target === dom
      };
    };
  },

  addCommands() {
    const { maxImages } = this.options;

    return {
      insertGallery:
        ({ images, caption }) =>
        ({ tr, commands }) => {
          if (images.length < 2 || images.length > maxImages) {
            return false;
          }

          const text = caption?.trim();
          const gallery = {
            type: this.name,
            content: [
              {
                type: 'galleryImages',
                content: images.map((image) => ({
                  type: 'galleryImage',
                  attrs: imageAttributes(image)
                }))
              },
              {
                type: 'figcaption',
                attrs: {
                  credit: creditLine(images.map((image) => image.credit))
                },
                content: text ? [{ type: 'text', text }] : []
              }
            ]
          };
          const at = placeAfter(tr.selection);

          return at === null
            ? commands.insertContent(gallery)
            : commands.insertContentAt(at, gallery);
        },

      addGalleryImages:
        (images) =>
        ({ tr, state, dispatch }) => {
          const gallery = galleryAt(tr.selection);
          const figure = gallery ? null : figureAt(tr.selection);
          const held = gallery ? gallery.node.child(0).childCount : 1;

          if (
            (!gallery && !figure) ||
            images.length === 0 ||
            held + images.length > maxImages
          ) {
            return false;
          }

          if (dispatch) {
            const added = images.map((image) =>
              state.schema.nodes['galleryImage']!.create(imageAttributes(image))
            );

            if (gallery) {
              // At the end of its images.
              tr.insert(gallery.pos + gallery.node.child(0).nodeSize, added);
            } else if (figure) {
              tr.replaceWith(
                figure.pos,
                figure.pos + figure.node.nodeSize,
                galleryOfFigure(figure.node, added, state.schema)
              );
              tr.setSelection(NodeSelection.create(tr.doc, figure.pos));
            }
          }

          return true;
        },

      removeGalleryImage:
        () =>
        ({ tr, dispatch }) => {
          const image = selectedImage(tr.selection);

          if (!image) {
            return false;
          }

          if (dispatch) {
            tr.delete(image.pos, image.pos + image.node.nodeSize);

            // The image now in its place is selected, or the one before it
            // where it was the last, so that the gallery's menu stays.
            const images = tr.doc.nodeAt(image.imagesPos)!;
            const index = Math.min(image.index, images.childCount - 1);
            tr.setSelection(
              NodeSelection.create(
                tr.doc,
                positionAmong(image.imagesPos, images, index)
              )
            );
          }

          return true;
        },

      moveGalleryImageTo:
        (index) =>
        ({ tr, dispatch }) => {
          const image = selectedImage(tr.selection);
          const count = image ? tr.doc.nodeAt(image.imagesPos)!.childCount : 0;

          if (
            !image ||
            !Number.isInteger(index) ||
            index < 0 ||
            index >= count ||
            index === image.index
          ) {
            return false;
          }

          if (dispatch) {
            tr.delete(image.pos, image.pos + image.node.nodeSize);

            const at = positionAmong(
              image.imagesPos,
              tr.doc.nodeAt(image.imagesPos)!,
              index
            );
            tr.insert(at, image.node);
            tr.setSelection(NodeSelection.create(tr.doc, at));
          }

          return true;
        },

      setGalleryLayout:
        (layout) =>
        ({ tr, dispatch }) => {
          const gallery = galleryAt(tr.selection);

          if (!gallery || !LAYOUTS.includes(layout)) {
            return false;
          }

          if (dispatch) {
            tr.setNodeMarkup(gallery.pos, undefined, {
              ...gallery.node.attrs,
              layout
            });
          }

          return true;
        },

      // Tiptap's deleteNode looks only at the nodes holding the cursor, never
      // at a gallery selected whole.
      deleteGallery:
        () =>
        ({ tr, dispatch }) => {
          const gallery = galleryAt(tr.selection);

          if (!gallery) {
            return false;
          }

          if (dispatch) {
            tr.delete(gallery.pos, gallery.pos + gallery.node.nodeSize);
            tr.scrollIntoView();
          }

          return true;
        }
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('cursorGallery'),
        props: {
          // The gallery selected, one of whose images is, or holding the
          // cursor, which shows the line its caption is written on, empty or
          // not.
          decorations: (state) => {
            const gallery = galleryAt(state.selection);

            return gallery
              ? DecorationSet.create(state.doc, [
                  Decoration.node(
                    gallery.pos,
                    gallery.pos + gallery.node.nodeSize,
                    { class: 'tiptap-cursor-gallery' }
                  )
                ])
              : null;
          },
          // An image dragged out of its gallery goes nowhere: its gallery
          // takes it back only among its images.
          handleDrop: (_view, event) =>
            event.dataTransfer?.types.includes(DRAGGED_IMAGE) ?? false
        }
      }),
      new Plugin({
        key: new PluginKey('galleryInStep'),
        // A gallery an edit leaves with one image becomes a figure of it, and
        // every other names its images' credits as they now stand. Galleries
        // stand only at the body's level.
        appendTransaction: (transactions, _old, state) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          const galleries: { pos: number; node: ProseMirrorNode }[] = [];
          state.doc.forEach((node, offset) => {
            if (node.type.name === this.name) {
              galleries.push({ pos: offset, node });
            }
          });

          // From the last, so that each gallery still stands where it was
          // found.
          const tr = state.tr;
          for (const { pos, node } of galleries.reverse()) {
            const images = node.child(0);
            const caption = node.child(1);

            if (images.childCount === 1) {
              replaceWithFigure(tr, pos, node);
              continue;
            }

            const credit = creditLine(
              images.content.content.map((image) => image.attrs['credit'])
            );
            if (credit !== caption.attrs['credit']) {
              tr.setNodeMarkup(pos + 1 + images.nodeSize, undefined, {
                ...caption.attrs,
                credit
              });
            }
          }

          return tr.docChanged ? tr : null;
        }
      })
    ];
  }
});

/**
 * The box a gallery's images stand in, which the page's stylesheet lays out
 * in rows. In the editor, an image of it dragged to another place among them
 * moves there.
 */
export const GalleryImages = Node.create({
  name: 'galleryImages',

  content: 'galleryImage+',

  // Its images are selected one by one, the gallery whole; the box alone
  // holds nothing to act on.
  selectable: false,

  parseHTML() {
    return [{ tag: 'div.tiptap-gallery-images', context: 'gallery/' }];
  },

  renderHTML() {
    return ['div', { class: 'tiptap-gallery-images' }, 0];
  },

  addNodeView() {
    return ({ editor, getPos }) => {
      const dom = document.createElement('div');
      dom.className = 'tiptap-gallery-images';

      // The image dragged, by its place among the images, and the one a drop
      // would land beside, marked on its side.
      let dragged: number | null = null;
      let marked: HTMLElement | null = null;

      const images = () => Array.from(dom.children) as HTMLElement[];

      const unmark = () => {
        marked?.classList.remove('tiptap-drop-before', 'tiptap-drop-after');
        marked = null;
      };

      // Where a drop at the pointer puts the image, as a place among the
      // images: beside the one nearest the pointer in its row, before it, or
      // after it past its middle.
      const placeAt = (event: DragEvent) => {
        let nearest: {
          index: number;
          element: HTMLElement;
          rect: DOMRect;
          down: number;
          across: number;
        } | null = null;

        for (const [index, element] of images().entries()) {
          const rect = element.getBoundingClientRect();
          const down = Math.max(
            rect.top - event.clientY,
            0,
            event.clientY - rect.bottom
          );
          const across = Math.max(
            rect.left - event.clientX,
            0,
            event.clientX - rect.right
          );

          if (
            !nearest ||
            down < nearest.down ||
            (down === nearest.down && across < nearest.across)
          ) {
            nearest = { index, element, rect, down, across };
          }
        }

        if (!nearest) {
          return null;
        }

        const { index, element, rect } = nearest;
        const after = event.clientX > rect.left + rect.width / 2;

        return {
          index: after ? index + 1 : index,
          element,
          side: after ? 'after' : 'before'
        };
      };

      dom.addEventListener('dragstart', (event) => {
        const index = images().findIndex((image) =>
          image.contains(event.target as Element)
        );

        if (index < 0 || !event.dataTransfer) {
          return;
        }

        dragged = index;
        event.dataTransfer.clearData();
        event.dataTransfer.setData(DRAGGED_IMAGE, String(index));
        event.dataTransfer.effectAllowed = 'move';
      });

      dom.addEventListener('dragover', (event) => {
        if (dragged === null) {
          return;
        }

        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }

        const place = placeAt(event);
        unmark();
        if (place) {
          place.element.classList.add(`tiptap-drop-${place.side}`);
          marked = place.element;
        }
      });

      dom.addEventListener('dragleave', (event) => {
        if (!dom.contains(event.relatedTarget as Element | null)) {
          unmark();
        }
      });

      dom.addEventListener('drop', (event) => {
        if (dragged === null) {
          return;
        }

        event.preventDefault();

        const from = dragged;
        const place = placeAt(event);
        const pos = getPos();
        dragged = null;
        unmark();

        if (!place || pos === undefined) {
          return;
        }

        // Its place once taken out from among the images.
        const to = place.index > from ? place.index - 1 : place.index;

        editor
          .chain()
          .setNodeSelection(
            positionAmong(pos, editor.state.doc.nodeAt(pos)!, from)
          )
          .moveGalleryImageTo(to)
          .focus()
          .run();
      });

      dom.addEventListener('dragend', () => {
        dragged = null;
        unmark();
      });

      return {
        dom,
        contentDOM: dom,
        // A drag among the images is the gallery's own, which ProseMirror
        // would take as a move of the selection; any other is ProseMirror's.
        stopEvent: (event) =>
          dragged !== null &&
          (event.type.startsWith('drag') || event.type === 'drop')
      };
    };
  }
});

/**
 * A gallery's image, as a figure's is written but for its picture carrying
 * its shape and its credit, which its gallery's caption names. It is selected
 * on its own, for its gallery's menu to move or remove it.
 */
export const GalleryImage = Image.extend({
  name: 'galleryImage',

  group: '',

  draggable: false,

  addAttributes() {
    const {
      title: _title,
      style: _style,
      ...attributes
    } = (this.parent?.() ?? {}) as Record<string, unknown>;

    return {
      ...attributes,
      credit: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          creditText(element.getAttribute('data-credit')),
        rendered: false
      }
    };
  },

  // Ahead of the body's own image, which holds no gallery's.
  parseHTML() {
    return (this.parent?.() ?? []).map((rule) => ({
      ...rule,
      context: 'galleryImages/',
      priority: 60
    }));
  },

  // On the picture, or on the image where it is written without one.
  renderHTML({ node, HTMLAttributes }) {
    const [tag, attributes, ...children] = this.parent!({
      node,
      HTMLAttributes
    }) as [string, Record<string, unknown>, ...DOMOutputSpec[]];
    const ratio = ratioOf(node);
    const credit = node.attrs['credit'] as string | null;

    return [
      tag,
      {
        ...attributes,
        ...(ratio !== null && { style: `--tiptap-ratio: ${ratio};` }),
        ...(credit && { 'data-credit': credit })
      },
      ...children
    ] as DOMOutputSpec;
  },

  addCommands() {
    return {};
  },

  // The body's own image counts the images a paste loses, a gallery's among
  // them.
  addProseMirrorPlugins() {
    return [];
  }
});

// The gallery selected, holding the cursor, or one of whose images is
// selected.
function galleryAt(selection: Selection) {
  if (
    selection instanceof NodeSelection &&
    selection.node.type.name === 'gallery'
  ) {
    return { pos: selection.from, node: selection.node };
  }

  return (
    findParentNode((node) => node.type.name === 'gallery')(selection) ?? null
  );
}

// The gallery's image selected: where it stands, its place among its
// gallery's images, and where those stand.
function selectedImage(selection: Selection) {
  if (
    !(selection instanceof NodeSelection) ||
    selection.node.type.name !== 'galleryImage'
  ) {
    return null;
  }

  const { $from } = selection;

  return {
    pos: selection.from,
    node: selection.node,
    index: $from.index(),
    imagesPos: $from.before()
  };
}

// Where the image at `index` among a gallery's images stands, or where one
// past the last would.
function positionAmong(
  imagesPos: number,
  images: ProseMirrorNode,
  index: number
) {
  let pos = imagesPos + 1;

  for (let each = 0; each < index; each++) {
    pos += images.child(each).nodeSize;
  }

  return pos;
}

function imageAttributes(image: GalleryImageAttributes) {
  return { ...image, credit: creditText(image.credit) };
}

// A gallery's credits as its caption names them: each once, in its images'
// order, set apart by semicolons, since a credit may hold a comma ("Jane Doe,
// Reuters").
function creditLine(credits: (string | null | undefined)[]) {
  const named = new Set(
    credits.flatMap((credit) => creditText(credit) ?? [])
  );

  return [...named].join('; ') || null;
}

// An image's shape as its gallery draws it, its width over its height, held
// between the narrowest and the widest and written to four decimals; none
// where its size is unknown.
function ratioOf(image: ProseMirrorNode) {
  const ratio = Number(image.attrs['width']) / Number(image.attrs['height']);

  if (!Number.isFinite(ratio) || ratio <= 0) {
    return null;
  }

  const held = Math.min(Math.max(ratio, NARROWEST_RATIO), WIDEST_RATIO);

  return Math.round(held * 10000) / 10000;
}

function layoutOf(element: HTMLElement): GalleryLayout {
  return (
    LAYOUTS.find((layout) =>
      element.classList.contains(`tiptap-align-${layout}`)
    ) ?? 'column'
  );
}

// A gallery's classes: across its column it takes no layout's, the classes
// being the ones figures share, whose centre, left and right take a share of
// the column.
function classesOf(layout: GalleryLayout) {
  return layout === 'column'
    ? ['tiptap-gallery']
    : ['tiptap-gallery', `tiptap-align-${layout}`];
}

// A figure grown into a gallery: its image first, with its credit, then the
// images added, under its caption; wide and full as they were, and any other
// layout across the column, a gallery taking no share of it.
function galleryOfFigure(
  figure: ProseMirrorNode,
  added: ProseMirrorNode[],
  schema: Schema
) {
  const image = figure.child(0);
  const caption = figure.child(1);
  const layout = figure.attrs['layout'];

  return schema.nodes['gallery']!.create(
    { layout: layout === 'wide' || layout === 'full' ? layout : 'column' },
    [
      schema.nodes['galleryImages']!.create(null, [
        schema.nodes['galleryImage']!.create({
          ...image.attrs,
          credit: caption.attrs['credit']
        }),
        ...added
      ]),
      caption
    ]
  );
}

// A gallery left with one image as the figure of it: its caption kept, the
// image's credit the figure's, wide and full as they were, and the column
// the centre.
function figureOfGallery(gallery: ProseMirrorNode, schema: Schema) {
  const image = gallery.child(0).child(0);
  const caption = gallery.child(1);
  const layout = gallery.attrs['layout'] as GalleryLayout;

  return schema.nodes['figure']!.create(
    { layout: layout === 'column' ? 'center' : layout },
    [
      schema.nodes['figureImage']!.create(image.attrs),
      caption.type.create(
        { ...caption.attrs, credit: image.attrs['credit'] },
        caption.content
      )
    ]
  );
}

// Puts a gallery left with one image's figure in its place: the cursor in
// its caption stays where it was in the text, and a selection of the gallery
// or of its image selects the figure.
function replaceWithFigure(
  tr: Transaction,
  pos: number,
  gallery: ProseMirrorNode
) {
  const figure = figureOfGallery(gallery, tr.doc.type.schema);
  const { selection } = tr;
  const end = pos + gallery.nodeSize;
  const captionAt = pos + 1 + gallery.child(0).nodeSize + 1;
  const figureCaptionAt = pos + 1 + figure.child(0).nodeSize + 1;

  tr.replaceWith(pos, end, figure);

  if (selection.from < pos || selection.to > end) {
    return;
  }

  tr.setSelection(
    selection instanceof TextSelection && selection.from >= captionAt
      ? TextSelection.create(
          tr.doc,
          figureCaptionAt + selection.from - captionAt,
          figureCaptionAt + selection.to - captionAt
        )
      : NodeSelection.create(tr.doc, pos)
  );
}
