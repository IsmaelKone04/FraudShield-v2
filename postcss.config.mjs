/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Remplacement du plugin v3 par le plugin v4 officiel
    "@tailwindcss/postcss": {}, 
  },
};

export default config;
