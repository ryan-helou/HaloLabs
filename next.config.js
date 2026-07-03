const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the file-tracing root to this project. A stray lockfile higher up the
  // tree makes Next 15 infer a parent as the workspace root, which misplaces
  // build manifests (functions-config-manifest.json ENOENT) — pinning it fixes
  // that and silences the multi-lockfile warning. On Railway __dirname = /app.
  outputFileTracingRoot: path.join(__dirname),
  // Native / wasm modules used server-side: sharp (analysis worker) and
  // heic-convert + its libheif-js wasm decoder (HEIC→JPEG on upload). Keep them
  // external so Next doesn't bundle the platform binaries/wasm — this is what
  // lets them load cleanly on Railway. (Renamed out of `experimental` in
  // Next 15.)
  serverExternalPackages: ["sharp", "heic-convert", "libheif-js"],
};

module.exports = nextConfig;
