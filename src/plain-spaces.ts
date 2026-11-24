import { Extension } from '@tiptap/core';
import { Fragment, Slice, type Node } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const NO_BREAK_SPACE = '\u{a0}';

/**
 * Pasted text with its no-break spaces read as plain ones. A page copied from
 * holds them wherever its layout wanted words kept together, which in a body
 * would stop its lines breaking where the reader's window needs them to.
 */
export const PlainSpaces = Extension.create({
  name: 'plainSpaces',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('plainSpaces'),
        props: {
          transformPasted: (slice) =>
            new Slice(plain(slice.content), slice.openStart, slice.openEnd)
        }
      })
    ];
  }
});

function plain(fragment: Fragment): Fragment {
  const nodes: Node[] = [];

  fragment.forEach((node) => {
    if (node.isText) {
      const text = node.text?.replaceAll(NO_BREAK_SPACE, ' ') ?? '';
      nodes.push(node.type.schema.text(text, node.marks));
    } else {
      nodes.push(node.copy(plain(node.content)));
    }
  });

  return Fragment.fromArray(nodes);
}
