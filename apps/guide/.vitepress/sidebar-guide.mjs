// @ts-check

/** @type {import('vitepress').DefaultTheme.SidebarItem[]} */
export const guideSidebar = [
  {
    text: 'Start here',
    items: [
      { text: 'Overview', link: '/guide/' },
      { text: 'What a 271 response is', link: '/guide/introduction/what-is-a-271' },
      { text: 'How eligibility responses fit the workflow', link: '/guide/introduction/eligibility-workflow' },
      { text: 'How to use this guide', link: '/guide/introduction/how-to-use-this-guide' },
    ],
  },
  {
    text: 'Message structure',
    items: [
      { text: 'X12 syntax in a 271', link: '/guide/structure/x12-syntax' },
      { text: 'Interchanges, groups, and transactions', link: '/guide/structure/envelopes' },
      { text: 'Transaction context', link: '/guide/structure/transaction-context' },
      { text: 'Party hierarchy', link: '/guide/structure/party-hierarchy' },
      { text: 'Eligibility and benefit statements', link: '/guide/structure/eligibility-benefits' },
    ],
  },
  {
    text: 'Read complete examples',
    items: [
      { text: 'Single benefit statement', link: '/guide/examples/single-eb' },
      { text: 'Medicare Secondary Payer context', link: '/guide/examples/medicare-secondary-payer' },
      { text: 'Medicare primary and commercial secondary context', link: '/guide/examples/medicare-primary-commercial-secondary' },
      { text: 'Medicare Advantage context', link: '/guide/examples/medicare-advantage' },
      { text: 'Multiple interchanges in one payload', link: '/guide/examples/multiple-interchanges' },
    ],
  },
  {
    text: 'Standards and local rules',
    items: [
      { text: 'Public X12 sources', link: '/guide/standards/public-x12-sources' },
      { text: 'Clearinghouses and companion guides', link: '/guide/standards/clearinghouses-and-companion-guides' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Example index', link: '/guide/reference/examples' },
      { text: 'Segment and field index', link: '/guide/reference/segments' },
      { text: 'X12 and eligibility terminology', link: '/guide/reference/terminology' },
      { text: 'Sources', link: '/guide/reference/sources' },
    ],
  },
];
