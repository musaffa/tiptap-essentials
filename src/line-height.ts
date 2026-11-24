import {
  LineHeight as TiptapLineHeight,
  type LineHeightOptions as TiptapLineHeightOptions
} from '@tiptap/extension-text-style';
import { ifListed } from './listed.js';

export interface LineHeightOptions extends TiptapLineHeightOptions {
  /**
   * The line heights a block may take, as a body writes them:
   * `var(--tiptap-line-height-150)`. Any where null.
   */
  lineHeights: string[] | null;
}

/**
 * Tiptap's line height, on paragraphs and headings rather than a span, and
 * held to a set of steps: one pasted in that is not a step is read as none.
 * Tiptap's commands style a span inside the blocks, so these style the blocks
 * themselves, every one the selection touches.
 */
export const LineHeight = TiptapLineHeight.extend<LineHeightOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      types: ['paragraph', 'heading'],
      lineHeights: null
    };
  },

  addGlobalAttributes() {
    const { lineHeights } = this.options;

    return (this.parent?.() ?? []).map(({ types, attributes }) => {
      const { lineHeight } = attributes;
      return {
        types,
        attributes: {
          lineHeight: {
            ...lineHeight,
            parseHTML: (element: HTMLElement) =>
              ifListed(lineHeight?.parseHTML?.(element), lineHeights)
          }
        }
      };
    });
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ commands }) =>
          ifListed(lineHeight, this.options.lineHeights) !== null &&
          this.options.types
            .map((type) => commands.updateAttributes(type, { lineHeight }))
            .some((response) => response),

      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types
            .map((type) => commands.resetAttributes(type, 'lineHeight'))
            .some((response) => response)
    };
  }
});
