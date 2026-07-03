/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // sharp is a native module used by the server-side analysis worker
  // (lib/analyze). Keep it external so Next doesn't try to bundle the platform
  // binary — this is what lets it load cleanly on Railway.
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
};

module.exports = nextConfig;
