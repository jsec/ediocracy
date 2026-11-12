FROM node:26-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS build
WORKDIR /app
RUN npm install -g corepack@0.36.0 && corepack enable
COPY . .
RUN CI=true pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@ediocracy/guide

FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/guide/dist /usr/share/nginx/html
