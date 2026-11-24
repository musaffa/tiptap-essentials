import { describe, expect, test } from 'vitest';
import { edit } from './support/edit.js';

describe('text style', () => {
  test('reads a span whose every style is dropped as its text', () => {
    const html = edit(
      '<p><span style="font-weight: 400">Plain</span> text</p>'
    ).getHTML();

    expect(html).toBe('<p>Plain text</p>');
  });
});
