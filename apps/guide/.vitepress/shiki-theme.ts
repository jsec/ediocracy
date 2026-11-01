export const shikiTheme = {
  name: 'ediocracy',
  type: 'dark' as const,
  colors: {
    'editor.background': '#050505',
    'editor.foreground': '#fafafa',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#6e6e6e' } },
    { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: '#8a8a8a' } },
    { scope: ['keyword', 'storage', 'keyword.operator.new', 'keyword.operator.expression'], settings: { foreground: '#ff8fab' } },
    { scope: ['string', 'punctuation.definition.string', 'punctuation.definition.template-expression'], settings: { foreground: '#b6f36b' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#5cc8ff' } },
    { scope: ['constant.numeric'], settings: { foreground: '#7df9c8' } },
  ],
};
