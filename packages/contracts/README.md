# OpenStat Audit Anchor

`OpenStatAuditAnchor` stores privacy-preserving audit commitments for autonomous
agent runs. Raw telemetry remains off-chain.

## Local Verification

```sh
pnpm --filter @openstat/contracts compile
pnpm --filter @openstat/contracts test
```

## Mantle Sepolia Deployment

Copy `.env.example` to `.env`, provide a funded Sepolia deployer key, and run a
dry run:

```sh
pnpm --filter @openstat/contracts deploy:mantle-sepolia
```

Broadcast only after reviewing the network and deployer address:

```sh
pnpm --filter @openstat/contracts deploy:mantle-sepolia -- --confirm
```

Confirm the deployed bytecode is readable from Mantle Sepolia:

```sh
pnpm --filter @openstat/contracts verify:mantle-sepolia -- 0x...
```
