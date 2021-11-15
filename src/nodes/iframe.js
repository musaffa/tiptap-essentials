import { Node, mergeAttributes } from '@tiptap/core';

export const Iframe = Node.create({
  name: 'iframe',

  group: 'inline',

  inline: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },

  addAttributes() {
    return {
      src: {},
      title: { default: null },
      style: { default: null },
      loading: { default: 'lazy' },
      allow: { default: null },
      allowfullscreen: { default: 'false' }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src]'
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'iframe',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
    ];
  }
});
