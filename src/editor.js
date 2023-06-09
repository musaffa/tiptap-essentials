import { Editor } from '@tiptap/core';

export default class CustomEditor extends Editor {
  constructor(args) {
    super({
      editorProps: {
        transformPastedText(text) {
          return text.replace(/\xA0/g, ' ');
        },
        transformPastedHTML(html) {
          return html.replace(/\xA0/g, ' ');
        }
      },
      ...args
    });
  }
}
