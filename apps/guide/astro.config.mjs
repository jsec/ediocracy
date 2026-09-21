import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import catppuccin from '@catppuccin/starlight';

export default defineConfig({
  site: 'https://ediocracy.jsec.app',
  integrations: [
    starlight({
      title: 'X12 271 response guide',
      description:
        'A source-backed introduction to X12 271 eligibility responses for readers who understand the insurance eligibility check process but do not know the X12 data format.',
      customCss: ['./src/styles/custom.css'],
      plugins: [catppuccin()],
      sidebar: [
        {
          label: 'Start here',
          items: [
            '',
            'introduction/what-is-a-271',
            'introduction/eligibility-workflow',
            'introduction/how-to-use-this-guide',
          ],
        },
        {
          label: 'Message structure',
          items: [
            'structure/x12-syntax',
            'structure/envelopes',
            'structure/transaction-context',
            'structure/party-hierarchy',
            'structure/eligibility-benefits',
          ],
        },
        {
          label: 'Read complete examples',
          items: [
            'examples/single-eb',
            'examples/medicare-secondary-payer',
            'examples/medicare-primary-commercial-secondary',
            'examples/medicare-advantage',
            'examples/multiple-interchanges',
          ],
        },
        {
          label: 'Understand standards and profiles',
          items: [
            'standards/public-x12-sources',
            'standards/stedi',
            'standards/unitedhealthcare',
          ],
        },
        {
          label: 'Reference',
          items: [
            'reference/examples',
            'reference/segments',
            'reference/terminology',
            'reference/sources',
          ],
        },
      ],
    }),
  ],
});
