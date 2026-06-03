import { spawnSync } from "node:child_process";
import process from "node:process";

const relevantPrefixes = [
  "apps/backend/",
  "apps/web/",
  "packages/eslint-config/",
  "packages/ingestion/",
  "packages/typescript-config/",
  "packages/ui/",
];

const relevantFiles = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
]);

const diff = spawnSync("git", ["diff", "--name-only", "HEAD^", "HEAD"], {
  encoding: "utf8",
});

if (diff.status !== 0) {
  process.exit(1);
}

const changedFiles = diff.stdout.split(/\r?\n/).filter(Boolean);
const hasRelevantChange = changedFiles.some(
  (file) =>
    relevantFiles.has(file) ||
    relevantPrefixes.some((prefix) => file.startsWith(prefix)),
);

process.exit(hasRelevantChange ? 1 : 0);
