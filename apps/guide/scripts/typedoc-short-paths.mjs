import { MemberRouter } from 'typedoc-plugin-markdown';

class ShortPathRouter extends MemberRouter {
  /**
   * @param {import('typedoc').Reflection} reflection - The reflection that gets a page or anchor.
   * @returns {string} The page path relative to the output folder, without extension.
   */
  getIdealBaseName(reflection) {
    return super.getIdealBaseName(reflection).replace(/^parser\/(?!index$)/, '');
  }
}

/**
 * Adds the `short-paths` router.
 *
 * @param {import('typedoc-plugin-markdown').MarkdownApplication} app - The TypeDoc application.
 */
export function load(app) {
  app.renderer.defineRouter('short-paths', ShortPathRouter);
}
