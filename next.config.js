/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // smaller, self-contained build for Coolify/Docker
};
module.exports = nextConfig;
