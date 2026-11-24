import { Extension, type AnyExtension } from '@tiptap/core';
import type { ImageOptions } from '@tiptap/extension-image';
import Superscript, {
  type SuperscriptExtensionOptions
} from '@tiptap/extension-superscript';
import { TableKit, type TableKitOptions } from '@tiptap/extension-table';
import TextAlign, { type TextAlignOptions } from '@tiptap/extension-text-align';
import {
  TextStyle as TiptapTextStyle,
  TextStyleKit,
  type FontSizeOptions,
  type TextStyleKitOptions
} from '@tiptap/extension-text-style';
import type { YoutubeOptions } from '@tiptap/extension-youtube';
import StarterKit, { type StarterKitOptions } from '@tiptap/starter-kit';
import { FontSize, TextStyle } from './font-size.js';
import { Image } from './image.js';
import { PlainSpaces } from './plain-spaces.js';
import { Table, type TableOptions } from './table.js';
import { Youtube } from './youtube.js';

type Part<Options> = Partial<Options> | false;

export interface TiptapEssentialsOptions {
  starterKit: Part<StarterKitOptions>;
  /** TableKit's options, its table being the library's. */
  tableKit:
    | (Partial<Omit<TableKitOptions, 'table'>> & { table?: Part<TableOptions> })
    | false;
  /** TextStyleKit's options, its font size being the library's. */
  textStyleKit:
    | (Partial<Omit<TextStyleKitOptions, 'fontSize'>> & {
        fontSize?: Part<FontSizeOptions>;
      })
    | false;
  textAlign: Part<TextAlignOptions>;
  superscript: Part<SuperscriptExtensionOptions>;
  image: Part<ImageOptions>;
  youtube: Part<YoutubeOptions>;
  plainSpaces: Record<string, never> | false;
}

/**
 * Tiptap's kits and the library's own parts as one extension, each part
 * configured, or left out by `false`, through the option of its name.
 */
export const TiptapEssentials = Extension.create<TiptapEssentialsOptions>({
  name: 'tiptapEssentials',

  addOptions() {
    return {
      starterKit: {},
      tableKit: {},
      textStyleKit: {},
      textAlign: {
        types: ['heading', 'paragraph'],
        alignments: ['start', 'end', 'left', 'center', 'right', 'justify']
      },
      superscript: {},
      image: {},
      youtube: {},
      plainSpaces: {}
    };
  },

  addExtensions() {
    const {
      starterKit,
      tableKit,
      textStyleKit,
      textAlign,
      superscript,
      image,
      youtube,
      plainSpaces
    } = this.options;
    const extensions: AnyExtension[] = [];

    if (starterKit !== false) {
      extensions.push(StarterKit.configure(starterKit));
    }

    if (tableKit !== false) {
      const { table = {}, ...rest } = tableKit;
      extensions.push(TableKit.configure({ ...rest, table: false }));
      if (table !== false) {
        extensions.push(Table.configure(table));
      }
    }

    if (textStyleKit !== false) {
      const { fontSize = {}, textStyle = {}, ...rest } = textStyleKit;
      extensions.push(
        TextStyleKit.configure({ ...rest, fontSize: false, textStyle: false })
      );
      if (textStyle !== false) {
        // A span 1.x sized is read as styled only where its size is kept.
        const style = fontSize === false ? TiptapTextStyle : TextStyle;
        extensions.push(style.configure(textStyle));
      }
      if (fontSize !== false) {
        extensions.push(FontSize.configure(fontSize));
      }
    }

    if (textAlign !== false) {
      extensions.push(TextAlign.configure(textAlign));
    }

    if (superscript !== false) {
      extensions.push(Superscript.configure(superscript));
    }

    if (image !== false) {
      extensions.push(Image.configure(image));
    }

    if (youtube !== false) {
      extensions.push(Youtube.configure(youtube));
    }

    if (plainSpaces !== false) {
      extensions.push(PlainSpaces);
    }

    return extensions;
  }
});
