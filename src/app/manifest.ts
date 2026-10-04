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
    background_color: "#050505",
    theme_color: "#050505",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["social", "entertainment", "events"],
  };
}
