import {
  getAttributesFromExtensions,
  type ExtensionAttribute
} from '@tiptap/core';
import { TextStyle as TiptapTextStyle } from '@tiptap/extension-text-style';
import type { TagParseRule } from '@tiptap/pm/model';

/**
 * Tiptap's text style, reading a span only where a style a text keeps is on
 * it — a colour of the palette, one of the sizes. A span whose every style is
 * dropped, a colour off the palette or a font, is read as its text, where
 * Tiptap's would keep it as a bare span.
 */
export const TextStyle = TiptapTextStyle.extend({
  parseHTML() {
    const { editor, name } = this;
    const [styled] = (this.parent?.() ?? []) as TagParseRule[];
    let styles: ExtensionAttribute[] | undefined;

    // The text's styles are read as a body is, the editor built by then.
    const keepsAStyle = (element: HTMLElement) => {
      if (!editor) {
        return element.hasAttribute('style');
      }

      styles ??= getAttributesFromExtensions(
        editor.extensionManager.extensions
      ).filter(({ type }) => type === name);

      return styles.some(({ attribute }) => {
        const value: unknown = attribute.parseHTML?.(element);
        return typeof value === 'string' ? value.trim() !== '' : value != null;
      });
    };

    return [
      {
        tag: 'span',
        consuming: false,
        getAttrs: (element) => {
          // Tiptap's reading of a styled span hands the styles of a span
          // inside it on to that span, which is read on its own.
          styled?.getAttrs?.(element);

          return keepsAStyle(element) ? {} : false;
        }
      }
    ];
  }
});
