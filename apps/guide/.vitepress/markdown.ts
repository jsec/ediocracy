import container from 'markdown-it-container';
import type { MarkdownRenderer } from 'vitepress';

import { segmentRole } from '../src/lib/walkthrough.mjs';

type StateCore = Parameters<Parameters<MarkdownRenderer['core']['ruler']['push']>[1]>[0];
type Token = StateCore['tokens'][number];

const ASIDE_KEYWORD = /^aside\s*/;

function colorSegmentCode(state: StateCore) {
  for (const token of state.tokens) {
    for (const child of token.children ?? []) {
      const role = child.type === 'code_inline' ? segmentRole(child.content) : undefined;

      if (role) {
        child.attrJoin('class', `edi-role-${role}`);
      }
    }
  }
}

function placeNotesInMargin(state: StateCore) {
  const sections: Token[][] = [[]];

  for (const token of state.tokens) {
    if (token.type === 'heading_open' && token.tag === 'h2') {
      sections.push([]);
    }

    sections[sections.length - 1].push(token);
  }

  const htmlBlock = (content: string) => {
    const token = new state.Token('html_block', '', 0);
    token.content = content;

    return token;
  };

  const output: Token[] = [];

  for (const [index, section] of sections.entries()) {
    const headingLength = index === 0 ? 0 : 3;
    const main: Token[] = [];
    const notes: Token[] = [];
    let isInNote = false;

    for (const token of section.slice(headingLength)) {
      if (token.type === 'container_aside_open') {
        isInNote = true;
      }

      if (isInNote) {
        notes.push(token);
      } else {
        main.push(token);
      }

      if (token.type === 'container_aside_close') {
        isInNote = false;
      }
    }

    if (notes.length === 0) {
      output.push(...section);
      continue;
    }

    output.push(
      ...section.slice(0, headingLength),
      htmlBlock('<div class="edi-columns"><div class="edi-columns-main">\n'),
      ...main,
      htmlBlock('</div><div class="edi-columns-margin">\n'),
      ...notes,
      htmlBlock('</div></div>\n'),
    );
  }

  state.tokens = output;
}

export function ediocracyMarkdown(md: MarkdownRenderer) {
  md.use(container, 'aside', {
    render(tokens: Token[], index: number) {
      const token = tokens[index];

      if (token.nesting === -1) {
        return '</aside>\n';
      }

      const label = md.utils.escapeHtml(token.info.trim().replace(ASIDE_KEYWORD, ''));

      return `<aside class="edi-note"><p class="edi-note-label">${label}</p>\n`;
    },
  });

  md.core.ruler.push('segment_role_code', colorSegmentCode);
  md.core.ruler.push('margin_notes', placeNotesInMargin);
}
