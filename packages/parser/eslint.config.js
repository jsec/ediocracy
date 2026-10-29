import myConfig from '@jarsec/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['dist/']),
    {
        extends: [myConfig],
    },
    {
        files: ['package.json'],
        rules: {
            'package-json/dependency-version-range': 'off',
        },
    },
]);
