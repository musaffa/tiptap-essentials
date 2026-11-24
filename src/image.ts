import { mergeAttributes } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import TiptapImage from '@tiptap/extension-image';

/** A format a picture offers its image in, and the widths stored in it. */
export interface PictureSource {
  type: string;
  srcset: string;
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
export const Image = TiptapImage.extend({
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
    return [
      { tag: 'picture', getAttrs: pictureAttributes },
      ...(this.parent?.() ?? [])
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
