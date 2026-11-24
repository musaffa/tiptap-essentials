import { describe, expect, test } from 'vitest';
import { color } from '../src/samples.js';
import { edit } from './support/edit.js';

describe('color', () => {
  test('reads a colour of its palette back and writes it out as it came', () => {
    expect(edit(color).getHTML()).toBe(color);
  });

  test('reads a colour off its palette as none', () => {
    const html = edit(
      '<p><span style="color: #ff0000">Red</span> text</p>'
    ).getHTML();

    expect(html).toBe('<p>Red text</p>');
  });

  test('sets no colour off its palette', () => {
    const editor = edit('<p>Red text</p>');
    editor.commands.setTextSelection({ from: 1, to: 4 });

    expect(editor.commands.setColor('#ff0000')).toBe(false);
    expect(editor.getHTML()).toBe('<p>Red text</p>');
  });
});
