import { describe, expect, test } from 'vitest';
import { edit } from './support/edit.js';

describe('plain spaces', () => {
  test('reads a no-break space pasted as text as a space', () => {
    const editor = edit('<p></p>');
    editor.view.pasteText('a\u{a0}b');

    expect(editor.getHTML()).toBe('<p>a b</p>');
  });

  test('reads a no-break space pasted in HTML as a space', () => {
    const editor = edit('<p></p>');
    editor.view.pasteHTML('<p>a&nbsp;b</p>');

    expect(editor.getHTML()).toBe('<p>a b</p>');
  });
});
