# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app

# better-sqlite3 ships a binding.gyp, and npm compiles any package carrying one
# unless that package defines its own install script. That compile needs Python
# and a C++ toolchain. Only the build stages get them; the runtime image below
# starts from a clean base and just copies the finished binary across.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --no-audit --no-fund

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Reuse the resolved tree from the build stage (the native binary is already in
# place for this platform), then drop everything only the build needed.
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY --from=build /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm cache clean --force

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

# SQLite lives here. Attach a persistent volume at this path so records survive
# a redeploy. Declaring VOLUME in the Dockerfile is deliberately left out:
# Railway rejects it, and Docker/Render/Fly all mount at run time anyway.
RUN mkdir -p /app/server/data && chown -R node:node /app/server/data

# su-exec lets the entrypoint start as root, hand the mounted volume to the
# node user, and then drop privileges before running the server.
RUN apk add --no-cache su-exec
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV PORT=8787
ENV DATABASE_FILE=/app/server/data/genlayer-typerace.db
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/dist/index.js"]
