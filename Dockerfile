# --- Build stage ---
# Uses tsx to run TypeScript directly — no separate compile step needed
FROM node:22-alpine AS runner

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package*.json ./

# Install only production dependencies (tsx is in "dependencies", not devDependencies)
RUN npm ci --omit=dev

# Copy only the backend files needed at runtime
COPY server.ts ./
COPY tsconfig.json ./

# Cloud Run sets PORT to 8080 by default
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Use tsx to run the TypeScript server directly
CMD ["node_modules/.bin/tsx", "server.ts"]
