import { describe, expect, test } from 'vitest';
import { video } from '../src/samples.js';
import { edit } from './support/edit.js';

const ATTACK = '<img src=x onerror="alert(1)">';

describe('youtube', () => {
  test('reads a video back and writes it out as it came', () => {
    expect(edit(video).getHTML()).toBe(video);
  });

  test('writes a video it inserts with its title, and nothing a body drops', () => {
    const editor = edit('');
    editor.commands.setYoutubeVideo({
      src: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      title: 'A talk'
    });

    const frame = new DOMParser()
      .parseFromString(editor.getHTML(), 'text/html')
      .querySelector('div[data-youtube-video] > iframe');
    expect(frame?.getAttribute('title')).toBe('A talk');
    expect(frame?.getAttributeNames().sort()).toEqual([
      'allowfullscreen',
      'height',
      'src',
      'title',
      'width'
    ]);
  });

  test('draws a video in the editor as its thumbnail, named by its title', () => {
    const view = edit(video).view.dom;

    expect(view.querySelector('iframe')).toBeNull();
    const thumbnail = view.querySelector('[data-youtube-video] img');
    expect(thumbnail?.getAttribute('src')).toBe(
      'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg'
    );
    expect(thumbnail?.getAttribute('alt')).toBe('A talk');
  });

  test('draws a title holding markup as its text', () => {
    const escaped = ATTACK.replaceAll('<', '&lt;').replaceAll('"', '&quot;');
    const view = edit(video.replace('A talk', escaped)).view.dom;

    expect(view.querySelectorAll('img')).toHaveLength(1);
    expect(view.querySelector('img')?.getAttribute('alt')).toBe(ATTACK);
  });

  test("reads 1.x's frame as a video, its title kept", () => {
    const html = edit(
      '<p><iframe src="https://www.youtube.com/embed/M7lc1UVf-VE" title="A talk" ' +
        'style="width: 100%; aspect-ratio: 1200 / 660; border: 0;" loading="lazy" ' +
        'allow="autoplay" allowfullscreen="true"></iframe></p>'
    ).getHTML();

    expect(html).toContain(
      '<div data-youtube-video=""><iframe width="640" height="480" allowfullscreen="true" ' +
        'src="https://www.youtube.com/embed/M7lc1UVf-VE?rel=1" title="A talk"></iframe></div>'
    );
  });

  test('reads a frame from anywhere else as nothing', () => {
    const html = edit(
      '<p>a</p><iframe src="https://evil.example/embed/x"></iframe>'
    ).getHTML();

    expect(html).toBe('<p>a</p>');
  });
});
