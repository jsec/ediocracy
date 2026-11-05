import { MarkdownPageEvent } from 'typedoc-plugin-markdown';

const OBJECT_SIGNATURE = /^> \*\*.*= `object`\n\n/m;

/**
 * Removes the `= object` signature line from type alias pages.
 *
 * @param {import('typedoc-plugin-markdown').MarkdownApplication} app - The TypeDoc application.
 */
export function load(app) {
  app.renderer.on(MarkdownPageEvent.END, (page) => {
    page.contents = page.contents?.replace(OBJECT_SIGNATURE, '');
  });
}
