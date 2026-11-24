import { describe, expect, test } from 'vitest';
import { picture } from './samples.js';
import { edit } from './test/edit.js';

describe('image', () => {
  test('reads a picture back and writes it out as it came', () => {
    expect(edit(picture).getHTML()).toBe(picture);
  });

  test('writes an image without sources as a bare img', () => {
    const img = '<img src="/a.jpg" alt="A" srcset="/a.jpg 300w" sizes="auto">';

    expect(edit(img).getHTML()).toBe(img);
  });

  test('offers each source ahead of the img, at the sizes the img is drawn', () => {
    const editor = edit('');
    editor.commands.setImage({
      src: '/a.jpg',
      sizes: 'auto',
      sources: [
        { type: 'image/avif', srcset: '/a.avif 300w' },
        { type: 'image/jxl', srcset: '/a.jxl 300w' }
      ]
    });

    expect(editor.getHTML()).toContain(
      '<picture><source type="image/avif" srcset="/a.avif 300w" sizes="auto">' +
        '<source type="image/jxl" srcset="/a.jxl 300w" sizes="auto">' +
        '<img src="/a.jpg" sizes="auto"></picture>'
    );
  });
});
