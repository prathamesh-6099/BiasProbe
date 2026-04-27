/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output: bundles only the files needed to run the server,
  // enabling a lean Docker image for Cloud Run deployment.
  output: "standalone",
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
