import { describe, expect, test } from 'vitest';
import { picture } from '../src/samples.js';
import { TiptapEssentials } from '../src/tiptap-essentials.js';
import { edit } from './support/edit.js';

const OWN = 'https://static.example/a.jpg';
const ELSEWHERE = 'https://evil.example/a.jpg';

describe('image', () => {
  test('reads a picture back and writes it out as it came', () => {
    expect(edit(picture).getHTML()).toBe(picture);
  });

  test('writes an image without sources as a bare img', () => {
    const img = `<img src="${OWN}" alt="A" srcset="${OWN} 300w" sizes="auto">`;

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

  test('reads an image only where every address it is fetched from is on the host', () => {
    const read = (image: string) => edit(`<p>a</p>${image}`).getHTML();

    expect(read(`<img src="${ELSEWHERE}">`)).toBe('<p>a</p>');
    expect(
      read(`<img src="https://static.example.evil.example/a.jpg">`)
    ).toBe('<p>a</p>');
    expect(
      read(`<img src="${OWN}" srcset="${OWN} 300w, ${ELSEWHERE} 600w">`)
    ).toBe('<p>a</p>');
    expect(
      read(
        `<picture><source type="image/jxl" srcset="${ELSEWHERE} 300w">` +
          `<img src="${OWN}"></picture>`
      )
    ).toBe('<p>a</p>');
  });

  test('keeps every address where it is handed no host', () => {
    const img = `<img src="${ELSEWHERE}">`;

    expect(edit(img, TiptapEssentials.configure({})).getHTML()).toBe(img);
  });

  test('tells how many images a paste lost', () => {
    const refused: number[] = [];
    const editor = edit(
      '<p>a</p>',
      TiptapEssentials.configure({
        image: {
          host: 'https://static.example',
          onImagesRefused: (count) => refused.push(count)
        }
      })
    );

    editor.view.pasteHTML(
      `<img src="${ELSEWHERE}"><img src="${OWN}"><img src="${ELSEWHERE}">`
    );

    expect(refused).toEqual([2]);
    expect(editor.getHTML()).toContain(`<img src="${OWN}">`);
    expect(editor.getHTML()).not.toContain(ELSEWHERE);
  });
});
