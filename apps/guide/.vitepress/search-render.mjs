// @ts-check

/**
 * Renders a page for the local search index. Layout.vue shows the frontmatter title as the H1,
 * outside the Markdown, so this adds it back for search. `md.render` fills `env.frontmatter`.
 *
 * @param {string} src
 * @param {{ frontmatter?: { title?: string } }} env
 * @param {{ render(src: string, env?: object): string }} md
 * @returns {string}
 */
export function renderForSearch(src, env, md) {
  const html = md.render(src, env);
  if (env.frontmatter?.title) {
    return md.render(`# ${env.frontmatter.title}`) + html;
  }
  return html;
}
