// src/app/dashboard/cards/[card_id]/club/identity/clubGenreTaxonomy.ts

export type ClubGenreTaxonomyItem = {
  name: string;
  aliases: string[];
};

function normalizeGenreSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const CLUB_GENRE_TAXONOMY: ClubGenreTaxonomyItem[] = [
  { name: "EDM", aliases: ["Electronic Dance Music"] },

  { name: "House", aliases: [] },
  { name: "Deep House", aliases: [] },
  { name: "Tech House", aliases: [] },
  { name: "Progressive House", aliases: [] },
  { name: "Organic House", aliases: [] },
  { name: "Afro House", aliases: [] },
  { name: "Afro Melodic", aliases: ["Melodic Afro"] },
  { name: "3Step", aliases: ["3 Step"] },
  { name: "Amapiano", aliases: [] },
  { name: "Bass House", aliases: [] },
  { name: "Funky House", aliases: [] },
  { name: "Jackin House", aliases: ["Jackin' House"] },
  { name: "Soulful House", aliases: [] },
  { name: "Latin House", aliases: [] },
  { name: "Acid House", aliases: [] },
  { name: "Minimal House", aliases: [] },
  { name: "Future House", aliases: [] },
  { name: "Tropical House", aliases: [] },
  { name: "Electro House", aliases: [] },
  { name: "Speed House", aliases: [] },
  { name: "Hard House", aliases: [] },
  { name: "Melodic House", aliases: [] },
  { name: "Melodic House & Techno", aliases: ["Melodic House and Techno"] },

  { name: "Techno", aliases: [] },
  { name: "Peak Time Techno", aliases: ["Techno Peak Time", "Peak Time"] },
  { name: "Driving Techno", aliases: ["Techno Driving", "Driving"] },
  { name: "Hard Techno", aliases: [] },
  { name: "Raw Techno", aliases: [] },
  { name: "Deep Techno", aliases: [] },
  { name: "Hypnotic Techno", aliases: [] },
  { name: "Dub Techno", aliases: [] },
  { name: "Psy-Techno", aliases: ["Psy Techno"] },
  { name: "Broken Techno", aliases: [] },
  { name: "Industrial Techno", aliases: [] },
  { name: "Acid Techno", aliases: [] },
  { name: "Melodic Techno", aliases: [] },
  { name: "EBM", aliases: ["Electronic Body Music"] },

  { name: "Minimal / Deep Tech", aliases: ["Minimal Deep Tech"] },
  { name: "Deep Tech", aliases: [] },
  { name: "Bounce", aliases: [] },

  { name: "Trance", aliases: [] },
  { name: "Progressive Trance", aliases: [] },
  { name: "Tech Trance", aliases: [] },
  { name: "Hard Trance", aliases: [] },
  { name: "Uplifting Trance", aliases: [] },
  { name: "Vocal Trance", aliases: [] },
  { name: "Raw Trance", aliases: [] },
  { name: "Deep Trance", aliases: [] },
  { name: "Hypnotic Trance", aliases: [] },

  { name: "Psy-Trance", aliases: ["Psytrance", "Psy Trance"] },
  { name: "Full-On", aliases: ["Full On", "Fullon"] },
  { name: "Progressive Psy", aliases: ["Progressive Psytrance", "Prog Psy"] },
  { name: "Psychedelic Trance", aliases: ["Psychedelic"] },
  { name: "Goa Trance", aliases: ["Goa"] },
  { name: "Dark Psy", aliases: ["Dark Psytrance"] },
  { name: "Forest Psy", aliases: ["Forest Psytrance", "Forest"] },
  { name: "Psycore", aliases: [] },
  { name: "Hi-Tech Psytrance", aliases: ["Hitech", "Hi Tech", "H-Tech", "H Tech"] },

  { name: "Drum & Bass", aliases: ["Drum and Bass", "DnB", "D&B", "DNB"] },
  { name: "Liquid Drum & Bass", aliases: ["Liquid DnB", "Liquid D&B", "Liquid"] },
  { name: "Jump Up", aliases: ["Jump-Up"] },
  { name: "Jungle", aliases: [] },
  { name: "Halftime", aliases: ["Half Time"] },
  { name: "Neurofunk", aliases: ["Neuro Funk"] },

  { name: "Dubstep", aliases: [] },
  { name: "Deep Dubstep", aliases: [] },
  { name: "Melodic Dubstep", aliases: [] },
  { name: "Midtempo", aliases: ["Mid Tempo"] },
  { name: "140 / Deep Dubstep / Grime", aliases: ["140", "140 BPM"] },
  { name: "Grime", aliases: [] },

  { name: "Breaks / Breakbeat / UK Bass", aliases: ["Breaks", "Breakbeat", "UK Bass"] },
  { name: "Breakbeat", aliases: ["Break Beat"] },
  { name: "Glitch Hop", aliases: [] },

  { name: "UK Garage / Bassline", aliases: ["UK Garage Bassline"] },
  { name: "UK Garage", aliases: ["UKG", "UKG Garage"] },
  { name: "Bassline", aliases: [] },
  { name: "2-Step", aliases: ["2 Step", "Two Step Garage"] },
  { name: "Speed Garage", aliases: [] },
  { name: "UK Funky", aliases: [] },

  { name: "Bass / Club", aliases: ["Bass Club"] },
  { name: "Juke / Footwork", aliases: ["Juke", "Footwork"] },
  { name: "Jersey Club", aliases: [] },
  { name: "Global Club", aliases: [] },
  { name: "Gqom", aliases: [] },

  { name: "Trap", aliases: [] },
  { name: "Future Bass", aliases: [] },
  { name: "Trap / Future Bass", aliases: ["Trap Future Bass"] },

  { name: "Mainstage", aliases: ["Festival EDM"] },
  { name: "Big Room", aliases: ["Bigroom", "Big Room House"] },
  { name: "Future Rave", aliases: [] },

  { name: "Dance / Pop", aliases: ["Dance Pop", "Electro Pop", "Electropop"] },
  { name: "Electronica", aliases: [] },
  { name: "Ambient / Experimental", aliases: ["Ambient Experimental"] },
  { name: "Ambient", aliases: [] },
  { name: "Experimental", aliases: [] },
  { name: "Downtempo", aliases: ["Down Tempo"] },
  { name: "IDM", aliases: ["Intelligent Dance Music"] },

  { name: "Indie Dance", aliases: [] },
  { name: "Dark Disco", aliases: [] },
  { name: "Nu Disco / Disco", aliases: ["Nu Disco", "Disco"] },
  { name: "Nu Disco", aliases: ["Nu-Disco"] },
  { name: "Italo Disco", aliases: ["Italo"] },

  {
    name: "Electro (Classic / Detroit / Modern)",
    aliases: ["Electro", "Detroit Electro", "Classic Electro", "Modern Electro"],
  },

  { name: "Hard Dance / Hardcore / Neo Rave", aliases: ["Hard Dance", "Hardcore", "Neo Rave"] },
  { name: "Hardstyle", aliases: [] },
  { name: "Uptempo", aliases: ["Uptempo Hardcore"] },
  { name: "Terror", aliases: ["Terrorcore"] },
  { name: "UK / Happy Hardcore", aliases: ["Happy Hardcore", "UK Hardcore"] },
  { name: "Frenchcore", aliases: [] },
  { name: "Neo Rave", aliases: [] },

  { name: "Brazilian Funk", aliases: ["Funk Brasileiro", "Brazilian Funk"] },
  { name: "Carioca Funk", aliases: ["Funk Carioca"] },
  { name: "Mandelao Funk", aliases: ["Mandelão", "Funk Mandelão", "Mandelao"] },
  { name: "BH Funk", aliases: ["Funk BH"] },
  { name: "Melodic Funk", aliases: [] },
  { name: "Eletrofunk", aliases: ["Eletro Funk", "Electro Funk"] },

  { name: "Latin Electronic", aliases: ["Electronic Latin"] },
  { name: "Raptor House", aliases: [] },
  { name: "Tribal / Guaracha", aliases: ["Tribal", "Guaracha"] },
  { name: "Electronic Cumbia", aliases: ["Cumbia Electronic"] },
  { name: "Moombahton", aliases: [] },
];

const POPULAR_DEFAULTS = [
  "House",
  "Tech House",
  "Techno",
  "Deep House",
  "Progressive House",
  "Melodic House & Techno",
  "Melodic Techno",
  "Afro House",
  "Psy-Trance",
  "Drum & Bass",
  "Hard Techno",
  "Trance",
];

export function searchClubGenreTaxonomy(query: string, limit = 30) {
  const normalizedQuery = normalizeGenreSearch(query);

  if (!normalizedQuery) {
    return POPULAR_DEFAULTS
      .map((name) => CLUB_GENRE_TAXONOMY.find((item) => item.name === name))
      .filter((item): item is ClubGenreTaxonomyItem => Boolean(item))
      .slice(0, limit);
  }

  const terms = normalizedQuery.split(" ").filter(Boolean);

  return CLUB_GENRE_TAXONOMY
    .map((item) => {
      const name = normalizeGenreSearch(item.name);
      const aliases = item.aliases.map(normalizeGenreSearch);
      const searchable = [name, ...aliases];

      let score = 0;

      if (name === normalizedQuery) {
        score = 100;
      } else if (aliases.includes(normalizedQuery)) {
        score = 95;
      } else if (name.startsWith(normalizedQuery)) {
        score = 85;
      } else if (aliases.some((alias) => alias.startsWith(normalizedQuery))) {
        score = 80;
      } else if (searchable.some((value) => value.includes(normalizedQuery))) {
        score = 70;
      } else if (
        terms.length > 0 &&
        terms.every((term) => searchable.some((value) => value.includes(term)))
      ) {
        score = 60;
      }

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((entry) => entry.item);
}