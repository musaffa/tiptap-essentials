import { Editor, type AnyExtension } from '@tiptap/core';
import { TiptapEssentials } from '../tiptap-essentials.js';

/** An editor of the library's parts, drawn into an element of its own. */
export function edit(
  content: string,
  extension: AnyExtension = TiptapEssentials.configure({
    tableKit: { table: { region: 'Table' } }
  })
) {
  return new Editor({
    element: document.createElement('div'),
    extensions: [extension],
    content
  });
}
