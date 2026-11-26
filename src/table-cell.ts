import { getStyleProperty } from '@tiptap/core';
import {
  TableCell as TiptapTableCell,
  TableHeader as TiptapTableHeader
} from '@tiptap/extension-table';

/**
 * A cell's `colwidth` holds the shares of its table's width the columns it
 * spans take, in percent, rather than the pixels prosemirror-tables has it
 * hold: prosemirror-tables keeps it in step as columns are added, deleted,
 * merged and split. The table writes the shares in its `colgroup`, where
 * they are read back from; a cell writes none of its own.
 */
const shares = {
  colwidth: {
    default: null,
    parseHTML: (element: HTMLElement) => sharesOf(element),
    rendered: false
  }
};

export const TableCell = TiptapTableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...shares };
  }
});

export const TableHeader = TiptapTableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...shares };
  }
});

// A column's share as a body writes it, `--tiptap-column-width: 25%`.
const SHARE = /^(\d{1,3}(?:\.\d+)?)%$/;

// The shares of the columns a cell spans, from its table's `col`s, or none
// where its table gives none of them.
function sharesOf(cell: HTMLElement) {
  const table = cell.closest('table');
  if (!table) {
    return null;
  }

  const columns = columnsOf(table);
  const start = startOf(cell, table);
  const span = spanOf(cell, 'colspan');
  const spanned = columns.slice(start, start + span);

  return start >= 0 && spanned.some((share) => share > 0)
    ? Array.from({ length: span }, (_, at) => spanned[at] ?? 0)
    : null;
}

// Each column's share, a `col`'s `span` counted as that many columns, and 0
// for one written without a share.
function columnsOf(table: HTMLTableElement) {
  const group = Array.from(table.children).find(
    (child) => child.localName === 'colgroup'
  );

  return Array.from(group?.children ?? []).flatMap((col) => {
    const value = getStyleProperty(col as HTMLElement, '--tiptap-column-width');
    const share = value && SHARE.test(value) ? parseFloat(value) : 0;

    return Array<number>(spanOf(col, 'span')).fill(share <= 100 ? share : 0);
  });
}

// The column a cell starts at, past the cells of rows above reaching down
// into its own.
function startOf(cell: HTMLElement, table: HTMLTableElement) {
  const taken: Set<number>[] = [];

  for (const [index, row] of rowsOf(table).entries()) {
    let column = 0;

    for (const each of cellsOf(row)) {
      while (taken[index]?.has(column)) {
        column += 1;
      }

      if (each === cell) {
        return column;
      }

      const span = spanOf(each, 'colspan');
      for (let below = 0; below < spanOf(each, 'rowspan'); below += 1) {
        const set = (taken[index + below] ??= new Set());
        for (let across = 0; across < span; across += 1) {
          set.add(column + across);
        }
      }
      column += span;
    }
  }

  return -1;
}

// A table's own rows, in its sections or in it, and none of a table inside
// one of its cells.
function rowsOf(table: HTMLTableElement) {
  return Array.from(table.children).flatMap((child) =>
    child.localName === 'tr'
      ? [child]
      : ['thead', 'tbody', 'tfoot'].includes(child.localName)
        ? Array.from(child.children).filter((row) => row.localName === 'tr')
        : []
  );
}

function cellsOf(row: Element) {
  return Array.from(row.children).filter((cell) =>
    ['td', 'th'].includes(cell.localName)
  );
}

function spanOf(element: Element, name: string) {
  const span = parseInt(element.getAttribute(name) ?? '', 10);

  return span > 0 ? span : 1;
}
