import { describe, expect, test } from 'vitest';
import { TiptapEssentials } from '../src/tiptap-essentials.js';
import { edit } from './support/edit.js';

describe('TiptapEssentials', () => {
  test('leaves out a part whose option is false', () => {
    const names = (options: object) =>
      edit(
        '',
        TiptapEssentials.configure(options)
      ).extensionManager.extensions.map((extension) => extension.name);

    expect(names({})).toEqual(
      expect.arrayContaining([
        'youtube',
        'table',
        'fontSize',
        'highlight',
        'blockSpacing',
        'code'
      ])
    );
    expect(names({ youtube: false })).not.toContain('youtube');
    expect(names({ highlight: false })).not.toContain('highlight');
    expect(names({ blockSpacing: false })).not.toContain('blockSpacing');
    expect(names({ tableKit: { table: false } })).not.toContain('table');
    expect(names({ textStyleKit: { fontSize: false } })).not.toContain(
      'fontSize'
    );
    expect(names({ starterKit: { code: false } })).not.toContain('code');
  });
});
