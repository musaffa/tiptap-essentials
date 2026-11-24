import { getStyleProperty, markInputRule, markPasteRule } from '@tiptap/core';
import {
  Highlight as TiptapHighlight,
  inputRegex,
  pasteRegex,
  type HighlightOptions as TiptapHighlightOptions
} from '@tiptap/extension-highlight';
import { ifListed } from './listed.js';

export interface HighlightOptions extends TiptapHighlightOptions {
  /**
   * The colours a highlight may take, as a body writes them:
   * `var(--tiptap-highlight-yellow)`. Any colour where null.
   */
  colors: string[] | null;

  /**
   * The colour of a highlight asked for without one, as its key and
   * `==text==` ask. A highlight of no colour where null, which a browser
   * draws in a yellow of its own.
   */
  defaultColor: string | null;
}

// Where Tiptap's highlight reads its colour from, the first it finds.
function colorOf(element: HTMLElement) {
  return (
    element.getAttribute('data-color') ||
    getStyleProperty(element, 'background-color') ||
    element.style.backgroundColor
  );
}

/**
 * Tiptap's highlight in many colours, held to a palette: a `mark` pasted in
 * that is not of one of its colours is read as its text, and none is set.
 */
export const Highlight = TiptapHighlight.extend<HighlightOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      multicolor: true,
      colors: null,
      defaultColor: null
    };
  },

  parseHTML() {
    const { colors } = this.options;

    return [
      {
        tag: 'mark',
        getAttrs: (element) =>
          colors === null || ifListed(colorOf(element), colors) !== null
            ? null
            : false
      }
    ];
  },

  addCommands() {
    const commands = this.parent!();
    const { colors, defaultColor } = this.options;
    const colored = (attributes?: { color: string }) =>
      attributes ?? (defaultColor ? { color: defaultColor } : undefined);
    const allowed = (attributes?: { color: string }) =>
      colors === null || ifListed(attributes?.color, colors) !== null;

    return {
      ...commands,
      setHighlight: (attributes) => (props) =>
        allowed(colored(attributes)) &&
        commands.setHighlight!(colored(attributes))(props),
      toggleHighlight: (attributes) => (props) =>
        allowed(colored(attributes)) &&
        commands.toggleHighlight!(colored(attributes))(props)
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: this.options.defaultColor
          ? { color: this.options.defaultColor }
          : undefined
      })
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: pasteRegex,
        type: this.type,
        getAttributes: this.options.defaultColor
          ? { color: this.options.defaultColor }
          : undefined
      })
    ];
  }
});
