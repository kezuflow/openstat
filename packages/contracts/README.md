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

This command checks bytecode presence only. After deployment, verify the
Solidity source through the Mantle Explorer verification surface and record the
contract address, deployment transaction hash, explorer URL, compiler version,
optimizer settings, and deployment date here.

## Mantle Sepolia Demo Anchor

After `OpenStatAuditAnchor` is deployed, run a dry-run demo anchor. The script
uses `MANTLE_SEPOLIA_ANCHOR_CONTRACT_ADDRESS`, the configured deployer key, and
a deterministic demo run ID to produce the `runRef`, `telemetryDigest`, and
`insightDigest` used for the hackathon proof.

```sh
pnpm --filter @openstat/contracts demo:anchor-mantle-sepolia -- --run-id mantle-demo-run
```

The dry run prints the caller, digests, outcome, and estimated gas. Broadcast
only after reviewing those values:

```sh
pnpm --filter @openstat/contracts demo:anchor-mantle-sepolia -- --run-id mantle-demo-run --confirm
```

Optional overrides are available when anchoring a real dashboard-generated
audit:

```sh
pnpm --filter @openstat/contracts demo:anchor-mantle-sepolia -- \
  --run-id run_123 \
  --run-ref 0x... \
  --telemetry-digest 0x... \
  --insight-digest 0x... \
  --outcome 1
```

Outcomes are `0` unknown, `1` pass, `2` warning, and `3` fail.

Read an anchored audit:

```sh
pnpm --filter @openstat/contracts read:audit -- 0xContract 0xSubmitter 0xRunRef
```

## Deployed Mantle Sepolia Contract

- Contract address:
  `0x1f5a3354dc01beb89ba7de1a01d04295274a737a`
- Deployment transaction:
  `0x05218e9b32c615c0c616e88efd7efc9b5f7bbf84ff388e73dc4b7b14c2ddc956`
- Deployment block: `39493235`
- Deployer: `0x2bCA1BFdEE89586B366bBdAACdF685E1e3124c6D`
- Gas used: `283429`
- Chain ID: `5003`
- Bytecode verification: passed with `1064` deployed bytecode bytes.
- Explorer transaction:
  `https://sepolia.mantlescan.xyz/tx/0x05218e9b32c615c0c616e88efd7efc9b5f7bbf84ff388e73dc4b7b14c2ddc956`
- Explorer contract:
  `https://sepolia.mantlescan.xyz/address/0x1f5a3354dc01beb89ba7de1a01d04295274a737a`

Verify Solidity source through the Mantle Explorer verification surface before
final DoraHacks submission.
