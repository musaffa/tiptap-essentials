import { Editor, type AnyExtension } from '@tiptap/core';
import { TiptapEssentials } from '../../src/tiptap-essentials.js';

/**
 * An editor of the library's parts, drawn into an element of its own and
 * configured as a site would be: its tables named, its palettes and steps
 * holding the values the samples write, and its images served from the host
 * they name.
 */
export function edit(
  content: string,
  extension: AnyExtension = TiptapEssentials.configure({
    tableKit: { table: { region: 'Table' } },
    textStyleKit: {
      fontSize: { fontSizes: ['var(--lg-font-size)'] },
      color: { colors: ['var(--tiptap-text-red)'] },
      lineHeight: { lineHeights: ['var(--tiptap-line-height-150)'] }
    },
    highlight: {
      colors: ['var(--tiptap-highlight-yellow)'],
      defaultColor: 'var(--tiptap-highlight-yellow)'
    },
    blockSpacing: { space: 'var(--space-40)' },
    image: { host: 'https://static.example' }
  })
) {
  return new Editor({
    element: document.createElement('div'),
    extensions: [extension],
    content
  });
}
