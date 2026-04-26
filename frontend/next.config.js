/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: Do NOT use output:"export" — audit pages use dynamic UUIDs at runtime
  // and cannot be statically pre-rendered. Firebase Hosting uses Cloud Run
  // (via the rewrite in firebase.json) to serve this Next.js app at runtime.
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
