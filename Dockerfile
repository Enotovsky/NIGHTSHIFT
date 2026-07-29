# syntax=docker/dockerfile:1

# ---- Stage 1: build ----
# vinext build needs devDependencies (vite, rolldown, etc.), so we build in a
# full image and copy only what the production Node server needs into the runner.
FROM node:22-slim AS builder
WORKDIR /app

# Install dependencies against the locked manifest first (better layer caching).
COPY package.json package-lock.json ./
RUN npm ci

# Build the site (produces dist/: Node prod server + client assets).
COPY . .
RUN npx vinext build

# ---- Stage 2: runtime ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Port the Node server listens on *inside* the container. Keep this fixed;
# the host-side port is chosen in docker-compose.yml via ${APP_PORT}.
ENV PORT=3000

# vinext is a devDependency but `vinext start` runs a plain Node HTTP server at
# runtime, so we ship the resolved node_modules from the builder as-is.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Runs `vinext start` -> plain node:http server on 0.0.0.0:$PORT (no Cloudflare
# / workerd runtime required).
CMD ["npx", "vinext", "start"]
