import { Extension, getStyleProperty, type CommandProps } from '@tiptap/core';

export interface BlockSpacingOptions {
  /** The blocks that can be spaced apart from those around them. */
  types: string[];

  /**
   * The margin space before or after a block takes, as a body writes it:
   * `var(--space-40)`. No space is read or set where null.
   */
  space: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockSpacing: {
      /** Sets every block selected apart from the one before it. */
      addSpaceBefore: () => ReturnType;
      removeSpaceBefore: () => ReturnType;
      /** Sets every block selected apart from the one after it. */
      addSpaceAfter: () => ReturnType;
      removeSpaceAfter: () => ReturnType;
    };
  }
}

type Side = 'spaceBefore' | 'spaceAfter';

const MARGINS: Record<Side, string> = {
  spaceBefore: 'margin-top',
  spaceAfter: 'margin-bottom'
};

/**
 * Space before and after a block, as a word processor adds it: one more
 * margin above or below a paragraph or a heading, the one its `space` names.
 * A margin pasted in of any other size is read as none.
 */
export const BlockSpacing = Extension.create<BlockSpacingOptions>({
  name: 'blockSpacing',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      space: null
    };
  },

  addGlobalAttributes() {
    const { types, space } = this.options;
    const attribute = (side: Side) => ({
      default: null,
      parseHTML: (element: HTMLElement) =>
        space !== null && getStyleProperty(element, MARGINS[side]) === space
          ? space
          : null,
      renderHTML: (attributes: Record<string, unknown>) =>
        attributes[side]
          ? { style: `${MARGINS[side]}: ${attributes[side]}` }
          : {}
    });

    return [
      {
        types,
        attributes: {
          spaceBefore: attribute('spaceBefore'),
          spaceAfter: attribute('spaceAfter')
        }
      }
    ];
  },

  addCommands() {
    const set =
      (side: Side, value: string | null) =>
      () =>
      ({ commands }: CommandProps) =>
        this.options.space !== null &&
        this.options.types
          .map((type) => commands.updateAttributes(type, { [side]: value }))
          .some((response) => response);

    return {
      addSpaceBefore: set('spaceBefore', this.options.space),
      removeSpaceBefore: set('spaceBefore', null),
      addSpaceAfter: set('spaceAfter', this.options.space),
      removeSpaceAfter: set('spaceAfter', null)
    };
  }
});
