import {
  FontSize as TiptapFontSize,
  TextStyle as TiptapTextStyle
} from '@tiptap/extension-text-style';

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

/** Tiptap's text style, reading a span 1.x sized by its class as styled. */
export const TextStyle = TiptapTextStyle.extend({
  parseHTML() {
    return [
      ...(this.parent?.() ?? []),
      {
        tag: 'span',
        consuming: false,
        getAttrs: (element) => (classSize(element) ? {} : false)
      }
    ];
  }
});

/** Tiptap's font size, reading 1.x's size classes as the sizes they stood for. */
export const FontSize = TiptapFontSize.extend({
  addGlobalAttributes() {
    return (this.parent?.() ?? []).map(({ types, attributes }) => {
      const { fontSize } = attributes;
      return {
        types,
        attributes: {
          fontSize: {
            ...fontSize,
            parseHTML: (element: HTMLElement) =>
              fontSize?.parseHTML?.(element) || classSize(element)
          }
        }
      };
    });
  }
});
