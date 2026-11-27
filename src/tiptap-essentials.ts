import { Extension, type AnyExtension } from '@tiptap/core';
import type { SubscriptExtensionOptions } from '@tiptap/extension-subscript';
import type { SuperscriptExtensionOptions } from '@tiptap/extension-superscript';
import { TableKit, type TableKitOptions } from '@tiptap/extension-table';
import TextAlign, { type TextAlignOptions } from '@tiptap/extension-text-align';
import {
  TextStyleKit,
  type TextStyleKitOptions
} from '@tiptap/extension-text-style';
import type { YoutubeOptions } from '@tiptap/extension-youtube';
import StarterKit, { type StarterKitOptions } from '@tiptap/starter-kit';
import { BlockSpacing, type BlockSpacingOptions } from './block-spacing.js';
import { Color, type ColorOptions } from './color.js';
import { Document } from './document.js';
import { Figure, type FigureOptions } from './figure.js';
import { FontSize, type FontSizeOptions } from './font-size.js';
import { Gallery, type GalleryOptions } from './gallery.js';
import { Highlight, type HighlightOptions } from './highlight.js';
import { Image, type ImageOptions } from './image.js';
import { LineHeight, type LineHeightOptions } from './line-height.js';
import { PlainSpaces } from './plain-spaces.js';
import { Subscript } from './subscript.js';
import { Superscript } from './superscript.js';
import { Table, type TableOptions } from './table.js';
import { TableCell, TableHeader } from './table-cell.js';
import { TextStyle } from './text-style.js';
import { Youtube } from './youtube.js';

type Part<Options> = Partial<Options> | false;

export interface TiptapEssentialsOptions {
  starterKit: Part<StarterKitOptions>;
  /** TableKit's options, its table, cell and header being the library's. */
  tableKit:
    | (Partial<Omit<TableKitOptions, 'table'>> & { table?: Part<TableOptions> })
    | false;
  /**
   * TextStyleKit's options, its text style, font size, colour and line height
   * being the library's.
   */
  textStyleKit:
    | (Partial<
        Omit<TextStyleKitOptions, 'fontSize' | 'color' | 'lineHeight'>
      > & {
        fontSize?: Part<FontSizeOptions>;
        color?: Part<ColorOptions>;
        lineHeight?: Part<LineHeightOptions>;
      })
    | false;
  highlight: Part<HighlightOptions>;
  blockSpacing: Part<BlockSpacingOptions>;
  textAlign: Part<TextAlignOptions>;
  superscript: Part<SuperscriptExtensionOptions>;
  subscript: Part<SubscriptExtensionOptions>;
  image: Part<ImageOptions>;
  /** The figure's options, its `host` the image's unless given. */
  figure: Part<FigureOptions>;
  /**
   * The gallery's options, its `host` the image's unless given. A gallery
   * goes only with the figure, which one left with a single image becomes.
   */
  gallery: Part<GalleryOptions>;
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
        types: ['heading', 'paragraph', 'figcaption'],
        alignments: ['start', 'end', 'left', 'center', 'right', 'justify']
      },
      highlight: {},
      blockSpacing: {},
      superscript: {},
      subscript: {},
      image: {},
      figure: {},
      gallery: {},
      youtube: {},
      plainSpaces: {}
    };
  },

  addExtensions() {
    const {
      starterKit,
      tableKit,
      textStyleKit,
      highlight,
      blockSpacing,
      textAlign,
      superscript,
      subscript,
      image,
      figure,
      gallery,
      youtube,
      plainSpaces
    } = this.options;
    const extensions: AnyExtension[] = [];
    // A figure needs a document that holds it, which StarterKit's does not.
    const holdsFigures =
      figure !== false && starterKit !== false && starterKit.document !== false;

    if (starterKit !== false) {
      extensions.push(
        StarterKit.configure(
          holdsFigures ? { ...starterKit, document: false } : starterKit
        )
      );
    }

    if (holdsFigures) {
      extensions.push(Document);
    }

    if (tableKit !== false) {
      const {
        table = {},
        tableCell = {},
        tableHeader = {},
        ...rest
      } = tableKit;
      extensions.push(
        TableKit.configure({
          ...rest,
          table: false,
          tableCell: false,
          tableHeader: false
        })
      );
      if (table !== false) {
        extensions.push(Table.configure(table));
      }
      if (tableCell !== false) {
        extensions.push(TableCell.configure(tableCell));
      }
      if (tableHeader !== false) {
        extensions.push(TableHeader.configure(tableHeader));
      }
    }

    if (textStyleKit !== false) {
      const {
        fontSize = {},
        color = {},
        lineHeight = {},
        textStyle = {},
        ...rest
      } = textStyleKit;
      extensions.push(
        TextStyleKit.configure({
          ...rest,
          fontSize: false,
          color: false,
          lineHeight: false,
          textStyle: false
        })
      );
      if (textStyle !== false) {
        extensions.push(TextStyle.configure(textStyle));
      }
      if (fontSize !== false) {
        extensions.push(FontSize.configure(fontSize));
      }
      if (color !== false) {
        extensions.push(Color.configure(color));
      }
      if (lineHeight !== false) {
        extensions.push(LineHeight.configure(lineHeight));
      }
    }

    if (highlight !== false) {
      extensions.push(Highlight.configure(highlight));
    }

    if (blockSpacing !== false) {
      extensions.push(BlockSpacing.configure(blockSpacing));
    }

    if (textAlign !== false) {
      extensions.push(TextAlign.configure(textAlign));
    }

    if (superscript !== false) {
      extensions.push(Superscript.configure(superscript));
    }

    if (subscript !== false) {
      extensions.push(Subscript.configure(subscript));
    }

    if (image !== false) {
      extensions.push(Image.configure(image));
    }

    if (figure !== false) {
      extensions.push(
        Figure.configure({
          host: image === false ? null : (image.host ?? null),
          ...figure
        })
      );
    }

    if (figure !== false && gallery !== false) {
      extensions.push(
        Gallery.configure({
          host: image === false ? null : (image.host ?? null),
          ...gallery
        })
      );
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
