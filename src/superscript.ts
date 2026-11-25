import { Superscript as TiptapSuperscript } from '@tiptap/extension-superscript';
import { BASELINE_SHIFT, unsetOtherShifts } from './baseline-shift.js';

/**
 * Tiptap's superscript, taking subscript off the text it raises.
 */
export const Superscript = TiptapSuperscript.extend({
  group: BASELINE_SHIFT,
  excludes: BASELINE_SHIFT,

  addCommands() {
    return {
      ...this.parent!(),
      setSuperscript:
        () =>
        ({ chain }) =>
          unsetOtherShifts(chain(), this.type).setMark(this.type).run(),
      toggleSuperscript:
        () =>
        ({ chain }) =>
          unsetOtherShifts(chain(), this.type).toggleMark(this.type).run()
    };
  }
});
