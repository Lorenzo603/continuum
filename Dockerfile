# Build args shared across stages
ARG NEXT_PUBLIC_ENABLE_CLERK_AUTH=true
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_Y2xlcmsuY29udGludXVtLmxvcmVuem9mdXJyZXIuY29tJA"
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL="https://continuum.lorenzofurrer.com/sign-in"
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL="https://continuum.lorenzofurrer.com/sign-up"
ARG NEXT_PUBLIC_CLERK_FORCE_REDIRECT_URL="https://continuum.lorenzofurrer.com/"

# Stage 1: Install dependencies
FROM node:25-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts && npm cache clean --force

# Stage 2: Build the application
FROM node:25-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /app

ARG NEXT_PUBLIC_ENABLE_CLERK_AUTH
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_FORCE_REDIRECT_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# PostgreSQL is the default DB for the deployed image
ENV DB_TYPE=postgres
ENV DATABASE_URL="postgresql://localhost:5432/continuum"
ENV NEXT_PUBLIC_ENABLE_CLERK_AUTH=$NEXT_PUBLIC_ENABLE_CLERK_AUTH
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_FORCE_REDIRECT_URL=$NEXT_PUBLIC_CLERK_FORCE_REDIRECT_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Production image
FROM node:25-alpine AS production
RUN apk add --no-cache libc6-compat
WORKDIR /app

ARG NEXT_PUBLIC_ENABLE_CLERK_AUTH
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_FORCE_REDIRECT_URL

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DB_TYPE=postgres
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_PUBLIC_ENABLE_CLERK_AUTH=$NEXT_PUBLIC_ENABLE_CLERK_AUTH
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_FORCE_REDIRECT_URL=$NEXT_PUBLIC_CLERK_FORCE_REDIRECT_URL
# Set via runtime environment/secret manager in production.
ENV CLERK_SECRET_KEY=""
ENV ACCESS_TOKEN_CHECK_DISABLED="false"
ENV LEGACY_AUTH_USER_ID="user_3D36THsj4Paosmf3DCk9r1huw9H"

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only what's needed to run
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
