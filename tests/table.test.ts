import { describe, expect, test } from 'vitest';
import type { Editor } from '@tiptap/core';
import { captionedTable, styledTable, table } from '../src/samples.js';
import { TiptapEssentials } from '../src/tiptap-essentials.js';
import { edit } from './support/edit.js';

// The cursor in the first cell of the first table.
function inFirstCell(editor: Editor) {
  let at = 0;
  editor.state.doc.descendants((node, pos) => {
    if (!at && node.type.name === 'paragraph' && pos > 0) {
      const $pos = editor.state.doc.resolve(pos + 1);
      if ($pos.node(1).type.name === 'table') {
        at = pos + 1;
      }
    }
  });
  editor.commands.setTextSelection(at);
  return editor;
}

describe('table', () => {
  test('reads a table in its region back and writes it out as it came', () => {
    expect(edit(table).getHTML()).toBe(table);
  });

  test('writes a new table at even shares, and no widths in pixels', () => {
    const editor = edit('<p></p>');
    editor.commands.insertTable({ rows: 2, cols: 4, withHeaderRow: true });

    expect(shares(editor)).toEqual([25, 25, 25, 25]);
    expect(editor.getHTML()).not.toMatch(/min-width|px/);
  });

  test('draws its own copy without the region or its tab stop', () => {
    const view = edit(table).view.dom;

    expect(
      view.querySelector('div.table-responsive > table.tiptap-table')
    ).not.toBeNull();
    expect(view.querySelector('[role="region"], [tabindex="0"]:not(.ProseMirror)')).toBeNull();
  });

  test('writes a plain box where no region is named', () => {
    const html = edit(table, TiptapEssentials).getHTML();

    expect(html).toContain('<div class="table-responsive"><table');
  });

  test('reads a captioned table back and writes it out as it came', () => {
    expect(edit(captionedTable).getHTML()).toBe(captionedTable);
  });

  test("names a table's region by its caption, read with its spaces collapsed", () => {
    const spaced = captionedTable
      .replace('aria-label="Ships by port"', 'aria-label="Table"')
      .replace('<caption>Ships by port', '<caption> Ships\n  by port ');

    expect(edit(spaced).getHTML()).toBe(captionedTable);
  });

  test('captions the table the selection is in, and takes the caption off', () => {
    const editor = inFirstCell(edit(table));

    expect(editor.commands.setTableCaption('  Ships\n by port ')).toBe(true);
    expect(editor.getHTML()).toContain(captionedTable);

    editor.commands.unsetTableCaption();
    expect(editor.getHTML()).toContain(table);

    editor.commands.setTableCaption('Ships by port');
    editor.commands.setTableCaption('   ');
    expect(editor.getHTML()).toContain(table);
  });

  test('captions no table from outside one', () => {
    const editor = edit(`<p>Ports</p>${table}`);
    editor.commands.setTextSelection(1);

    expect(editor.commands.setTableCaption('Ships by port')).toBe(false);
    expect(editor.getHTML()).toContain(table);
  });

  test('draws a caption first in its table, as its text', () => {
    const view = edit(
      captionedTable.replace(
        '<caption>Ships by port',
        '<caption>&lt;img src=x onerror=alert(1)&gt;'
      )
    ).view.dom;

    expect(view.querySelector('table > caption:first-child')?.textContent).toBe(
      '<img src=x onerror=alert(1)>'
    );
    expect(view.querySelector('img')).toBeNull();
  });
});

describe('table sizes and colours', () => {
  // A table of three columns at 20%, 30% and 50%, its first cell reaching
  // into the second row and its second across two columns.
  const merged =
    '<table><colgroup><col style="--tiptap-column-width: 20%"><col style="--tiptap-column-width: 30%"><col style="--tiptap-column-width: 50%"></colgroup><tbody>' +
    '<tr><td rowspan="2"><p>A</p></td><td colspan="2"><p>B</p></td></tr>' +
    '<tr><td><p>C</p></td><td><p>D</p></td></tr>' +
    '</tbody></table>';

  test('reads a styled table back and writes it out as it came', () => {
    expect(edit(styledTable).getHTML()).toBe(styledTable);
  });

  test("reads each cell's shares from the columns it spans", () => {
    const cells: unknown[] = [];
    edit(merged).state.doc.descendants((node) => {
      if (node.type.name === 'tableCell') {
        cells.push(node.attrs['colwidth']);
      }
    });

    expect(cells).toEqual([[20], [30, 50], [30], [50]]);
  });

  test('draws its columns at their shares in the editor too', () => {
    const cols = edit(styledTable).view.dom.querySelectorAll('col');

    expect(Array.from(cols, (col) => col.getAttribute('style'))).toEqual([
      '--tiptap-column-width: 30.5%;',
      '--tiptap-column-width: 69.5%;'
    ]);
  });

  test('gives a column added an even share, the rest shrinking in proportion', () => {
    const editor = inFirstCell(edit(styledTable));
    editor.commands.addColumnAfter();

    expect(shares(editor)).toEqual([20.3, 33.3, 46.3]);
  });

  test("gives a deleted column's share to the rest in proportion", () => {
    const editor = inFirstCell(
      edit(merged.replace('rowspan="2"', '').replace('<td><p>C</p></td>', ''))
    );
    editor.commands.deleteColumn();

    expect(shares(editor)).toEqual([37.5, 62.5]);
  });

  test('reads no share given in pixels, past 100% or malformed', () => {
    // The first column then takes the even share of the rest's, 40.
    for (const width of ['120px', '101%', 'calc(50%)']) {
      const html = merged.replace(
        '--tiptap-column-width: 20%',
        `--tiptap-column-width: ${width}`
      );

      expect(shares(edit(html))).toEqual([33.3, 25, 41.7]);
    }
  });

  test("reads a row's height only in em", () => {
    const at = (height: string) =>
      edit(styledTable.replace('2.5em', height)).getHTML().includes('--tiptap-row-height');

    expect(at('3em')).toBe(true);
    expect(at('40px')).toBe(false);
    expect(at('100em')).toBe(false);
  });

  test("holds a cell's colour to the table's colours", () => {
    const html = edit(
      styledTable.replace('var(--tiptap-highlight-yellow)', 'red')
    ).getHTML();

    expect(html).not.toContain('background-color');
  });

  test('gives the cursor\'s column its width, the next column taking the difference', () => {
    const editor = inFirstCell(edit(styledTable));

    expect(editor.commands.setColumnWidth(40)).toBe(true);
    expect(shares(editor)).toEqual([40, 60]);
  });

  test('takes the difference from the column before the last', () => {
    const editor = inFirstCell(edit(styledTable));
    editor.commands.goToNextCell();
    editor.commands.setColumnWidth(80);

    expect(shares(editor)).toEqual([20, 80]);
  });

  test("sets the cursor's row's height in em, and takes it off", () => {
    const editor = inFirstCell(edit(styledTable));

    editor.commands.setRowHeight(3);
    expect(editor.getHTML()).toContain('<tr style="--tiptap-row-height: 3em;"><th>');

    editor.commands.setRowHeight(null);
    expect(editor.getHTML()).toContain('<tr><th>');
  });

  test("colours the cursor's cell with one of the table's colours, and takes it off", () => {
    const editor = inFirstCell(edit(table));

    expect(editor.commands.setCellBackground('red')).toBe(false);
    expect(editor.commands.setCellBackground('var(--tiptap-highlight-yellow)')).toBe(true);
    expect(editor.getHTML()).toContain(
      '<th style="background-color: var(--tiptap-highlight-yellow);"><p>Port'
    );

    editor.commands.unsetCellBackground();
    expect(editor.getHTML()).toContain('<th><p>Port');
  });
});

// The shares a table is written at, as numbers.
function shares(editor: Editor) {
  return Array.from(
    editor.getHTML().matchAll(/--tiptap-column-width: ([\d.]+)%/g),
    (match) => parseFloat(match[1]!)
  );
}
