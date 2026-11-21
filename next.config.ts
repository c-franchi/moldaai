import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext inspects multipart POSTs before dispatching API routes. Allow the
  // Studio's 8 MB image plus multipart headers; each API keeps its own limits.
  experimental: { serverActions: { bodySizeLimit: '9mb' } },
};

export default nextConfig;
