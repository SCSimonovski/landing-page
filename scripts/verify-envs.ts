// pnpm verify-envs — checks .env.local files across the workspace for key-set
// consistency. Doesn't compare values (those legitimately differ per
// environment), only the SET of keys. Drift between root and per-app .env.local
// is the operational failure mode this catches.
//
// Per AGENTS.md ops rule: env-var changes are 5-place updates (root .env.local +
// each app's .env.local + each Vercel project's dashboard env vars). This script
// covers the local-side three. Vercel-side requires manual per-project check.
//
// Read-only — never writes. Exits 0 if all key sets match, non-zero with a diff
// report if any drift is found.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = process.cwd();

type EnvLoc = { path: string; label: string };

function findEnvLocations(): EnvLoc[] {
  const locations: EnvLoc[] = [];

  // Root .env.local
  const rootEnv = join(REPO_ROOT, ".env.local");
  try {
    statSync(rootEnv);
    locations.push({ path: rootEnv, label: "root" });
  } catch {
    // not present
  }

  // Each apps/<app>/.env.local
  const appsDir = join(REPO_ROOT, "apps");
  try {
    const apps = readdirSync(appsDir);
    for (const app of apps) {
      const envPath = join(appsDir, app, ".env.local");
      try {
        statSync(envPath);
        locations.push({ path: envPath, label: `apps/${app}` });
      } catch {
        // app has no .env.local
      }
    }
  } catch {
    // no apps/ directory
  }

  return locations;
}

function parseEnvKeys(filePath: string): Set<string> {
  const content = readFileSync(filePath, "utf-8");
  const keys = new Set<string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) continue;
    keys.add(line.slice(0, eqIdx).trim());
  }
  return keys;
}

function main(): void {
  const locations = findEnvLocations();
  if (locations.length === 0) {
    console.log("verify-envs: no .env.local files found.");
    process.exit(0);
  }

  // Build the union of all keys across all locations.
  const allKeys = new Set<string>();
  const perLoc: Array<{ label: string; path: string; keys: Set<string> }> = [];
  for (const loc of locations) {
    const keys = parseEnvKeys(loc.path);
    perLoc.push({ ...loc, keys });
    for (const k of keys) allKeys.add(k);
  }

  // Report.
  let drift = false;
  for (const { label, path, keys } of perLoc) {
    const rel = relative(REPO_ROOT, path);
    const missing: string[] = [];
    for (const k of allKeys) if (!keys.has(k)) missing.push(k);
    if (missing.length === 0) {
      console.log(`✓ ${label} (${rel}): ${keys.size} keys, all match union`);
    } else {
      drift = true;
      console.log(
        `✗ ${label} (${rel}): ${keys.size} keys; MISSING ${missing.length}: ${missing.sort().join(", ")}`,
      );
    }
  }

  if (drift) {
    console.log(
      "\nDrift detected. Per AGENTS.md, env-var changes must update every .env.local " +
        "(root + each apps/<app>/.env.local) plus each Vercel project's dashboard env vars.",
    );
    process.exit(1);
  }
  console.log(`\nAll ${perLoc.length} envs have matching key sets (${allKeys.size} keys).`);
}

main();
