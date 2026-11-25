import { mergeAttributes } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import TiptapImage, {
  type ImageOptions as TiptapImageOptions
} from '@tiptap/extension-image';

/** A format a picture offers its image in, and the widths stored in it. */
export interface PictureSource {
  type: string;
  srcset: string;
}

export interface ImageOptions extends TiptapImageOptions {
  /**
   * Where the site's images are served from, `https://static.example`. Given
   * one, an image is read only where every address it is fetched from is
   * there, any other dropped as it is read; without one, every address is
   * kept.
   */
  host: string | null;

  /** Told how many images a paste lost for being from anywhere else. */
  onImagesRefused: ((count: number) => void) | null;
}

/** What an image is inserted with. */
export interface ImageAttributes {
  src: string;
  alt?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
  srcset?: string | null;
  sizes?: string | null;
  loading?: string | null;
  style?: string | null;
  sources?: PictureSource[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    responsiveImage: {
      /** Inserts an image with the attributes a responsive one is written with. */
      setImage: (options: ImageAttributes) => ReturnType;
    };
  }
}

/**
 * Tiptap's image, taking the attributes a responsive image is written with.
 * Given sources, it is written as a `<picture>`: a `<source>` for each,
 * ahead of the `<img>` a browser drawing none of them is given. Read back,
 * the picture is that image again.
 */
export const Image = TiptapImage.extend<ImageOptions>({
  addOptions() {
    return { ...this.parent!(), host: null, onImagesRefused: null };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      srcset: { default: null },
      sizes: { default: null },
      loading: { default: null },
      style: { default: null },
      sources: {
        default: [],
        parseHTML: (element: HTMLElement) => sourcesOf(element),
        renderHTML: () => ({})
      }
    };
  },

  parseHTML() {
    const { host } = this.options;

    return [
      {
        tag: 'picture',
        getAttrs: (picture) =>
          isFromHost(picture, host) && pictureAttributes(picture)
      },
      ...(this.parent?.() ?? []).map((rule) => ({
        ...rule,
        // An img inside a picture is read with its picture's sources, where
        // the picture's own rule turned them down.
        getAttrs: (img: HTMLElement) =>
          isFromHost(img.closest('picture') ?? img, host)
            ? (rule.getAttrs?.(img) ?? null)
            : false
      }))
    ];
  },

  addProseMirrorPlugins() {
    const { host, onImagesRefused } = this.options;

    if (host === null || onImagesRefused === null) {
      return [];
    }

    return [
      new Plugin({
        key: new PluginKey('imagesRefused'),
        props: {
          // Read into a document of its own: in one the page's document
          // made, a pasted image would load, and run its `onerror`.
          transformPastedHTML(html) {
            const pasted = new DOMParser().parseFromString(html, 'text/html');
            const refused = Array.from(pasted.querySelectorAll('img')).filter(
              (img) => !isFromHost(img.closest('picture') ?? img, host)
            ).length;

            if (refused > 0) {
              onImagesRefused(refused);
            }

            return html;
          }
        }
      })
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const img: DOMOutputSpec = [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
    ];
    const sources = node.attrs['sources'] as PictureSource[];

    if (sources.length === 0) {
      return img;
    }

    const { sizes } = node.attrs;
    return [
      'picture',
      {},
      ...sources.map(({ type, srcset }): DOMOutputSpec => [
        'source',
        { type, srcset, sizes }
      ]),
      img
    ];
  }
});

function pictureAttributes(picture: HTMLElement) {
  const img = picture.querySelector('img');

  if (!img) {
    return false;
  }

  return Object.fromEntries(
    Array.from(img.attributes, ({ name, value }) => [name, value])
  );
}

// Every address an image is fetched from: its img's src, and each URL of the
// srcsets it and its picture's sources offer.
function addressesOf(element: HTMLElement) {
  const img =
    element.tagName === 'PICTURE' ? element.querySelector('img') : element;
  const offers = [img, ...Array.from(element.querySelectorAll('source'))];
  const srcsetUrls = offers.flatMap((offer) =>
    (offer?.getAttribute('srcset') ?? '')
      .split(',')
      .map((candidate) => candidate.trim().split(/\s+/)[0] ?? '')
  );

  return [img?.getAttribute('src') ?? '', ...srcsetUrls].filter(Boolean);
}

function isFromHost(element: HTMLElement, host: string | null) {
  return (
    host === null ||
    addressesOf(element).every((address) => address.startsWith(`${host}/`))
  );
}

function sourcesOf(element: HTMLElement): PictureSource[] {
  if (element.tagName !== 'PICTURE') {
    return [];
  }

  return Array.from(element.querySelectorAll('source')).flatMap((source) => {
    const type = source.getAttribute('type');
    const srcset = source.getAttribute('srcset');
    return type && srcset ? [{ type, srcset }] : [];
  });
}
