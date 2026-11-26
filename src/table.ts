import {
  findParentNode,
  mergeAttributes,
  type CommandProps
} from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import {
  Table as TiptapTable,
  type TableOptions as TiptapTableOptions
} from '@tiptap/extension-table';

export interface TableOptions extends TiptapTableOptions {
  /**
   * What a screen reader calls the region a table too wide for the page
   * scrolls in, which a keyboard can then reach, where the table has no
   * caption to call it by. Without one, the table scrolls in a plain box.
   */
  region: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableCaption: {
      /**
       * Captions the table the selection is in. A caption of spaces alone
       * takes its caption off.
       */
      setTableCaption: (caption: string) => ReturnType;
      unsetTableCaption: () => ReturnType;
    };
  }
}

/**
 * Tiptap's table, written inside a box it scrolls in when it is too wide for
 * the page, and without the column widths Tiptap gives every table. The
 * editor draws its own copy without the region's tab stop: inside the editable
 * area, one would take the focus from the editor whenever a cell is clicked.
 *
 * A table's caption is a line of plain text the table holds, set by a command
 * rather than typed in place: ProseMirror's tables read every child of a table
 * as a row. It is written first in the table, and names the region.
 */
export const Table = TiptapTable.extend<TableOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      HTMLAttributes: { class: 'tiptap-table' },
      region: null
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: null,
        parseHTML: (element) =>
          captionText(
            Array.from(element.children).find(
              (child) => child.localName === 'caption'
            )?.textContent
          ),
        rendered: false
      }
    };
  },

  // A caption is read as the table's, and read as content would make a row.
  parseHTML() {
    return [...(this.parent?.() ?? []), { tag: 'caption', ignore: true }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const caption = node.attrs['caption'] as string | null;
    const { region } = this.options;
    const box = region
      ? { role: 'region', tabindex: '0', 'aria-label': caption ?? region }
      : {};

    return [
      'div',
      { class: 'table-responsive', ...box },
      [
        'table',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
        ...(caption ? [['caption', caption]] : []),
        ['tbody', 0]
      ]
    ] satisfies DOMOutputSpec;
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
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

      const caption = node.attrs['caption'] as string | null;
      if (caption) {
        const element = table.appendChild(document.createElement('caption'));
        element.textContent = caption;
        element.setAttribute('contenteditable', 'false');
      }

      const contentDOM = table.appendChild(document.createElement('tbody'));
      return { dom, contentDOM };
    };
  },

  addCommands() {
    const caption =
      (text: string | null) =>
      ({ tr, dispatch }: CommandProps) => {
        const table = findParentNode((node) => node.type === this.type)(
          tr.selection
        );

        if (!table) {
          return false;
        }

        if (dispatch) {
          tr.setNodeMarkup(table.pos, undefined, {
            ...table.node.attrs,
            caption: text
          });
        }

        return true;
      };

    return {
      ...this.parent?.(),
      setTableCaption: (text) => caption(captionText(text)),
      unsetTableCaption: () => caption(null)
    };
  }
});

// A caption as a table holds it: each run of spaces and line breaks one
// space, none at either end, and spaces alone no caption.
function captionText(text: string | null | undefined) {
  return text?.replace(/\s+/g, ' ').trim() || null;
}
