import { Mark, mergeAttributes } from '@tiptap/core';

export const SpanWrapper = Mark.create({
  name: 'spanWrapper',

  addAttributes() {
    return {
      class: { default: null }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span'
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0
    ];
  }
});
