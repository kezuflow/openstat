# Mantle Integration

This directory owns Mantle-specific ingestion behavior:

- RPC client construction and explorer URLs.
- Adapter registration for submitted receipt reconciliation.
- `OpenStatAuditAnchor` event indexing.

Keep generic telemetry schemas, redaction, audit analysis, reconciliation, and
persistence models outside this directory. New chain adapters should use
sibling directories under `integrations/` and reuse the generic
`chain_transaction`, `audit_insights`, and `audit_anchors` models. Register
projection-facing helpers in the parent `integrations/registry.ts` module so
core ingestion does not import a chain adapter directly.
