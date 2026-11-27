import { describe, expect, test } from 'vitest';
import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import {
  figure,
  fullFigure,
  leftFigure,
  rightFigure,
  table,
  wideFigure
} from '../src/samples.js';
import { edit } from './support/edit.js';

const SRC = 'https://static.example/uploads/store/photo-1200.jpg';
const IMAGE = { src: SRC, alt: 'Boats', width: 1200, height: 800 };

// The cursor at the end of the first figure's caption.
function inCaption(editor: Editor) {
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'figcaption') {
      editor.commands.setTextSelection(pos + 1 + node.content.size);
      return false;
    }
    return true;
  });
  return editor;
}

function selectFigure(editor: Editor) {
  let at = -1;
  editor.state.doc.descendants((node, pos) => {
    if (at < 0 && node.type.name === 'figure') {
      at = pos;
    }
    return at < 0;
  });
  editor.view.dispatch(
    editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, at))
  );
  return editor;
}

function figureAttributes(editor: Editor) {
  let attributes: Record<string, unknown> = {};
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'figure') {
      attributes = node.attrs;
      return false;
    }
    return true;
  });
  return attributes;
}

describe('figure', () => {
  test('reads each layout back and writes it out as it came', () => {
    for (const sample of [
      figure,
      leftFigure,
      rightFigure,
      wideFigure,
      fullFigure
    ]) {
      expect(edit(sample).getHTML()).toBe(sample);
    }
  });

  test("reads another site's figure of one image, its figcaption as the caption", () => {
    const html = edit(
      `<figure class="wp-block-image"><img src="${SRC}" alt="Boats" style="width: 60%">` +
        '<figcaption>Boats at <b>dawn</b></figcaption></figure>'
    ).getHTML();

    expect(html).toBe(
      '<figure class="tiptap-figure tiptap-align-center"><img src="' +
        SRC +
        '" alt="Boats"><figcaption><span class="tiptap-figure-caption">' +
        'Boats at <strong>dawn</strong></span></figcaption></figure>'
    );
  });

  test('reads a figure of more than one image as what it holds', () => {
    const html = edit(
      `<figure><img src="${SRC}"><img src="${SRC}"><figcaption>Two</figcaption></figure>`
    ).getHTML();

    expect(html).not.toContain('<figure');
    expect(html).toContain('Two');
  });

  test('writes no figcaption for a figure with neither a caption nor a credit', () => {
    const editor = edit(wideFigure);
    selectFigure(editor).commands.unsetFigureCredit();

    expect(editor.getHTML()).not.toContain('figcaption');
  });

  test('sizes a figure at the nearest of its widths, none at its whole column', () => {
    const editor = selectFigure(edit(figure));

    editor.commands.setFigureWidth(40);
    expect(figureAttributes(editor)['width']).toBe(33);
    expect(editor.getHTML()).toContain('style="--tiptap-figure-width: 33%;"');

    editor.commands.setFigureWidth(90);
    expect(figureAttributes(editor)['width']).toBeNull();
    expect(editor.getHTML()).not.toContain('--tiptap-figure-width');
  });

  test('narrows a figure as wide as its column to half of it, set to one side', () => {
    const editor = selectFigure(edit(figure));

    editor.commands.setFigureLayout('left');
    expect(figureAttributes(editor)).toMatchObject({
      layout: 'left',
      width: 50
    });

    editor.commands.setFigureWidth(75);
    editor.commands.setFigureLayout('right');
    expect(figureAttributes(editor)).toMatchObject({
      layout: 'right',
      width: 75
    });
  });

  test('moves a figure at one side sized to its whole column to the centre', () => {
    for (const sample of [leftFigure, rightFigure]) {
      const editor = selectFigure(edit(sample));

      editor.commands.setFigureWidth(90);
      expect(figureAttributes(editor)).toMatchObject({
        layout: 'center',
        width: null
      });
    }
  });

  test('takes no width wide or full', () => {
    const editor = selectFigure(edit(leftFigure));

    editor.commands.setFigureLayout('wide');
    expect(editor.getHTML()).toContain(
      '<figure class="tiptap-figure tiptap-align-wide"><picture>'
    );
    expect(editor.commands.setFigureWidth(50)).toBe(false);
  });

  test('takes a credit off where one of spaces alone is set', () => {
    const editor = inCaption(edit(figure));

    editor.commands.setFigureCredit('  Ann   Lee ');
    expect(editor.getHTML()).toContain(
      '<span class="tiptap-figure-credit">Ann Lee</span>'
    );

    editor.commands.setFigureCredit('   ');
    expect(editor.getHTML()).not.toContain('tiptap-figure-credit');
  });

  test('describes the image by its caption where its alt is set empty', () => {
    const editor = inCaption(edit(figure));

    editor.commands.setFigureAlt('');

    expect(editor.getHTML()).toContain('alt="The harbour at dawn"');
  });

  test("swaps the image, keeping the figure's caption and layout", () => {
    const editor = inCaption(edit(leftFigure));

    editor.commands.setFigureImage({
      src: 'https://static.example/uploads/store/other.jpg',
      alt: 'Nets'
    });

    expect(editor.getHTML()).toContain(
      '<figure class="tiptap-figure tiptap-align-left" style="--tiptap-figure-width: 50%;">' +
        '<img src="https://static.example/uploads/store/other.jpg" alt="Nets">' +
        '<figcaption><span class="tiptap-figure-caption">The harbour at <em>dawn</em></span> ' +
        '<span class="tiptap-figure-credit">Jane Doe</span></figcaption></figure>'
    );
  });

  test('inserts a figure at the cursor, splitting the text there', () => {
    const editor = edit('<p>Before after</p>');
    editor.commands.setTextSelection(8);

    editor.commands.insertFigure({
      image: IMAGE,
      caption: 'Boats',
      credit: 'Jane'
    });

    expect(editor.getHTML()).toBe(
      '<p>Before </p><figure class="tiptap-figure tiptap-align-center">' +
        `<img src="${SRC}" alt="Boats" width="1200" height="800">` +
        '<figcaption><span class="tiptap-figure-caption">Boats</span> ' +
        '<span class="tiptap-figure-credit">Jane</span></figcaption></figure><p>after</p>'
    );
  });

  test('inserts a figure after the table, list or quote the cursor is in', () => {
    for (const holder of [
      table,
      '<ul><li><p>Item</p></li></ul>',
      '<blockquote><p>Quoted</p></blockquote>'
    ]) {
      const editor = edit(`${holder}<p>End</p>`);
      editor.commands.setTextSelection(5);

      editor.commands.insertFigure({ image: IMAGE });

      expect(
        editor.state.doc.content.content.map((node) => node.type.name)
      ).toEqual([editor.state.doc.child(0).type.name, 'figure', 'paragraph']);
    }
  });

  test('inserts a figure after a block selected whole, never in its place', () => {
    const editor = selectFigure(edit(`${figure}<p>End</p>`));

    editor.commands.insertFigure({ image: IMAGE });

    expect(
      editor.state.doc.content.content.map((node) => node.type.name)
    ).toEqual(['figure', 'figure', 'paragraph']);
    expect(editor.getHTML()).toContain('The harbour at dawn');
  });

  test("reads a figure in a table's cell, a list item or a quote out of it", () => {
    for (const holder of ['td', 'li', 'blockquote']) {
      const html = edit(
        `<${holder}>${wideFigure}</${holder}>`.replace(
          /^<td>(.*)<\/td>$/,
          '<table><tr><td>$1</td></tr></table>'
        )
      ).getHTML();

      expect(html).toMatch(/^<(div|ul|blockquote)[^]*<\/(div|ul|blockquote)><figure/);
    }
  });

  test('goes on to a paragraph after the figure on Enter in its caption', () => {
    const editor = inCaption(edit(`${figure}<p>End</p>`));

    editor.view.someProp('handleKeyDown', (handle) =>
      handle(editor.view, new KeyboardEvent('keydown', { key: 'Enter' }))
    );
    editor.commands.insertContent('Next');

    expect(editor.getHTML()).toBe(`${figure}<p>Next</p><p>End</p>`);
  });

  test('draws a credit as its text', () => {
    const editor = inCaption(edit(figure));

    editor.commands.setFigureCredit('<img src=x onerror="window.ran = true">');

    const credit = editor.view.dom.querySelector('.tiptap-figure-credit');
    expect(credit?.querySelector('img')).toBeNull();
    expect(credit?.textContent).toBe('<img src=x onerror="window.ran = true">');
  });

  test('marks the figure selected or holding the cursor, and an empty caption', () => {
    const editor = edit(`${fullFigure}<p>End</p>`);
    const drawn = () => editor.view.dom.querySelector('.tiptap-figure');
    editor.commands.focus('end');

    expect(drawn()?.classList.contains('tiptap-cursor-figure')).toBe(false);
    expect(
      drawn()?.querySelector('.tiptap-figure-caption-empty')
    ).not.toBeNull();

    inCaption(editor);
    expect(drawn()?.classList.contains('tiptap-cursor-figure')).toBe(true);

    editor.commands.insertContent('Boats');
    expect(drawn()?.querySelector('.tiptap-figure-caption-empty')).toBeNull();
  });
});
