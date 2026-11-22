import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gitDir = join(root, ".git");

if (existsSync(gitDir)) {
  try {
    execSync("git config core.hooksPath .githooks", {
      cwd: root,
      stdio: "ignore",
    });
  } catch {
    // Ignore in environments where git is not available or restricted
  }
}
