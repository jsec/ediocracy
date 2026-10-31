FROM node:26-slim@sha256:e4db4c914bf8ad241bd24804fc25d272d89bad97e68cdc8a1414862790a02c39 AS build
WORKDIR /app
RUN npm install -g corepack@0.36.0 && corepack enable
COPY . .
RUN CI=true pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@ediocracy/guide

FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/guide/dist /usr/share/nginx/html
