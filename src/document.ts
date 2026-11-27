import { Document as TiptapDocument } from '@tiptap/extension-document';

/**
 * Tiptap's document, holding the `topLevel` nodes besides its blocks: those
 * that stand at its own level and nowhere else, as a figure does, which in a
 * table's cell, a list item or a quote would float inside it.
 */
export const Document = TiptapDocument.extend({
  content: '(block | topLevel)+'
});
