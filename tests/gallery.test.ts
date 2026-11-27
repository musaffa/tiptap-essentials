import { describe, expect, test } from 'vitest';
import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import type { GalleryImageAttributes } from '../src/gallery.js';
import {
  fullGallery,
  gallery,
  leftFigure,
  wideFigure,
  wideGallery
} from '../src/samples.js';
import { edit } from './support/edit.js';

const SRC = 'https://static.example/uploads/store/photo-1200.jpg';

function image(
  alt: string,
  credit: string | null = null,
  [width, height] = [1200, 800]
): GalleryImageAttributes {
  return { src: SRC, alt, width, height, credit };
}

// Where each node of a type stands, in the body's order.
function positions(editor: Editor, type: string) {
  const found: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === type) {
      found.push(pos);
    }
    return true;
  });
  return found;
}

function select(editor: Editor, type: string, index = 0) {
  editor.view.dispatch(
    editor.state.tr.setSelection(
      NodeSelection.create(editor.state.doc, positions(editor, type)[index]!)
    )
  );
  return editor;
}

function alts(editor: Editor) {
  return positions(editor, 'galleryImage').map(
    (pos) => editor.state.doc.nodeAt(pos)?.attrs['alt']
  );
}

function credit(editor: Editor) {
  return editor.view.dom.querySelector('.tiptap-figure-credit')?.textContent;
}

function inCaption(editor: Editor) {
  editor.commands.setTextSelection(positions(editor, 'figcaption')[0]! + 1);
  return editor;
}

describe('gallery', () => {
  test('reads each layout back and writes it out as it came', () => {
    for (const sample of [gallery, wideGallery, fullGallery]) {
      expect(edit(sample).getHTML()).toBe(sample);
    }
  });

  test('holds no more than ten images', () => {
    const eleven = Array.from({ length: 11 }, (_, at) => image(`${at}`));
    const editor = edit('<p>Text</p>');

    expect(editor.commands.insertGallery({ images: eleven })).toBe(false);
    expect(editor.getHTML()).toBe('<p>Text</p>');

    const growing = select(edit(gallery), 'galleryImage');
    expect(growing.commands.addGalleryImages(eleven.slice(0, 8))).toBe(false);
    expect(alts(growing)).toHaveLength(3);
    expect(growing.commands.addGalleryImages(eleven.slice(0, 7))).toBe(true);
    expect(alts(growing)).toHaveLength(10);
  });

  test("names each credit once, in its images' order, after the caption", () => {
    const editor = edit('<p>Text</p>');
    editor.commands.insertGallery({
      images: [
        image('Boats', 'Jane Doe'),
        image('Pier', 'John Roe'),
        image('Nets', ' Jane  Doe '),
        image('Quay')
      ],
      caption: 'The harbour'
    });
    expect(credit(editor)).toBe('Jane Doe; John Roe');

    select(editor, 'galleryImage', 0).commands.removeGalleryImage();
    expect(credit(editor)).toBe('John Roe; Jane Doe');

    select(editor, 'galleryImage', 0).commands.removeGalleryImage();
    expect(credit(editor)).toBe('Jane Doe');
  });

  test('moves the image selected to the place it is given', () => {
    const editor = select(edit(gallery), 'galleryImage', 1);

    editor.commands.moveGalleryImageTo(0);
    expect(alts(editor)).toEqual([
      'A lighthouse above the harbour',
      'Fishing boats moored at a pier',
      'Nets drying on the quay'
    ]);

    editor.commands.moveGalleryImageTo(2);
    expect(alts(editor)).toEqual([
      'Fishing boats moored at a pier',
      'Nets drying on the quay',
      'A lighthouse above the harbour'
    ]);
    expect(
      (editor.state.selection as NodeSelection).node.attrs['alt']
    ).toBe('A lighthouse above the harbour');

    expect(editor.commands.moveGalleryImageTo(3)).toBe(false);
  });

  test('becomes a figure of its image left, keeping its caption, layout and credit', () => {
    const column = edit('<p>Text</p>');
    column.commands.insertGallery({
      images: [image('Boats', 'Jane Doe'), image('Pier', 'John Roe')],
      caption: 'The harbour'
    });
    select(column, 'galleryImage', 0).commands.removeGalleryImage();

    expect(column.getHTML()).toContain(
      '<figure class="tiptap-figure tiptap-align-center">' +
        `<img src="${SRC}" alt="Pier" width="1200" height="800">` +
        '<figcaption><span class="tiptap-figure-caption">The harbour</span> ' +
        '<span class="tiptap-figure-credit">John Roe</span></figcaption></figure>'
    );
    expect(column.state.selection).toBeInstanceOf(NodeSelection);

    const full = select(edit(fullGallery), 'galleryImage', 1);
    full.commands.removeGalleryImage();

    expect(full.getHTML()).toMatch(
      /^<figure class="tiptap-figure tiptap-align-full"><picture>.*<\/picture>/
    );
    expect(credit(full)).toBe('Jane Doe');
  });

  test('grows a figure given images into a gallery of its image and them', () => {
    const left = edit(leftFigure);
    left.commands.focus('start');

    left.commands.addGalleryImages([image('Pier', 'John Roe'), image('Nets')]);

    expect(left.getHTML()).toMatch(/^<figure class="tiptap-gallery">/);
    expect(alts(left)).toEqual(['Fishing boats moored at a pier', 'Pier', 'Nets']);
    expect(left.getHTML()).toContain(
      '<figcaption><span class="tiptap-figure-caption">The harbour at <em>dawn</em></span> ' +
        '<span class="tiptap-figure-credit">Jane Doe; John Roe</span></figcaption>'
    );

    const wide = select(edit(wideFigure), 'figure');
    wide.commands.addGalleryImages([image('Pier')]);
    expect(wide.getHTML()).toMatch(
      /^<figure class="tiptap-gallery tiptap-align-wide">/
    );

    const crowded = select(edit(wideFigure), 'figure');
    expect(
      crowded.commands.addGalleryImages(
        Array.from({ length: 10 }, (_, at) => image(`${at}`))
      )
    ).toBe(false);
  });

  test('writes a shape past either bound at the bound', () => {
    const editor = edit('<p>Text</p>');

    editor.commands.insertGallery({
      images: [
        image('Panorama', null, [3000, 100]),
        image('Strip', null, [100, 3000])
      ]
    });

    expect(editor.getHTML()).toContain('style="--tiptap-ratio: 20;"');
    expect(editor.getHTML()).toContain('style="--tiptap-ratio: 0.05;"');
  });

  test('draws a credit as its text', () => {
    const editor = edit('<p>Text</p>');

    editor.commands.insertGallery({
      images: [
        image('Boats', '<img src=x onerror="window.ran = true">'),
        image('Pier')
      ]
    });

    const drawn = editor.view.dom.querySelector('.tiptap-figure-credit');
    expect(drawn?.querySelector('img')).toBeNull();
    expect(drawn?.textContent).toBe('<img src=x onerror="window.ran = true">');
  });

  test('deletes the gallery selected, holding the cursor, or one of whose images is', () => {
    for (const choose of [
      (editor: Editor) => select(editor, 'gallery'),
      (editor: Editor) => select(editor, 'galleryImage', 2),
      inCaption
    ]) {
      const editor = edit(`<p>Before</p>${gallery}<p>After</p>`);
      choose(editor);

      expect(editor.commands.deleteGallery()).toBe(true);
      expect(editor.getHTML()).toBe('<p>Before</p><p>After</p>');
    }
  });
});
