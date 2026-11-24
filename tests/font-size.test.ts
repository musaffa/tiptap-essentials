import { describe, expect, test } from 'vitest';
import { size } from '../src/samples.js';
import { edit } from './support/edit.js';

describe('font size', () => {
  test('reads a size back and writes it out as it came', () => {
    expect(edit(size).getHTML()).toBe(size);
  });

  test("reads 1.x's size class as the size it stood for", () => {
    const html = edit(
      '<p><span class="tiptap-lg-font">Large</span> text</p>'
    ).getHTML();

    expect(html).toBe(size);
  });

  test('reads a span of any other class as its text', () => {
    const html = edit(
      '<p><span class="tiptap-image-caption">A</span> b</p>'
    ).getHTML();

    expect(html).toBe('<p>A b</p>');
  });
});
