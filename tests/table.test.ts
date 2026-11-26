import { describe, expect, test } from 'vitest';
import type { Editor } from '@tiptap/core';
import { captionedTable, table } from '../src/samples.js';
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

  test('writes a new table without column widths', () => {
    const editor = edit('<p></p>');
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });

    const html = editor.getHTML();
    expect(html).not.toContain('colgroup');
    expect(html).not.toContain('min-width');
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
