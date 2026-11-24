import {
  Color as TiptapColor,
  type ColorOptions as TiptapColorOptions
} from '@tiptap/extension-text-style';
import { ifListed } from './listed.js';

export interface ColorOptions extends TiptapColorOptions {
  /**
   * The colours a text may take, as a body writes them:
   * `var(--tiptap-text-red)`. Any colour where null.
   */
  colors: string[] | null;
}

/**
 * Tiptap's text colour, held to a palette: a colour pasted in that is not one
 * of it is read as none, and none is set.
 */
export const Color = TiptapColor.extend<ColorOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      colors: null
    };
  },

  addGlobalAttributes() {
    const { colors } = this.options;

    return (this.parent?.() ?? []).map(({ types, attributes }) => {
      const { color } = attributes;
      return {
        types,
        attributes: {
          color: {
            ...color,
            parseHTML: (element: HTMLElement) =>
              ifListed(color?.parseHTML?.(element), colors)
          }
        }
      };
    });
  },

  addCommands() {
    const commands = this.parent!();

    return {
      ...commands,
      setColor: (color) => (props) =>
        ifListed(color, this.options.colors) !== null &&
        commands.setColor!(color)(props)
    };
  }
});
