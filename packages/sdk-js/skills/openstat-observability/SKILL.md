---
name: openstat-observability
description: Observe RealClaw and Byreal Mantle actions with OpenStat telemetry.
---

# OpenStat Observability

Use OpenStat as the analytics and verification layer for Mantle agent actions.
Keep `OPENSTAT_API_KEY` in the runtime secret store and never print it. Set
`OPENSTAT_ENDPOINT` or `OPENSTAT_API_URL` when the OpenStat API is not using the
SDK default.

## Record A Known Transaction

```sh
openstat-realclaw observe \
  --tx-hash 0x... \
  --chain-id 5003 \
  --run-id run_demo \
  --action anchor_audit
```

## Wrap A Byreal-Style Command

Always preview the exact command first:

```sh
openstat-realclaw exec --dry-run -- <byreal-command> <args>
```

Rehearse without a wallet by adding `--fixture`:

```sh
openstat-realclaw exec --fixture --dry-run -- fixture
```

Only use `--confirm` after the operator explicitly approves the preview:

```sh
openstat-realclaw exec --confirm --chain-id 5000 -- <byreal-command> <args>
```

The wrapper emits only structured OpenStat transaction context. Do not place
wallet private keys, Privy tokens, prompts, or raw tool payloads in telemetry.
