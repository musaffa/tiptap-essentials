import { describe, expect, test } from 'vitest';
import { subscript } from '../src/samples.js';
import { edit } from './support/edit.js';

describe('subscript', () => {
  test('reads a subscript back and writes it out as it came', () => {
    expect(edit(subscript).getHTML()).toBe(subscript);
  });

  test.for(['setSubscript', 'toggleSubscript'] as const)(
    'takes superscript off the text %s lowers',
    (command) => {
      const editor = edit('<p>H<sup>2</sup>O</p>');
      editor.commands.setTextSelection({ from: 2, to: 3 });

      expect(editor.commands[command]()).toBe(true);
      expect(editor.getHTML()).toBe(subscript);
    }
  );

  test('reads a subscript inside a superscript as the subscript alone', () => {
    expect(edit('<p>H<sup><sub>2</sub></sup>O</p>').getHTML()).toBe(subscript);
  });
});
