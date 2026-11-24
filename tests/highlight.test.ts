import { describe, expect, test } from 'vitest';
import type { Editor } from '@tiptap/core';
import { highlight } from '../src/samples.js';
import { edit } from './support/edit.js';

// Characters typed at the cursor, which the input rules see as a reader's
// typing rather than as content put in.
function type(editor: Editor, text: string) {
  for (const character of text) {
    const { from, to } = editor.state.selection;
    const insert = () => editor.state.tr.insertText(character, from, to);
    const handled = editor.view.someProp('handleTextInput', (handle) =>
      handle(editor.view, from, to, character, insert)
    );

    if (!handled) {
      editor.view.dispatch(insert());
    }
  }
}

describe('highlight', () => {
  test('reads a highlight of its palette back and writes it out as it came', () => {
    expect(edit(highlight).getHTML()).toBe(highlight);
  });

  test('reads a mark off its palette as its text', () => {
    const html = edit(
      '<p><mark data-color="yellow" style="background-color: yellow">Marked</mark> text</p>'
    ).getHTML();

    expect(html).toBe('<p>Marked text</p>');
  });

  test('reads a mark of no colour as its text', () => {
    expect(edit('<p><mark>Marked</mark> text</p>').getHTML()).toBe(
      '<p>Marked text</p>'
    );
  });

  test('highlights in its default colour on Mod-Shift-h', () => {
    const editor = edit('<p>Marked text</p>');
    editor.commands.setTextSelection({ from: 1, to: 7 });
    editor.commands.keyboardShortcut('Mod-Shift-h');

    expect(editor.getHTML()).toBe(highlight);
  });

  test('highlights in its default colour as ==text== is typed', () => {
    const editor = edit('<p>==Marked= text</p>');
    editor.commands.setTextSelection(10);
    type(editor, '=');

    expect(editor.getHTML()).toBe(highlight);
  });

  test('sets no highlight off its palette', () => {
    const editor = edit('<p>Marked text</p>');
    editor.commands.setTextSelection({ from: 1, to: 7 });

    expect(editor.commands.setHighlight({ color: 'yellow' })).toBe(false);
    expect(editor.getHTML()).toBe('<p>Marked text</p>');
  });
});
