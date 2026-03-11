// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
// /* config options here */
// images: {
//     domains: ["lh3.googleusercontent.com"],
// },
// };

// export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '', // leave empty unless you need a specific port
                pathname: '/**', // /** = allow any path after the domain
            },
            // Optional: also add the parent domain (some Google URLs redirect/use it)
            {
                protocol: 'https',
                hostname: 'googleusercontent.com',
                pathname: '/**'
            },
        ]
    }
};

export default nextConfig;
