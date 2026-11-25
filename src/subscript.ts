import { Subscript as TiptapSubscript } from '@tiptap/extension-subscript';
import { BASELINE_SHIFT, unsetOtherShifts } from './baseline-shift.js';

/**
 * Tiptap's subscript, taking superscript off the text it lowers.
 */
export const Subscript = TiptapSubscript.extend({
  group: BASELINE_SHIFT,
  excludes: BASELINE_SHIFT,

  addCommands() {
    return {
      ...this.parent!(),
      setSubscript:
        () =>
        ({ chain }) =>
          unsetOtherShifts(chain(), this.type).setMark(this.type).run(),
      toggleSubscript:
        () =>
        ({ chain }) =>
          unsetOtherShifts(chain(), this.type).toggleMark(this.type).run()
    };
  }
});
