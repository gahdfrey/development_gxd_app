import type { MetadataRoute } from "next";

// Web app manifest: name and icons used when CareVault is added to a phone's home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CareVault",
    short_name: "CareVault",
    description: "The EHR built for the way clinicians think.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#2563EB",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
