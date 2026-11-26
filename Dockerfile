FROM node:26-slim@sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5 AS build
WORKDIR /app
RUN npm install -g corepack@0.36.0 && corepack enable
COPY . .
RUN CI=true pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@ediocracy/guide

FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/guide/dist /usr/share/nginx/html
