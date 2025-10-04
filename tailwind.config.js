/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: { extend: {
    // ta palette brand ici si tu l’as ajoutée
  }},
  plugins: [],
};
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette Shop Santé (depuis ton logo)
        brand: {
          50:  "#eff7f6", // fond très clair (dégradés)
          100: "#d9ece9", // fond clair (dégradés)
          600: "#43a093", // CTA / accents
          700: "#358075", // hover CTA / focus
        },
        accent: {
          500: "#dbcf3a", // jaune (badges, tags)
          600: "#95c063", // vert clair (optionnel)
        },
      },
    },
  },
  plugins: [],
};
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // garantit la génération des classes même si tu n'as pas encore tout remplacé
  safelist: [
    "from-brand-yellow via-brand-lime to-brand-teal",
    "bg-brand-600","hover:bg-brand-700","text-brand-600",
    "bg-accent-500","bg-accent-600"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff7f6",
          100: "#d9ece9",
          600: "#43a093",
          700: "#358075",
        },
        accent: {
          500: "#dbcf3a",
          600: "#95c063",
        },
      },
    },
  },
  plugins: [],
};
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "bg-gradient-to-r","bg-gradient-to-br",
    "from-brand-yellow","via-brand-lime","to-brand-teal",
  ],
  theme: {
    extend: {
      colors: {
        // Palette extraite de ton logo
        "brand-yellow": "#eed229", // jaune
        "brand-olive":  "#d1ce41", // jaune/olive
        "brand-lime":   "#a9c55a", // vert lime
        "brand-pale":   "#e0eacf", // très clair pour fonds
        "brand-teal":   "#379c8c", // turquoise/vert
        "brand-tealL":  "#61ab9b", // turquoise clair
      },
    },
  },
  plugins: [],
};
