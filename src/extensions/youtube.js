import { Extension } from '@tiptap/core';

export const Youtube = Extension.create({
  name: 'youtube',

  addCommands() {
    return {
      setYoutubeLink:
        (attrs) =>
        ({ commands }) => {
          let cAttrs = {
            src: attrs.src.replace('watch?v=', 'embed/'),
            style: 'width: 100%; aspect-ratio: 1200 / 660; border: 0;',
            allow: 'autoplay',
            allowfullscreen: 'true'
          };

          return commands.insertContent({
            type: 'iframe',
            attrs: { ...attrs, ...cAttrs }
          });
        }
    };
  }
});
