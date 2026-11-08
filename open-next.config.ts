import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Pages are rendered per request; the few prerendered ones are served read-only from the build's static assets.
const config = defineCloudflareConfig({ incrementalCache: staticAssetsIncrementalCache });

// On Windows, Turbopack's hashed external-package symlinks fail without symlink privileges
// (EPERM in OpenNext's copyTracedFiles), so local Windows builds use webpack.
// Workers Builds (Linux) keeps the default `next build` (Turbopack).
if (process.platform === "win32") {
  config.buildCommand = "npx next build --webpack";
}

export default config;
