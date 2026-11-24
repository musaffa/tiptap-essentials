import { describe, expect, test } from 'vitest';
import { table } from '../src/samples.js';
import { TiptapEssentials } from '../src/tiptap-essentials.js';
import { edit } from './support/edit.js';

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
});
