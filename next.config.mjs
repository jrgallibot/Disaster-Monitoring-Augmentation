/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow LAN devices (e.g. 192.168.1.100) to load dev chunks from this machine
  allowedDevOrigins: ["192.168.1.100", "192.168.1.*"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
