import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rastabaaz — Mumbai Road Accountability",
    short_name: "Rastabaaz",
    description:
      "Follow the rupee on Mumbai's monsoon roads. Report potholes, inspect 24 BMC wards, and verify whether repairs held.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#064E4B",
    theme_color: "#064E4B",
    categories: ["government", "navigation", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Report a Pothole",
        short_name: "Report",
        description: "Photograph and report a road hazard in Mumbai",
        url: "/report",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "City Map",
        short_name: "Map",
        description: "Inspect reported road problems across Mumbai",
        url: "/map",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Ward Ledgers",
        short_name: "Wards",
        description: "Follow monsoon repair spend across 24 BMC wards",
        url: "/wards",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
