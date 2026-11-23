import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DynamoRastabaazRepository } from "@/lib/repo/dynamo";
import { getRepository, resetRepositoryForTests, setRepositoryForTests, wantsMemoryRepository } from "@/lib/repo/context";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";

afterEach(() => {
  vi.unstubAllEnvs();
  resetRepositoryForTests();
});

describe("the local, Docker-free repository switch", () => {
  it("serves one shared in-memory repository in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RASTABAAZ_REPO", "memory");
    const repo = getRepository();
    expect(repo).toBeInstanceOf(MemoryRastabaazRepository);
    expect(getRepository()).toBe(repo);
  });

  it("is ignored in production, so a deployed app always uses DynamoDB", () => {
    expect(wantsMemoryRepository({ NODE_ENV: "production", RASTABAAZ_REPO: "memory" })).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RASTABAAZ_REPO", "memory");
    vi.stubEnv("RASTABAAZ_TABLE_NAME", "rastabaaz");
    expect(getRepository()).toBeInstanceOf(DynamoRastabaazRepository);
  });

  it("is off unless asked for", () => {
    expect(wantsMemoryRepository({ NODE_ENV: "development" })).toBe(false);
    expect(wantsMemoryRepository({ NODE_ENV: "development", RASTABAAZ_REPO: "dynamo" })).toBe(false);
  });

  it("fails fast in production when RASTABAAZ_TABLE_NAME is unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RASTABAAZ_REPO", "memory");
    delete process.env.RASTABAAZ_TABLE_NAME;
    delete process.env.ALLOW_MEMORY_REPO;

    expect(() => getRepository()).toThrowError(
      /FATAL: RASTABAAZ_TABLE_NAME environment variable is required in production/,
    );
  });

  it("fails fast in production when RASTABAAZ_TABLE_NAME is empty string", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RASTABAAZ_TABLE_NAME", "");
    delete process.env.ALLOW_MEMORY_REPO;

    expect(() => getRepository()).toThrowError(
      /FATAL: RASTABAAZ_TABLE_NAME environment variable is required in production/,
    );
  });

  it("permits memory repository in production when ALLOW_MEMORY_REPO is 1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_MEMORY_REPO", "1");
    vi.stubEnv("RASTABAAZ_REPO", "memory");
    delete process.env.RASTABAAZ_TABLE_NAME;

    expect(wantsMemoryRepository({ NODE_ENV: "production", RASTABAAZ_REPO: "memory", ALLOW_MEMORY_REPO: "1" })).toBe(true);
    const repo = getRepository();
    expect(repo).toBeInstanceOf(MemoryRastabaazRepository);
  });
});
