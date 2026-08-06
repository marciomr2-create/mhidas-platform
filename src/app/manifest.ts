import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "USECLUBBERS",
    short_name: "USECLUBBERS",
    description:
      "Sua identidade, conexões e experiências na cultura clubber.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0B1020",
    theme_color: "#0D9488",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["social", "entertainment", "events"],
  };
}
