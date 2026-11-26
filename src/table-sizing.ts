import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction
} from '@tiptap/pm/state';
import { CellSelection, TableMap } from '@tiptap/pm/tables';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

/**
 * A table's lines, picked and dragged to size its columns and its rows. A
 * press within `REACH` of the line after a column, or of the line under a
 * row, picks it, and a drag in the same press moves it: the columns either
 * side trade their shares of the table's width, and the row takes a height in
 * em of its text. A press where the two meet picks both. A column stops at
 * the least its words and padding take, and a row at its text, where it keeps
 * no height of its own. The table's left, right and top edges are no lines.
 *
 * The classes it gives, which the page's stylesheet draws, are
 * `tiptap-cursor-cell` on the cell the cursor is in; `tiptap-handle-right`
 * and `tiptap-handle-bottom` on the cells along a picked line, and a
 * `tiptap-handle-dot` where two picked lines meet; and
 * `tiptap-over-column-line` and `tiptap-over-row-line` on the editor while
 * the pointer is over a line.
 */

// How near a line, either side of it, a press picks it.
const REACH = 4;

// How far a press moves before it is a drag rather than a click.
const SLOP = 3;

// The highest a row's height goes, in em, as a body writes it: two digits.
const HIGHEST = 99.9;

/**
 * Lines of the table at `table` picked by a press: the line after the column
 * `column` and the line under the row `row`, either none. `columns` and
 * `rows` are the table's size as they were picked, beyond which a change to
 * the table lets them go.
 */
interface Lines {
  table: number;
  columns: number;
  rows: number;
  column: number | null;
  row: number | null;
}

// What a drag draws before it is written: the table's shares, and the row's
// height in em, none where it fits its text.
interface Drawn {
  shares?: number[];
  height?: number | null;
}

interface SizingState {
  over: { column: boolean; row: boolean } | null;
  picked: Lines | null;
  drawn: Drawn | null;
}

export const tableSizingKey = new PluginKey<SizingState>('tableSizing');

// A drag in progress in an editor, which Escape cancels.
const drags = new WeakMap<EditorView, { cancel: () => void }>();

export function tableSizing() {
  return new Plugin<SizingState>({
    key: tableSizingKey,

    state: {
      init: () => ({ over: null, picked: null, drawn: null }),
      apply(tr, value, _, state) {
        const meta = tr.getMeta(tableSizingKey) as
          | Partial<SizingState>
          | undefined;
        const next = meta ? { ...value, ...meta } : value;

        return tr.docChanged && next.picked
          ? { ...next, picked: mapped(next.picked, tr, state.doc) }
          : next;
      }
    },

    props: {
      attributes(state): Record<string, string> {
        const over = tableSizingKey.getState(state)?.over;
        const classes = [
          over?.column ? 'tiptap-over-column-line' : '',
          over?.row ? 'tiptap-over-row-line' : ''
        ].filter(Boolean);

        return classes.length ? { class: classes.join(' ') } : {};
      },

      decorations: (state) => decorationsOf(state),

      handleKeyDown(view, event) {
        if (event.key !== 'Escape') {
          return false;
        }

        const drag = drags.get(view);
        if (drag) {
          drag.cancel();
          return true;
        }

        if (tableSizingKey.getState(view.state)?.picked) {
          view.dispatch(view.state.tr.setMeta(tableSizingKey, { picked: null }));
          return true;
        }

        return false;
      },

      handleDOMEvents: {
        mousemove(view, event) {
          if (!drags.has(view)) {
            hover(view, linesAt(view, event));
          }
          return false;
        },

        mouseleave(view) {
          if (!drags.has(view)) {
            hover(view, null);
          }
          return false;
        },

        mousedown: (view, event) => press(view, event)
      }
    },

    view: (view) => ({ destroy: () => drags.get(view)?.cancel() })
  });
}

/**
 * The share of a table's width each of its columns is drawn at, in percent
 * at one decimal: what its cells give, and to a column none of them gives a
 * width, the even share of the rest's. A table no line has moved has even
 * shares.
 */
export function columnShares(table: ProseMirrorNode) {
  const map = TableMap.get(table);
  const given = Array.from({ length: map.width }, (_, column) => {
    for (let row = 0; row < map.height; row += 1) {
      const pos = map.map[row * map.width + column]!;
      const share = (table.nodeAt(pos)?.attrs['colwidth'] as number[] | null)?.[
        column - map.colCount(pos)
      ];

      if (share) {
        return share;
      }
    }
    return null;
  });
  const known = given.filter((share) => share !== null);
  const even = known.length ? sum(known) / known.length : 1;
  const weights = given.map((share) => share ?? even);
  const total = sum(weights);

  return weights.map((weight) => tenth((weight / total) * 100));
}

/**
 * The shares once the line after the column `line` moves by `by`, the
 * columns either side trading what it moves, neither under its least; as
 * they were where the two need more than they have between them.
 */
export function movedShares(
  shares: number[],
  line: number,
  by: number,
  least: number[]
) {
  const total = shares[line]! + shares[line + 1]!;
  const low = Math.ceil((least[line] ?? 0) * 10) / 10;
  const high = Math.floor((total - (least[line + 1] ?? 0)) * 10) / 10;

  if (low > high) {
    return shares;
  }

  const left = Math.min(high, Math.max(low, tenth(shares[line]! + by)));

  return shares.map((share, at) =>
    at === line ? left : at === line + 1 ? tenth(total - left) : share
  );
}

// Gives every cell of the table at `tablePos` the shares of the columns it
// spans.
export function setShares(
  tr: Transaction,
  table: ProseMirrorNode,
  tablePos: number,
  shares: number[]
) {
  const map = TableMap.get(table);

  for (const pos of new Set(map.map)) {
    const cell = table.nodeAt(pos)!;
    const start = map.colCount(pos);

    tr.setNodeMarkup(tr.mapping.map(tablePos + 1 + pos), undefined, {
      ...cell.attrs,
      colwidth: shares.slice(start, start + (cell.attrs['colspan'] as number))
    });
  }

  return tr;
}

/**
 * The least share of its width each column of a drawn table can take: the
 * table drawn as narrow as its words and padding let it, and put back before
 * the page is painted.
 */
export function leastShares(table: HTMLTableElement) {
  const width = table.getBoundingClientRect().width;
  if (!width) {
    return [];
  }

  const before = table.style.width;
  table.style.width = '0px';
  const least = Array.from(
    table.querySelectorAll(':scope > colgroup > col'),
    (col) => (col.getBoundingClientRect().width / width) * 100
  );
  table.style.width = before;

  return least;
}

/**
 * The least height a drawn row can take on the screen: its tallest cell's
 * blocks with the cell's padding, and half the border under it, which a
 * collapsed border gives each side. A cell reaching into rows below is left
 * out.
 */
export function leastRowHeight(row: HTMLTableRowElement) {
  const top = row.getBoundingClientRect().top;
  const scale = scaleOf(row);
  let least = 0;

  for (const cell of Array.from(row.cells)) {
    if (cell.rowSpan !== 1) {
      continue;
    }

    const style = getComputedStyle(cell);
    const blocks = Array.from(cell.children).filter(
      (child) => getComputedStyle(child).position !== 'absolute'
    );
    const last = blocks.at(-1);
    const bottom = last
      ? last.getBoundingClientRect().bottom +
        parseFloat(getComputedStyle(last).marginBottom)
      : cell.getBoundingClientRect().top + parseFloat(style.paddingTop);

    least = Math.max(
      least,
      bottom -
        top +
        (parseFloat(style.paddingBottom) +
          parseFloat(style.borderBottomWidth) / 2) *
          scale
    );
  }

  return least;
}

/**
 * A row's height in em once drawn `height` pixels tall on the screen, in
 * text `em` pixels high there: none where its text already fills that, and
 * at most the highest a body writes.
 */
export function rowHeight(height: number, least: number, em: number) {
  return height <= least + 0.5 ? null : Math.min(tenth(height / em), HIGHEST);
}

/**
 * How many pixels of the screen an element's own pixel takes, which a
 * transform on a box around it changes: the screen's pixels are what a
 * pointer moves by, and its own what its styles are written in.
 */
export function scaleOf(element: HTMLElement) {
  return element.offsetHeight
    ? element.getBoundingClientRect().height / element.offsetHeight
    : 1;
}

// The height of the text in a row, in the screen's pixels.
export function emOf(row: HTMLTableRowElement) {
  return parseFloat(getComputedStyle(row).fontSize) * scaleOf(row);
}

// Where the row `index` of the table at `tablePos` starts.
export function rowPosition(
  table: ProseMirrorNode,
  tablePos: number,
  index: number
) {
  let pos = tablePos + 1;
  for (let row = 0; row < index; row += 1) {
    pos += table.child(row).nodeSize;
  }
  return pos;
}

// The `table` element the editor draws for the table at `pos`, inside the
// box it scrolls in.
export function tableElement(view: EditorView, pos: number) {
  const box = view.nodeDOM(pos);

  return box instanceof HTMLElement
    ? box.querySelector<HTMLTableElement>(':scope > table')
    : null;
}

function hover(view: EditorView, lines: Lines | null) {
  const over = lines && { column: lines.column !== null, row: lines.row !== null };
  const before = tableSizingKey.getState(view.state)?.over ?? null;

  if (over?.column !== before?.column || over?.row !== before?.row) {
    view.dispatch(view.state.tr.setMeta(tableSizingKey, { over }));
  }
}

function press(view: EditorView, event: MouseEvent) {
  const modified =
    event.shiftKey || event.ctrlKey || event.metaKey || event.altKey;
  const lines =
    event.button === 0 && !modified && !drags.has(view)
      ? linesAt(view, event)
      : null;

  if (!lines) {
    if (tableSizingKey.getState(view.state)?.picked) {
      view.dispatch(view.state.tr.setMeta(tableSizingKey, { picked: null }));
    }
    return false;
  }

  event.preventDefault();
  view.focus();
  view.dispatch(view.state.tr.setMeta(tableSizingKey, { picked: lines }));
  drag(view, event, lines);

  return true;
}

// Follows the pointer until it is released, drawing the lines where it takes
// them, and writes them there as one change.
function drag(view: EditorView, start: MouseEvent, lines: Lines) {
  const table = view.state.doc.nodeAt(lines.table)!;
  const element = tableElement(view, lines.table);
  const width = element?.getBoundingClientRect().width ?? 0;
  const shares = columnShares(table);
  const least = lines.column !== null && element ? leastShares(element) : [];
  const row =
    lines.row === null
      ? null
      : (view.nodeDOM(rowPosition(table, lines.table, lines.row)) as
          | HTMLTableRowElement
          | null);
  const height = row?.getBoundingClientRect().height ?? 0;
  const leastHeight = row ? leastRowHeight(row) : 0;
  const em = row ? emOf(row) : 0;
  const window = view.dom.ownerDocument.defaultView!;
  let drawn: Drawn | null = null;

  const move = (event: MouseEvent) => {
    const x = event.clientX - start.clientX;
    const y = event.clientY - start.clientY;

    if (!drawn && Math.hypot(x, y) < SLOP) {
      return;
    }

    drawn = {
      ...(lines.column !== null &&
        width && {
          shares: movedShares(shares, lines.column, (x / width) * 100, least)
        }),
      ...(row && em && { height: rowHeight(height + y, leastHeight, em) })
    };
    view.dispatch(view.state.tr.setMeta(tableSizingKey, { drawn }));
  };

  const stop = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', release);
    drags.delete(view);
  };

  const release = () => {
    stop();
    if (drawn) {
      view.dispatch(
        written(view.state, lines, drawn).setMeta(tableSizingKey, {
          drawn: null
        })
      );
    }
  };

  const cancel = () => {
    stop();
    if (drawn) {
      view.dispatch(view.state.tr.setMeta(tableSizingKey, { drawn: null }));
    }
  };

  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', release);
  drags.set(view, { cancel });
}

function written(state: EditorState, lines: Lines, drawn: Drawn) {
  const tr = state.tr;
  const table = state.doc.nodeAt(lines.table);

  if (!table) {
    return tr;
  }

  if (drawn.shares) {
    setShares(tr, table, lines.table, drawn.shares);
  }

  if (drawn.height !== undefined && lines.row !== null) {
    tr.setNodeMarkup(
      tr.mapping.map(rowPosition(table, lines.table, lines.row)),
      undefined,
      { ...table.child(lines.row).attrs, height: drawn.height }
    );
  }

  return tr;
}

// The lines a pointer is within reach of, along the edges of the cell it is
// over: none of the table's left, right or top edges.
function linesAt(view: EditorView, event: MouseEvent): Lines | null {
  if (!view.editable || !(event.target instanceof Element)) {
    return null;
  }

  const element = event.target.closest('td, th');
  if (!element || !view.dom.contains(element)) {
    return null;
  }

  let $pos;
  try {
    $pos = view.state.doc.resolve(view.posAtDOM(element, 0));
  } catch {
    return null;
  }

  let depth = $pos.depth;
  while (depth > 0 && !isCell($pos.node(depth))) {
    depth -= 1;
  }
  if (depth < 3) {
    return null;
  }

  const tablePos = $pos.before(depth - 2);
  const table = $pos.node(depth - 2);
  const map = TableMap.get(table);
  const cell = map.findCell($pos.before(depth) - tablePos - 1);
  const box = element.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;

  const column =
    Math.abs(x - box.right) <= REACH && cell.right < map.width
      ? cell.right - 1
      : Math.abs(x - box.left) <= REACH && cell.left > 0
        ? cell.left - 1
        : null;
  const row =
    Math.abs(y - box.bottom) <= REACH
      ? cell.bottom - 1
      : Math.abs(y - box.top) <= REACH && cell.top > 0
        ? cell.top - 1
        : null;

  return column === null && row === null
    ? null
    : { table: tablePos, columns: map.width, rows: map.height, column, row };
}

// The lines picked, where the table they are in is still there and still of
// the size they were picked in.
function mapped(lines: Lines, tr: Transaction, doc: ProseMirrorNode) {
  const { pos, deleted } = tr.mapping.mapResult(lines.table, 1);
  const table = deleted ? null : doc.nodeAt(pos);

  if (table?.type.spec['tableRole'] !== 'table') {
    return null;
  }

  const map = TableMap.get(table);

  return map.width === lines.columns && map.height === lines.rows
    ? { ...lines, table: pos }
    : null;
}

function decorationsOf(state: EditorState) {
  const { picked, drawn } = tableSizingKey.getState(state)!;
  const decorations: Decoration[] = [];
  const cursor = cursorCell(state);

  if (cursor) {
    decorations.push(
      Decoration.node(cursor.from, cursor.to, { class: 'tiptap-cursor-cell' })
    );
  }

  const table = picked && state.doc.nodeAt(picked.table);
  if (!picked || !table) {
    return DecorationSet.create(state.doc, decorations);
  }

  const map = TableMap.get(table);
  const start = picked.table + 1;

  for (const pos of new Set(map.map)) {
    const cell = map.findCell(pos);
    const classes = [
      cell.right - 1 === picked.column ? 'tiptap-handle-right' : '',
      cell.bottom - 1 === picked.row ? 'tiptap-handle-bottom' : ''
    ].filter(Boolean);

    if (classes.length) {
      decorations.push(
        Decoration.node(start + pos, start + pos + table.nodeAt(pos)!.nodeSize, {
          class: classes.join(' ')
        })
      );
    }
  }

  if (picked.column !== null && picked.row !== null) {
    const dot = meeting(map, picked.column, picked.row);
    if (dot) {
      decorations.push(
        Decoration.widget(start + dot.pos + 1, () => dotElement(dot.corner), {
          side: -1,
          key: `tiptap-handle-dot-${dot.corner}`,
          ignoreSelection: true
        })
      );
    }
  }

  if (drawn?.shares) {
    decorations.push(
      Decoration.node(picked.table, picked.table + table.nodeSize, {}, {
        shares: drawn.shares
      })
    );
  }

  if (drawn && drawn.height !== undefined && picked.row !== null) {
    const pos = rowPosition(table, picked.table, picked.row);
    decorations.push(
      Decoration.node(pos, pos + table.child(picked.row).nodeSize, {
        style: `height: ${drawn.height === null ? 'auto' : `${drawn.height}em`}`
      })
    );
  }

  return DecorationSet.create(state.doc, decorations);
}

// The cell the cursor is in, the innermost where a table is in a cell, and
// none while cells are selected.
function cursorCell(state: EditorState) {
  const { selection } = state;
  if (selection instanceof CellSelection) {
    return null;
  }

  const { $head } = selection;
  for (let depth = $head.depth; depth > 0; depth -= 1) {
    if (isCell($head.node(depth))) {
      return { from: $head.before(depth), to: $head.after(depth) };
    }
  }

  return null;
}

// A cell with a corner where the line after `column` meets the line under
// `row`, and which corner: where a cell spans one of the lines, another of
// the four around the point has it.
function meeting(map: TableMap, column: number, row: number) {
  const corners = [
    { row, column, corner: 'bottom-right' },
    { row, column: column + 1, corner: 'bottom-left' },
    { row: row + 1, column, corner: 'top-right' },
    { row: row + 1, column: column + 1, corner: 'top-left' }
  ] as const;

  for (const each of corners) {
    if (each.row >= map.height || each.column >= map.width) {
      continue;
    }

    const pos = map.map[each.row * map.width + each.column]!;
    const cell = map.findCell(pos);
    const [vertical, horizontal] = each.corner.split('-');
    const atRow =
      vertical === 'bottom' ? cell.bottom - 1 === row : cell.top === row + 1;
    const atColumn =
      horizontal === 'right'
        ? cell.right - 1 === column
        : cell.left === column + 1;

    if (atRow && atColumn) {
      return { pos, corner: each.corner };
    }
  }

  return null;
}

// The dot where picked lines meet, on the corner of the cell it is drawn in.
function dotElement(corner: string) {
  const dot = document.createElement('span');
  const [vertical, horizontal] = corner.split('-') as [string, string];

  dot.className = 'tiptap-handle-dot';
  dot.contentEditable = 'false';
  dot.setAttribute('aria-hidden', 'true');
  dot.style.setProperty(vertical, '0');
  dot.style.setProperty(horizontal, '0');
  dot.style.translate = `${horizontal === 'right' ? '50%' : '-50%'} ${vertical === 'bottom' ? '50%' : '-50%'}`;

  return dot;
}

function isCell(node: ProseMirrorNode) {
  const role = node.type.spec['tableRole'];
  return role === 'cell' || role === 'header_cell';
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function tenth(value: number) {
  return Math.round(value * 10) / 10;
}
