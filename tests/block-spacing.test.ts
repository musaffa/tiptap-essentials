import { describe, expect, test } from 'vitest';
import { spacing } from '../src/samples.js';
import { edit } from './support/edit.js';

const SPACE = 'var(--space-40)';

describe('block spacing', () => {
  test('reads space before and after back and writes it out as it came', () => {
    expect(edit(spacing).getHTML()).toBe(spacing);
  });

  test('adds space before and after every block selected, a heading among them', () => {
    const editor = edit('<h2>A</h2><p>B</p>');
    editor.commands.selectAll();
    editor.commands.addSpaceBefore();
    editor.commands.addSpaceAfter();

    const style = `margin-top: ${SPACE}; margin-bottom: ${SPACE};`;
    expect(editor.getHTML()).toBe(
      `<h2 style="${style}">A</h2><p style="${style}">B</p>`
    );
  });

  test('takes space away without leaving a margin behind', () => {
    const editor = edit(
      `<p style="margin-top: ${SPACE}; margin-bottom: ${SPACE}">A</p>`
    );
    editor.commands.selectAll();
    editor.commands.removeSpaceBefore();
    editor.commands.removeSpaceAfter();

    expect(editor.getHTML()).toBe('<p>A</p>');
  });

  test('reads a margin of another size as no space', () => {
    expect(
      edit('<p style="margin-top: 3em; margin-bottom: 0">A</p>').getHTML()
    ).toBe('<p>A</p>');
  });
});
