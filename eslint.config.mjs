import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

// Next.js 16 a supprimé `next lint` : ESLint est invoqué directement (`npm run lint`).
// Depuis la version 16, `eslint-config-next` publie directement des configurations
// « plates » — pas besoin du pont `FlatCompat`, qui échoue d'ailleurs sur ces presets.
const config = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    settings: { next: { rootDir: "src/" } },
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
]

export default config
