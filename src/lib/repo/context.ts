import "server-only";
import { SEED_VERSION } from "@/lib/repo/keys";
import type { RastabaazRepository } from "@/lib/repo/port";
import { DynamoRastabaazRepository } from "@/lib/repo/dynamo";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";
import { buildSeedItems } from "@/lib/seed/run";

let override: RastabaazRepository | null = null;
let singleton: RastabaazRepository | null = null;

/**
 * Keeps records in dev-server memory when RASTABAAZ_REPO=memory or when no DynamoDB
 * table name is configured locally, so the app can be tried with no AWS account,
 * no table, and no Docker. Ignored whenever NODE_ENV is production.
 */
export function wantsMemoryRepository(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.ALLOW_MEMORY_REPO === "1" && env.RASTABAAZ_REPO === "memory") return true;
  return env.RASTABAAZ_REPO === "memory" && env.NODE_ENV !== "production";
}

// On globalThis because Next dev can load this module more than once (pages,
// actions, hot reloads), and each copy must see the same records.
const holder = globalThis as { __rastabaazMemoryRepository?: RastabaazRepository };

export function setRepositoryForTests(repo: RastabaazRepository | null): void {
  override = repo;
  if (repo === null) {
    singleton = null;
  }
}

export function resetRepositoryForTests(): void {
  override = null;
  singleton = null;
  delete holder.__rastabaazMemoryRepository;
}

export function getRepository(): RastabaazRepository {
  if (override) return override;

  const isProd = process.env.NODE_ENV === "production";
  const allowMemoryInProd = process.env.ALLOW_MEMORY_REPO === "1";

  if (isProd && !allowMemoryInProd && !process.env.RASTABAAZ_TABLE_NAME?.trim()) {
    throw new Error(
      "FATAL: RASTABAAZ_TABLE_NAME environment variable is required in production. " +
      "In-memory fallback is disabled to prevent silent data loss. " +
      "Set ALLOW_MEMORY_REPO=1 if this is an ephemeral demo environment."
    );
  }

  if (
    wantsMemoryRepository() ||
    (!process.env.RASTABAAZ_TABLE_NAME?.trim() && process.env.RASTABAAZ_REPO !== "dynamo") ||
    (allowMemoryInProd && process.env.RASTABAAZ_REPO === "memory")
  ) {
    if (!holder.__rastabaazMemoryRepository) {
      const repo = new MemoryRastabaazRepository({ strictPhoto: true });
      // Pre-seed synchronously so the map and catalog are immediately populated.
      repo.putSeedItemsSync(buildSeedItems());
      repo.putSeedMarkerSync(SEED_VERSION);
      holder.__rastabaazMemoryRepository = repo;
    }
    return holder.__rastabaazMemoryRepository;
  }
  if (!singleton) singleton = new DynamoRastabaazRepository();
  return singleton;
}
