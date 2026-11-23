import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export function getBuildSha(): string {
  if (process.env.BUILD_SHA) return process.env.BUILD_SHA.slice(0, 12);
  if (process.env.GIT_SHA) return process.env.GIT_SHA.slice(0, 12);
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  if (process.env.NEXT_PUBLIC_BUILD_SHA) return process.env.NEXT_PUBLIC_BUILD_SHA.slice(0, 12);

  try {
    const gitSha = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (gitSha) return gitSha;
  } catch {
    // If git is unavailable, fallback to timestamp
  }

  return "v-" + Math.floor(Date.now() / 1000);
}

export function generateServiceWorker(buildSha?: string): string {
  const sha = buildSha || getBuildSha();
  const cacheName = `rastabaaz-shell-${sha}`;
  const root = process.cwd();
  const templatePath = path.join(root, "public", "sw.template.js");
  const outputPath = path.join(root, "public", "sw.js");

  const template = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, "utf8")
    : fs.readFileSync(outputPath, "utf8");

  const content = template.replace(
    /const CACHE_NAME = ["'][^"']+["'];/,
    `const CACHE_NAME = "${cacheName}";`,
  );

  fs.writeFileSync(outputPath, content, "utf8");
  console.log(`Generated service worker ${outputPath} with CACHE_NAME: "${cacheName}"`);
  return cacheName;
}

if (process.argv[1]?.includes("generate-sw")) {
  generateServiceWorker();
}
