import { mergeAttributes } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import {
  Table as TiptapTable,
  type TableOptions as TiptapTableOptions
} from '@tiptap/extension-table';

export interface TableOptions extends TiptapTableOptions {
  /**
   * What a screen reader calls the region a table too wide for the page
   * scrolls in, which a keyboard can then reach. Without one, the table
   * scrolls in a plain box.
   */
  region: string | null;
}

/**
 * Tiptap's table, written inside a box it scrolls in when it is too wide for
 * the page, and without the column widths Tiptap gives every table. The
 * editor draws its own copy without the region's tab stop: inside the editable
 * area, one would take the focus from the editor whenever a cell is clicked.
 */
export const Table = TiptapTable.extend<TableOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      HTMLAttributes: { class: 'tiptap-table' },
      region: null
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { region } = this.options;
    const box = region
      ? { role: 'region', tabindex: '0', 'aria-label': region }
      : {};

    return [
      'div',
      { class: 'table-responsive', ...box },
      [
        'table',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
        ['tbody', 0]
      ]
    ] satisfies DOMOutputSpec;
  },

  addNodeView() {
    return ({ HTMLAttributes }) => {
      const dom = document.createElement('div');
      dom.className = 'table-responsive';

      const table = dom.appendChild(document.createElement('table'));
      const attributes = mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes
      );
      for (const [name, value] of Object.entries(attributes)) {
        table.setAttribute(name, String(value));
      }

      const contentDOM = table.appendChild(document.createElement('tbody'));
      return { dom, contentDOM };
    };
  }
});
