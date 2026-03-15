# --- Install stage ---
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./

# Install production deps, then remove npm's cache to drop vulnerable
# transitive packages (minimatch, tar, glob, etc.) that ship inside npm
# but are not needed at runtime.
RUN npm ci --omit=dev && \
    rm -rf /usr/local/lib/node_modules/npm

# --- Final stage ---
FROM node:22-alpine AS runner

# Upgrade all Alpine system packages to pull in security fixes (zlib, etc.)
RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy only the installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy only the backend files needed at runtime
COPY package.json ./
COPY server.ts ./
COPY tsconfig.json ./

# Cloud Run sets PORT to 8080 by default
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Use tsx to run the TypeScript server directly
CMD ["node_modules/.bin/tsx", "server.ts"]
