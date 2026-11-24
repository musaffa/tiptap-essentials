import type { DOMOutputSpec } from '@tiptap/pm/model';
import TiptapYoutube from '@tiptap/extension-youtube';

// What a body keeps of a video's frame: Tiptap writes a dozen more, each of
// them in its address as well.
const KEPT = ['src', 'title', 'width', 'height', 'allowfullscreen'];

const VIDEO_ID =
  /(?:[?&]v=|\/embed\/|youtu\.be\/|\/shorts\/|\/live\/)([\w-]{11})/;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    titledYoutube: {
      /** Inserts a video, named by its title. */
      setYoutubeVideo: (options: {
        src: string;
        title: string;
        start?: number;
        width?: number | string;
        height?: number | string;
      }) => ReturnType;
    };
  }
}

/**
 * Tiptap's YouTube video, named by a title, which a page names its thumbnail
 * and its player by. The editor draws it as its thumbnail: drawing the player
 * would load YouTube's for every video as the editor opens. Read as well from
 * the frame 1.x wrote, a bare `<iframe>` of a YouTube address.
 */
export const Youtube = TiptapYoutube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: { default: null }
    };
  },

  parseHTML() {
    return [
      ...(this.parent?.() ?? []),
      {
        tag: 'iframe[src]',
        getAttrs: (element) =>
          element
            .getAttribute('src')
            ?.startsWith('https://www.youtube.com/embed/')
            ? null
            : false
      }
    ];
  },

  renderHTML(props) {
    const [tag, box, [, frame]] = this.parent!(props) as [
      string,
      Record<string, unknown>,
      [string, Record<string, unknown>]
    ];
    const kept = Object.fromEntries(
      Object.entries(frame).filter(([name]) => KEPT.includes(name))
    );

    return [tag, box, ['iframe', kept]] satisfies DOMOutputSpec;
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.setAttribute('data-youtube-video', '');

      const thumbnail = dom.appendChild(document.createElement('img'));
      const id = VIDEO_ID.exec(String(node.attrs['src'] ?? ''))?.[1];
      if (id) {
        thumbnail.setAttribute('src', `https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
      }
      thumbnail.setAttribute('alt', String(node.attrs['title'] ?? ''));

      return { dom };
    };
  }
});
