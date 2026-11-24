import { describe, expect, test } from 'vitest';
import { edit } from './support/edit.js';

const STEP = 'var(--tiptap-line-height-150)';

describe('line height', () => {
  test('sets the line height of every block selected, a heading among them', () => {
    const editor = edit('<h2>A</h2><p>B</p>');
    editor.commands.selectAll();
    editor.commands.setLineHeight(STEP);

    expect(editor.getHTML()).toBe(
      `<h2 style="line-height: ${STEP};">A</h2><p style="line-height: ${STEP};">B</p>`
    );
  });

  test('takes the line height off every block selected', () => {
    const editor = edit(
      `<h2 style="line-height: ${STEP}">A</h2><p style="line-height: ${STEP}">B</p>`
    );
    editor.commands.selectAll();
    editor.commands.unsetLineHeight();

    expect(editor.getHTML()).toBe('<h2>A</h2><p>B</p>');
  });

  test('reads a line height off its steps as none', () => {
    expect(edit('<p style="line-height: 107%">A</p>').getHTML()).toBe(
      '<p>A</p>'
    );
  });

  test('sets none off its steps', () => {
    const editor = edit('<p>A</p>');
    editor.commands.selectAll();

    expect(editor.commands.setLineHeight('2')).toBe(false);
    expect(editor.getHTML()).toBe('<p>A</p>');
  });
});
