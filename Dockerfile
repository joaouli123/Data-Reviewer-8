FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy all source files needed for build
COPY index.html ./
COPY src ./src
COPY shared ./shared
COPY server ./server
COPY public ./public
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY tsconfig.json ./
COPY components.json ./

# Build frontend
RUN npx vite build

# Build server using prod.ts (no vite dependency)
RUN npx esbuild server/prod.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/index.js \
  --format=esm \
  --external:bcryptjs \
  --external:pg \
  --external:@neondatabase/serverless \
  --external:ws \
  --packages=external

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Required for pg_dump backups
RUN apk add --no-cache postgresql-client

# Copy built files
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 5000

CMD node dist/index.js
