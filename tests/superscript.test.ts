import { describe, expect, test } from 'vitest';
import { edit } from './support/edit.js';

describe('superscript', () => {
  test.for(['setSuperscript', 'toggleSuperscript'] as const)(
    'takes subscript off the text %s raises',
    (command) => {
      const editor = edit('<p>m<sub>2</sub></p>');
      editor.commands.setTextSelection({ from: 2, to: 3 });

      expect(editor.commands[command]()).toBe(true);
      expect(editor.getHTML()).toBe('<p>m<sup>2</sup></p>');
    }
  );

  test('reads a superscript inside a subscript as the superscript alone', () => {
    expect(edit('<p>m<sub><sup>2</sup></sub></p>').getHTML()).toBe(
      '<p>m<sup>2</sup></p>'
    );
  });
});
