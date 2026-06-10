FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter openstat build
RUN pnpm --filter deepbook-agent build

CMD ["pnpm", "--filter", "deepbook-agent", "claim-loop"]
