FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY app ./app
COPY src ./src
COPY tsconfig.json next-env.d.ts next.config.ts ./
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/.next ./.next
USER node
CMD ["node","node_modules/next/dist/bin/next","start","-H","0.0.0.0"]
