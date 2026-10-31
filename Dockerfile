FROM node:26-slim AS build
WORKDIR /app
RUN npm install -g corepack@0.36.0 && corepack enable
COPY . .
RUN CI=true pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@ediocracy/guide

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/guide/dist /usr/share/nginx/html
