import myConfig from '@jarsec/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['dist/']),
    {
        extends: [myConfig],
    },
    {
        rules: {
            'unicorn/consistent-class-member-order': 'off',
            'unicorn/no-break-in-nested-loop': 'off',
            'unicorn/single-line-block-comment-style': 'off',
        },
    },
    {
        files: ['package.json'],
        rules: {
            'package-json/dependency-version-range': 'off',
        },
    },
]);
