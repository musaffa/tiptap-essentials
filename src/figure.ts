import {
  findParentNode,
  getStyleProperty,
  Node,
  ResizableNodeView,
  type CommandProps
} from '@tiptap/core';
import {
  DOMSerializer,
  type DOMOutputSpec,
  type Node as ProseMirrorNode
} from '@tiptap/pm/model';
import {
  NodeSelection,
  Plugin,
  PluginKey,
  type Selection
} from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Image, isFromHost, type ImageAttributes } from './image.js';

/**
 * Where a figure stands: in its column, at its centre or floated to one side
 * with the text wrapping it, or reaching past it, wide to the page's width and
 * full to the window's.
 */
export type FigureLayout = 'center' | 'left' | 'right' | 'wide' | 'full';

const LAYOUTS: readonly FigureLayout[] = [
  'center',
  'left',
  'right',
  'wide',
  'full'
];

// The layouts a figure is sized in, by a share of its column: wide and full
// are as wide as what they reach.
const SIZED: readonly FigureLayout[] = ['center', 'left', 'right'];

// What a figure as wide as its column is narrowed to as it is set to one side
// of it, leaving the text room to wrap it.
const FLOATED_WIDTH = 50;

export interface FigureOptions {
  /**
   * The widths a centre, left or right figure may take, in percent of its
   * column: its handles and `setFigureWidth` stop at the nearest. One at 100
   * writes no width, taking its column's.
   */
  widths: number[];

  /** Where the site's images are served from, as the image's `host`. */
  host: string | null;
}

/** What a figure is inserted with. */
export interface FigureAttributes {
  image: ImageAttributes;
  caption?: string | null;
  credit?: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      /**
       * Inserts a figure at the cursor, splitting the text there, or after
       * the block selected; after the table, list or quote the cursor is in,
       * which holds no figure.
       */
      insertFigure: (figure: FigureAttributes) => ReturnType;
      /**
       * Sets the layout of the figure selected or holding the cursor. One as
       * wide as its column set to one side is narrowed to half of it.
       */
      setFigureLayout: (layout: FigureLayout) => ReturnType;
      /** Sizes the figure at the step of its `widths` nearest `width`. */
      setFigureWidth: (width: number) => ReturnType;
      /** Credits the figure's image. A credit of spaces alone takes it off. */
      setFigureCredit: (credit: string) => ReturnType;
      unsetFigureCredit: () => ReturnType;
      /**
       * Describes the figure's image. A description of spaces alone describes
       * it by its caption instead, where it has one.
       */
      setFigureAlt: (alt: string) => ReturnType;
      /** Swaps the figure's image, keeping its caption and its layout. */
      setFigureImage: (image: ImageAttributes) => ReturnType;
    };
  }
}

/**
 * An image with its caption and its credit: `<figure>` holding the image's
 * picture and a `<figcaption>` of the caption, written in place under the
 * picture, then the credit, which names whose the picture is and is set apart
 * from the text. A figure stands at the body's level alone, in the `topLevel`
 * group the document names: floated, it would float inside a table's cell, a
 * list item or a quote.
 *
 * Its layout is a class, `tiptap-align-left`, and its width a share of the
 * column it stands in, `--tiptap-figure-width: 50%`, which the page reads
 * where it floats it, and which handles on the figure's sides are dragged to
 * set, stopping at the nearest of its `widths`.
 */
export const Figure = Node.create<FigureOptions>({
  name: 'figure',

  group: 'topLevel',

  content: 'figureImage figcaption',

  isolating: true,

  addOptions() {
    return { widths: [25, 33, 50, 66, 75, 100], host: null };
  },

  addExtensions() {
    return [FigureImage.configure({ host: this.options.host }), Figcaption];
  },

  addAttributes() {
    return {
      layout: {
        default: 'center',
        parseHTML: (element) => layoutOf(element),
        renderHTML: (attributes) => ({
          class: `tiptap-figure tiptap-align-${attributes['layout']}`
        })
      },
      width: {
        default: null,
        parseHTML: (element) => widthOf(element, this.options.widths),
        renderHTML: (attributes) =>
          attributes['width'] &&
          SIZED.includes(attributes['layout'] as FigureLayout)
            ? { style: `--tiptap-figure-width: ${attributes['width']}%;` }
            : {}
      }
    };
  },

  parseHTML() {
    const { host } = this.options;

    return [
      {
        tag: 'figure',
        // Any other figure is read as the blocks it holds.
        getAttrs: (figure) => {
          const images = figure.querySelectorAll('img');

          return images.length === 1 &&
            isFromHost(images[0]!.closest('picture') ?? images[0]!, host)
            ? null
            : false;
        }
      }
    ];
  },

  // Written by hand rather than through a content hole, which would write a
  // caption with neither text nor a credit as an empty `<figcaption>`.
  renderHTML({ node, HTMLAttributes }) {
    const serializer = DOMSerializer.fromSchema(node.type.schema);
    const figure = document.createElement('figure');

    for (const [name, value] of Object.entries(HTMLAttributes)) {
      figure.setAttribute(name, String(value));
    }

    figure.appendChild(serializer.serializeNode(node.child(0)));

    const caption = node.child(1);
    if (caption.content.size > 0 || caption.attrs['credit']) {
      figure.appendChild(serializer.serializeNode(caption));
    }

    return figure;
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let drawn = node;
      // The picture and the caption, which ProseMirror draws.
      const element = document.createElement('div');

      // Its classes are added and taken off one by one: ProseMirror draws the
      // figure's selection and decorations as classes on it too.
      const draw = (shown: ProseMirrorNode) => {
        const { layout, width } = shown.attrs;
        const { classList } = resizable.container;
        classList.add('tiptap-figure');
        for (const each of LAYOUTS) {
          classList.toggle(`tiptap-align-${each}`, each === layout);
        }
        resizable.container.style.removeProperty('width');
        if (width && SIZED.includes(layout as FigureLayout)) {
          resizable.container.style.setProperty(
            '--tiptap-figure-width',
            `${width}%`
          );
        } else {
          resizable.container.style.removeProperty('--tiptap-figure-width');
        }
      };

      const resizable = new ResizableNodeView({
        element,
        contentElement: element,
        node,
        editor,
        getPos,
        // Drawn on the figure itself, which the text wraps, rather than on
        // what it holds.
        onResize: (width) => {
          element.style.removeProperty('width');
          element.style.removeProperty('height');
          resizable.container.style.width = `${width}px`;
        },
        onCommit: (width) => {
          const pos = getPos();
          const column = resizable.container.parentElement;

          if (
            pos === undefined ||
            !column ||
            !SIZED.includes(drawn.attrs['layout'] as FigureLayout)
          ) {
            draw(drawn);
            return;
          }

          const style = getComputedStyle(column);
          const share =
            (100 * width) /
            (column.clientWidth -
              parseFloat(style.paddingLeft) -
              parseFloat(style.paddingRight));

          editor.view.dispatch(
            editor.state.tr.setNodeMarkup(pos, undefined, {
              ...drawn.attrs,
              width: keptWidth(share, this.options.widths)
            })
          );
          draw(drawn);
        },
        onUpdate: (updated) => {
          if (updated.type !== drawn.type) {
            return false;
          }

          drawn = updated;
          draw(updated);
          return true;
        },
        options: { directions: ['left', 'right'] }
      });
      // It sizes what it is handed by a `width` attribute in pixels, which a
      // figure holds as a share of its column.
      element.style.removeProperty('width');
      draw(node);

      return {
        dom: resizable.dom,
        contentDOM: resizable.contentDOM,
        update: (updated, decorations, innerDecorations) =>
          resizable.update(updated, decorations, innerDecorations),
        destroy: () => resizable.destroy(),
        // A drag redraws the figure's size and its handles' state as it goes,
        // which are none of the text's: taken as a change to the document,
        // they would redraw the figure and end the drag.
        ignoreMutation: (mutation) =>
          mutation.type !== 'selection' &&
          (mutation.type === 'attributes' ||
            !element.contains(mutation.target))
      };
    };
  },

  addCommands() {
    const { widths } = this.options;
    const change =
      (
        attributes: (
          figure: ProseMirrorNode
        ) => Record<string, unknown> | null
      ) =>
      ({ tr, dispatch }: CommandProps) => {
        const figure = figureAt(tr.selection);
        const changed = figure && attributes(figure.node);

        if (!figure || !changed) {
          return false;
        }

        if (dispatch) {
          tr.setNodeMarkup(figure.pos, undefined, {
            ...figure.node.attrs,
            ...changed
          });
        }

        return true;
      };
    // The figure's image is its first child, and its caption its second.
    const changeChild =
      (
        index: 0 | 1,
        attributes: (
          child: ProseMirrorNode,
          figure: ProseMirrorNode
        ) => Record<string, unknown>
      ) =>
      ({ tr, dispatch }: CommandProps) => {
        const figure = figureAt(tr.selection);

        if (!figure) {
          return false;
        }

        if (dispatch) {
          const child = figure.node.child(index);
          const pos =
            figure.pos + 1 + (index === 0 ? 0 : figure.node.child(0).nodeSize);

          tr.setNodeMarkup(pos, undefined, {
            ...child.attrs,
            ...attributes(child, figure.node)
          });
        }

        return true;
      };

    return {
      insertFigure:
        ({ image, caption, credit }) =>
        ({ tr, commands }) => {
          const text = caption?.trim();
          const figure = {
            type: this.name,
            content: [
              { type: 'figureImage', attrs: image },
              {
                type: 'figcaption',
                attrs: { credit: creditText(credit) },
                content: text ? [{ type: 'text', text }] : []
              }
            ]
          };
          const at = placeAfter(tr.selection);

          return at === null
            ? commands.insertContent(figure)
            : commands.insertContentAt(at, figure);
        },

      setFigureLayout: (layout) =>
        change((figure) => {
          if (!LAYOUTS.includes(layout)) {
            return null;
          }

          const width = figure.attrs['width'] as number | null;
          const floated = layout === 'left' || layout === 'right';

          return {
            layout,
            width: !SIZED.includes(layout)
              ? null
              : floated && width === null
                ? keptWidth(FLOATED_WIDTH, widths)
                : width
          };
        }),

      setFigureWidth: (width) =>
        change((figure) =>
          SIZED.includes(figure.attrs['layout'] as FigureLayout)
            ? { width: keptWidth(width, widths) }
            : null
        ),

      setFigureCredit: (credit) =>
        changeChild(1, () => ({ credit: creditText(credit) })),

      unsetFigureCredit: () => changeChild(1, () => ({ credit: null })),

      setFigureAlt: (alt) =>
        changeChild(0, (image, figure) => ({
          alt:
            alt.trim() || figure.child(1).textContent.trim() || image.attrs['alt']
        })),

      // Every attribute the new image is not given goes back to none, rather
      // than keeping the old image's.
      setFigureImage: (image) =>
        changeChild(0, (old) => old.type.create(image).attrs)
    };
  },

  addKeyboardShortcuts() {
    return {
      // A caption is one line: Enter goes on to a paragraph after its figure.
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;

        if ($from.parent.type.name !== 'figcaption') {
          return false;
        }

        const after = $from.after($from.depth - 1);

        return editor
          .chain()
          .insertContentAt(after, { type: 'paragraph' })
          .setTextSelection(after + 1)
          .scrollIntoView()
          .run();
      }
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('cursorFigure'),
        props: {
          // The figure selected or holding the cursor, which shows the line
          // its caption is written on, empty or not.
          decorations: (state) => {
            const figure = figureAt(state.selection);

            return figure
              ? DecorationSet.create(state.doc, [
                  Decoration.node(
                    figure.pos,
                    figure.pos + figure.node.nodeSize,
                    { class: 'tiptap-cursor-figure' }
                  )
                ])
              : null;
          }
        }
      })
    ];
  }
});

/**
 * A figure's image, as the body's image is written but for the title and
 * style a figure's caption and layout stand in for. It is only ever its
 * figure's: selecting it selects the figure.
 */
export const FigureImage = Image.extend({
  name: 'figureImage',

  group: '',

  selectable: false,

  draggable: false,

  addAttributes() {
    const {
      title: _title,
      style: _style,
      ...attributes
    } = (this.parent?.() ?? {}) as Record<string, unknown>;

    return attributes;
  },

  // Ahead of the body's own image, which holds no figure's.
  parseHTML() {
    return (this.parent?.() ?? []).map((rule) => ({
      ...rule,
      context: 'figure/',
      priority: 60
    }));
  },

  addCommands() {
    return {};
  },

  // The body's own image counts the images a paste loses, a figure's among
  // them.
  addProseMirrorPlugins() {
    return [];
  }
});

/**
 * A figure's caption and its credit, as `<figcaption>`: the caption is its
 * text, written in place, and the credit, read from a photo rather than
 * written per article, an attribute drawn after it. A figure leaves out one
 * with neither.
 */
export const Figcaption = Node.create({
  name: 'figcaption',

  content: 'inline*',

  addAttributes() {
    return {
      credit: {
        default: null,
        parseHTML: (element) =>
          creditText(
            element.querySelector(':scope > .tiptap-figure-credit')
              ?.textContent
          ),
        rendered: false
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figcaption',
        context: 'figure/',
        // Another site's figcaption is a caption whole.
        contentElement: (element) =>
          (element as HTMLElement).querySelector<HTMLElement>(
            ':scope > .tiptap-figure-caption'
          ) ??
          ((element as HTMLElement).querySelector(
            ':scope > .tiptap-figure-credit'
          )
            ? element.ownerDocument!.createElement('span')
            : (element as HTMLElement))
      }
    ];
  },

  renderHTML({ node }) {
    const credit = node.attrs['credit'] as string | null;
    const captioned = node.content.size > 0;

    return [
      'figcaption',
      ...(captioned ? [['span', { class: 'tiptap-figure-caption' }, 0]] : []),
      ...(captioned && credit ? [' '] : []),
      ...(credit ? [['span', { class: 'tiptap-figure-credit' }, credit]] : [])
    ] as DOMOutputSpec;
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('figcaption');
      const contentDOM = dom.appendChild(document.createElement('span'));
      contentDOM.className = 'tiptap-figure-caption';
      const credit = document.createElement('span');
      credit.className = 'tiptap-figure-credit';
      credit.contentEditable = 'false';

      const draw = (shown: ProseMirrorNode) => {
        contentDOM.classList.toggle(
          'tiptap-figure-caption-empty',
          shown.content.size === 0
        );

        const text = shown.attrs['credit'] as string | null;
        if (text) {
          credit.textContent = text;
          dom.appendChild(credit);
        } else {
          credit.remove();
        }
      };
      draw(node);

      return {
        dom,
        contentDOM,
        update: (updated) => {
          if (updated.type !== node.type) {
            return false;
          }

          draw(updated);
          return true;
        },
        // The credit and the caption's state are drawn here, and are none of
        // the text's.
        ignoreMutation: (mutation) =>
          mutation.type !== 'selection' &&
          (mutation.type === 'attributes' || credit.contains(mutation.target))
      };
    };
  }
});

// The figure selected, or holding the cursor.
function figureAt(selection: Selection) {
  if (
    selection instanceof NodeSelection &&
    selection.node.type.name === 'figure'
  ) {
    return { pos: selection.from, node: selection.node };
  }

  return findParentNode((node) => node.type.name === 'figure')(selection) ?? null;
}

// Where a figure goes in other than at the cursor: after a block selected
// whole, or after the table, list or quote the cursor is in.
function placeAfter(selection: Selection) {
  if (selection instanceof NodeSelection) {
    return selection.$from.depth > 0 ? selection.$from.after(1) : selection.to;
  }

  return selection.$from.depth > 1 ? selection.$from.after(1) : null;
}

function layoutOf(element: HTMLElement): FigureLayout {
  return (
    LAYOUTS.find((layout) =>
      element.classList.contains(`tiptap-align-${layout}`)
    ) ?? 'center'
  );
}

// A width as a body writes it, `--tiptap-figure-width: 50%`, read only in a
// layout sized by one, and only at one of the widths.
function widthOf(element: HTMLElement, widths: number[]) {
  const width = Number(
    /^(\d+)%$/.exec(getStyleProperty(element, '--tiptap-figure-width') ?? '')?.[1]
  );

  return SIZED.includes(layoutOf(element)) &&
    widths.includes(width) &&
    width < 100
    ? width
    : null;
}

// The step nearest a width, as a figure keeps it: none for its column's whole
// width.
function keptWidth(width: number, widths: number[]) {
  const step = widths.reduce((nearest, candidate) =>
    Math.abs(candidate - width) < Math.abs(nearest - width)
      ? candidate
      : nearest
  );

  return step >= 100 ? null : step;
}

// A credit as a figure holds it: each run of spaces and line breaks one
// space, none at either end, and spaces alone no credit.
function creditText(text: string | null | undefined) {
  return text?.replace(/\s+/g, ' ').trim() || null;
}
