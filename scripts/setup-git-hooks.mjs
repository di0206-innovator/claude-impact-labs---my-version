import { execSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gitDir = join(root, ".git");
const githooksDir = join(root, ".githooks");
const gitHooksTargetDir = join(gitDir, "hooks");

if (existsSync(gitDir)) {
  try {
    execSync("git config core.hooksPath .githooks", {
      cwd: root,
      stdio: "ignore",
    });
  } catch {
    // Ignore in environments where git is not available or restricted
  }

  // Ensure files in .githooks are executable and copied to .git/hooks as fallback
  if (existsSync(githooksDir)) {
    const hookFiles = readdirSync(githooksDir);
    for (const file of hookFiles) {
      const srcPath = join(githooksDir, file);
      try {
        chmodSync(srcPath, 0o755);
      } catch {
        // Ignore chmod errors on unsupported filesystems
      }

      if (existsSync(gitHooksTargetDir)) {
        const destPath = join(gitHooksTargetDir, file);
        try {
          copyFileSync(srcPath, destPath);
          chmodSync(destPath, 0o755);
        } catch {
          // Ignore copy/chmod errors
        }
      }
    }
  }
}
