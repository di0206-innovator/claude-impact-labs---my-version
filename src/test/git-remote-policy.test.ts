import { execSync, spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const HOOK_PATH = path.join(ROOT, ".githooks", "pre-push");
const AUTHORIZED_URL =
  "https://github.com/di0206-innovator/claude-impact-labs---my-version.git";
const FORBIDDEN_SUBSTRING = "TUSHARDHOKRIYA";

describe("git remote invariants & pre-push safety policy", () => {
  it("enforces git remotes point exclusively to di0206-innovator", () => {
    const remotes = execSync("git remote -v", { cwd: ROOT, encoding: "utf8" });

    // Must have origin pointing to authorized URL
    expect(remotes).toContain(AUTHORIZED_URL);

    // Must NOT contain forbidden account or repo
    expect(remotes).not.toContain(FORBIDDEN_SUBSTRING);

    // Origin must be the only remote configured
    const lines = remotes.trim().split("\n");
    for (const line of lines) {
      expect(line.startsWith("origin\t")).toBe(true);
    }
  });

  it("ensures .githooks/pre-push exists and is executable", () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
    const mode = statSync(HOOK_PATH).mode;
    // Check executable bit for user (0o100)
    expect((mode & 0o100) !== 0).toBe(true);
  });

  it("blocks pushes targeting TUSHARDHOKRIYA repository (HTTPS & SSH)", () => {
    const forbiddenUrls = [
      "https://github.com/TUSHARDHOKRIYA/Claude-Impact-Lab.git",
      "git@github.com:TUSHARDHOKRIYA/Claude-Impact-Lab.git",
      "https://github.com/tushardhokriya/claude-impact-lab",
    ];

    for (const url of forbiddenUrls) {
      const result = spawnSync(HOOK_PATH, ["origin", url], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("strictly blocked by safety policy");
    }
  });

  it("blocks pushes targeting unauthorized third-party repositories", () => {
    const unauthorized = [
      "https://github.com/random-user/repo.git",
      "git@github.com:attacker/compromised.git",
    ];

    for (const url of unauthorized) {
      const result = spawnSync(HOOK_PATH, ["origin", url], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("is not authorized");
    }
  });

  it("blocks pushes targeting non-origin named remotes", () => {
    const result = spawnSync(
      HOOK_PATH,
      ["upstream", AUTHORIZED_URL],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Remote name 'upstream' is not authorized");
  });

  it("allows pushes targeting authorized origin URL (HTTPS & SSH)", () => {
    const allowed = [
      AUTHORIZED_URL,
      "https://github.com/di0206-innovator/claude-impact-labs---my-version",
      "git@github.com:di0206-innovator/claude-impact-labs---my-version.git",
    ];

    for (const url of allowed) {
      const result = spawnSync(HOOK_PATH, ["origin", url], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(result.status).toBe(0);
    }
  });
});
