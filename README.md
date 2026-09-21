# Ediocracy

Ediocracy is a pnpm and Turborepo monorepo for an X12 parser library and its
supporting X12 271 guide.

## Workspaces

- `apps/guide`: Astro Starlight documentation site.
- `packages/parser`: Private reusable parser library.

## Commands

Run commands from the repository root:

```sh
pnpm install
pnpm build
pnpm check
pnpm test
pnpm typecheck
pnpm commit
pnpm hooks:validate
```
