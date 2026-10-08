import type { MetadataRoute } from "next";

// Lets owners "Add to home screen" and open the app full screen like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Business Desk",
    short_name: "Business Desk",
    description: "Sales, collections, finance and people in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#c7701a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
