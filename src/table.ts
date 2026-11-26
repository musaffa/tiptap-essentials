import {
  findParentNode,
  getStyleProperty,
  mergeAttributes,
  type CommandProps
} from '@tiptap/core';
import type { DOMOutputSpec, Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
  isInTable,
  selectedRect,
  setCellAttr
} from '@tiptap/pm/tables';
import type { Decoration } from '@tiptap/pm/view';
import {
  Table as TiptapTable,
  type TableOptions as TiptapTableOptions
} from '@tiptap/extension-table';
import { ifListed } from './listed.js';
import {
  columnShares,
  emOf,
  leastRowHeight,
  leastShares,
  movedShares,
  rowHeight,
  rowPosition,
  setShares,
  tableElement,
  tableSizing
} from './table-sizing.js';

export interface TableOptions extends TiptapTableOptions {
  /**
   * What a screen reader calls the region a table too wide for the page
   * scrolls in, which a keyboard can then reach, where the table has no
   * caption to call it by. Without one, the table scrolls in a plain box.
   */
  region: string | null;

  /**
   * The colours a cell's background may take, as a body writes them:
   * `var(--tiptap-highlight-yellow)`. Any colour where null.
   */
  cellColors: string[] | null;
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
    tableSizes: {
      /**
       * Gives the cell the cursor is in, or the cells selected, `width`
       * percent of the table's width, the column after them — before them,
       * for the last — taking the difference. A width either column cannot
       * take, narrower than its words or its padding, is set to the nearest
       * it can.
       */
      setColumnWidth: (width: number) => ReturnType;
      /**
       * Gives the row under the cursor's cell a height of `height` em. None,
       * or a height its text already fills, takes its height off.
       */
      setRowHeight: (height: number | null) => ReturnType;
    };
    cellBackground: {
      /**
       * Colours the cell the cursor is in, or every cell selected, with one of
       * the table's `cellColors`.
       */
      setCellBackground: (color: string) => ReturnType;
      unsetCellBackground: () => ReturnType;
    };
  }
}

/**
 * Tiptap's table, written inside a box it scrolls in when it is too wide for
 * the page. The editor draws its own copy without the region's tab stop:
 * inside the editable area, one would take the focus from the editor whenever
 * a cell is clicked.
 *
 * A table's caption is a line of plain text the table holds, set by a command
 * rather than typed in place: ProseMirror's tables read every child of a table
 * as a row. It is written first in the table, and names the region.
 *
 * A column's width is its share of the table's, written in the table's
 * `colgroup` as `--tiptap-column-width`, and a row's height is in em of its
 * text, written as `--tiptap-row-height`: the page's stylesheet reads both.
 * Its lines are dragged to set them (`table-sizing.ts`), and the commands
 * set them too.
 */
export const Table = TiptapTable.extend<TableOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      HTMLAttributes: { class: 'tiptap-table' },
      region: null,
      cellColors: null
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

  addGlobalAttributes() {
    return [
      {
        types: ['tableCell', 'tableHeader'],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) =>
              ifListed(
                getStyleProperty(element, 'background-color'),
                this.options.cellColors
              ),
            renderHTML: (attributes) =>
              attributes['backgroundColor']
                ? {
                    style: `background-color: ${attributes['backgroundColor']}`
                  }
                : {}
          }
        }
      },
      {
        types: ['tableRow'],
        attributes: {
          height: {
            default: null,
            parseHTML: (element) => heightOf(element),
            renderHTML: (attributes) =>
              attributes['height']
                ? { style: `--tiptap-row-height: ${attributes['height']}em` }
                : {}
          }
        }
      }
    ];
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
        [
          'colgroup',
          ...columnShares(node).map((share) => [
            'col',
            { style: `--tiptap-column-width: ${share}%;` }
          ])
        ],
        ['tbody', 0]
      ]
    ] satisfies DOMOutputSpec;
  },

  addNodeView() {
    return ({ node, HTMLAttributes, decorations }) => {
      let drawn = node;
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

      const columns = table.appendChild(document.createElement('colgroup'));
      const contentDOM = table.appendChild(document.createElement('tbody'));

      // The shares a drag draws ahead of the table's own.
      const draw = (
        shown: ProseMirrorNode,
        decorations: readonly Decoration[]
      ) => {
        const shares =
          (decorations.find((decoration) => decoration.spec['shares'])?.spec[
            'shares'
          ] as number[] | undefined) ?? columnShares(shown);

        while (columns.children.length > shares.length) {
          columns.lastElementChild!.remove();
        }
        shares.forEach((share, at) => {
          const col =
            (columns.children[at] as HTMLElement | undefined) ??
            columns.appendChild(document.createElement('col'));
          col.style.setProperty('--tiptap-column-width', `${share}%`);
        });
      };
      draw(node, decorations);

      return {
        dom,
        contentDOM,
        update: (updated, decorations) => {
          if (
            updated.type !== drawn.type ||
            updated.attrs['caption'] !== drawn.attrs['caption']
          ) {
            return false;
          }

          drawn = updated;
          draw(updated, decorations);
          return true;
        },
        // The box, the table, its caption and its columns are drawn here, and
        // what changes them, a drag's shares among it, is none of the text's.
        ignoreMutation: (mutation) =>
          mutation.type !== 'selection' &&
          !contentDOM.contains(mutation.target)
      };
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
      unsetTableCaption: () => caption(null),

      setColumnWidth:
        (width) =>
        ({ state, tr, dispatch, view }) => {
          if (!isInTable(state)) {
            return false;
          }

          const { map, table, tableStart, left, right } = selectedRect(state);
          if (map.width < 2) {
            return false;
          }

          const shares = columnShares(table);
          const last = right === map.width;
          const now = shares
            .slice(left, right)
            .reduce((total, share) => total + share, 0);
          const element = view ? tableElement(view, tableStart - 1) : null;

          if (dispatch) {
            setShares(
              tr,
              table,
              tableStart - 1,
              movedShares(
                shares,
                last ? left - 1 : right - 1,
                last ? now - width : width - now,
                element ? leastShares(element) : []
              )
            );
          }

          return true;
        },

      setRowHeight:
        (height) =>
        ({ state, tr, dispatch, view }) => {
          if (!isInTable(state)) {
            return false;
          }

          const { table, tableStart, bottom } = selectedRect(state);
          const pos = rowPosition(table, tableStart - 1, bottom - 1);
          const row = view?.nodeDOM(pos);
          const drawn = row instanceof HTMLTableRowElement && row.isConnected;
          const em = drawn ? emOf(row) : 0;
          const least = drawn && em ? leastRowHeight(row) : 0;

          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, {
              ...table.child(bottom - 1).attrs,
              height:
                height && height > 0
                  ? rowHeight(height * (em || 1), least, em || 1)
                  : null
            });
          }

          return true;
        },

      setCellBackground:
        (color) =>
        ({ state, dispatch }) =>
          ifListed(color, this.options.cellColors) !== null &&
          setCellAttr('backgroundColor', color)(state, dispatch),

      unsetCellBackground:
        () =>
        ({ state, dispatch }) =>
          setCellAttr('backgroundColor', null)(state, dispatch)
    };
  },

  // The sizing plugin goes ahead of prosemirror-tables', which starts
  // selecting cells on a press in one: a press on a line moves the line and
  // selects nothing, where the cells under a pointer dragging it would be
  // selected and let go as it crossed them.
  addProseMirrorPlugins() {
    return [
      ...(this.editor.isEditable ? [tableSizing()] : []),
      ...(this.parent?.() ?? [])
    ];
  }
});

// A caption as a table holds it: each run of spaces and line breaks one
// space, none at either end, and spaces alone no caption.
function captionText(text: string | null | undefined) {
  return text?.replace(/\s+/g, ' ').trim() || null;
}

// A row's height as a body writes it, `--tiptap-row-height: 2.5em`, in em.
function heightOf(element: HTMLElement) {
  const value = /^(\d{1,2}(?:\.\d+)?)em$/.exec(
    getStyleProperty(element, '--tiptap-row-height') ?? ''
  );
  const height = value ? Math.round(parseFloat(value[1]!) * 10) / 10 : 0;

  return height > 0 ? height : null;
}
