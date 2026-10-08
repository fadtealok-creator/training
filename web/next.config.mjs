/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uploaded spreadsheets go through server actions; the default 1 MB is too small.
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
};
export default nextConfig;
