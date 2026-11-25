import type { ChainedCommands } from '@tiptap/core';
import type { MarkType } from '@tiptap/pm/model';

/**
 * The group of the marks that shift text off its baseline, subscript and
 * superscript. Each of them excludes the group, so text is lowered or raised
 * but never both: setting one takes the other off.
 */
export const BASELINE_SHIFT = 'baselineShift';

/**
 * Takes every other shift off the text, in a chain, ahead of setting `type`.
 * ProseMirror would take them off as `type` went on, but Tiptap's `setMark`
 * and `toggleMark` would answer that they had done nothing, which leaves
 * their key to the browser: on a Mac, Cmd+, would open its settings as well.
 */
export function unsetOtherShifts(chain: ChainedCommands, type: MarkType) {
  for (const other of Object.values(type.schema.marks)) {
    if (other !== type && type.excludes(other)) {
      chain.unsetMark(other);
    }
  }

  return chain;
}
