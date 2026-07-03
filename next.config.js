/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Native / wasm modules used server-side: sharp (analysis worker) and
  // heic-convert + its libheif-js wasm decoder (HEIC→JPEG on upload). Keep them
  // external so Next doesn't bundle the platform binaries/wasm — this is what
  // lets them load cleanly on Railway. (Renamed out of `experimental` in
  // Next 15.)
  serverExternalPackages: ["sharp", "heic-convert", "libheif-js"],
};

module.exports = nextConfig;
