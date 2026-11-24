import {
  FontSize as TiptapFontSize,
  type FontSizeOptions as TiptapFontSizeOptions
} from '@tiptap/extension-text-style';
import { ifListed } from './listed.js';

// 1.x wrote a size as a span of one of these classes, each standing for one
// of the site's size properties.
const CLASS_SIZES: Record<string, string> = {
  'tiptap-sm-font': 'var(--sm-font-size)',
  'tiptap-md-font': 'var(--md-font-size)',
  'tiptap-lg-font': 'var(--lg-font-size)',
  'tiptap-xl-font': 'var(--xl-font-size)'
};

function classSize(element: HTMLElement) {
  const name = Array.from(element.classList).find((name) => name in CLASS_SIZES);
  return name ? CLASS_SIZES[name] : null;
}

export interface FontSizeOptions extends TiptapFontSizeOptions {
  /**
   * The sizes a text may take, as a body writes them: `var(--lg-font-size)`.
   * Any where null.
   */
  fontSizes: string[] | null;
}

/**
 * Tiptap's font size, held to a set of sizes, and reading 1.x's size classes
 * as the sizes they stood for: a size pasted in that is not one of the set is
 * read as none, and none is set.
 */
export const FontSize = TiptapFontSize.extend<FontSizeOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      fontSizes: null
    };
  },

  addGlobalAttributes() {
    const { fontSizes } = this.options;

    return (this.parent?.() ?? []).map(({ types, attributes }) => {
      const { fontSize } = attributes;
      return {
        types,
        attributes: {
          fontSize: {
            ...fontSize,
            parseHTML: (element: HTMLElement) =>
              ifListed(
                fontSize?.parseHTML?.(element) || classSize(element),
                fontSizes
              )
          }
        }
      };
    });
  },

  addCommands() {
    const commands = this.parent!();

    return {
      ...commands,
      setFontSize: (fontSize) => (props) =>
        ifListed(fontSize, this.options.fontSizes) !== null &&
        commands.setFontSize!(fontSize)(props)
    };
  }
});
