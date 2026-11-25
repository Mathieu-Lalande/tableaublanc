# Image unique : API REST + serveur sync WebSocket + front buildé (même origine).
# Images surchargeables (ex. miroir : --build-arg NODE_IMAGE=mirror.gcr.io/library/node:26-bookworm-slim).
# Build : image complète (python3, make, g++ inclus pour compiler better-sqlite3).
# Runtime : image slim, même distribution (glibc identique pour le binaire natif).
ARG NODE_BUILD_IMAGE=node:26-bookworm
ARG NODE_IMAGE=node:26-bookworm-slim

FROM ${NODE_BUILD_IMAGE} AS build
ENV CI=true
# corepack n'est plus livré avec Node >= 25 : pnpm est installé explicitement (version du lockfile).
ARG PNPM_VERSION=10.28.0
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
# Clé publique côté client (licence tldraw) : injectée au build, jamais commitée.
ARG VITE_TLDRAW_LICENSE_KEY=""
ENV VITE_TLDRAW_LICENSE_KEY=${VITE_TLDRAW_LICENSE_KEY}
RUN pnpm --filter @canvas/web build \
  && pnpm --filter @canvas/server build \
  && pnpm --filter @canvas/server deploy --prod --legacy /out

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5858 \
    DATA_DIR=/data \
    WEB_DIST_DIR=/app/web \
    MIGRATIONS_DIR=/app/drizzle
WORKDIR /app
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/server/dist ./dist
COPY --from=build --chown=node:node /repo/apps/server/drizzle ./drizzle
COPY --from=build --chown=node:node /repo/apps/web/dist ./web
RUN mkdir -p /data && chown node:node /data
# Utilisateur non-root fourni par l'image officielle Node.
USER node
VOLUME ["/data"]
EXPOSE 5858
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:5858/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/main.js"]
