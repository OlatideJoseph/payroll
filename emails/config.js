/** Maizzle base (local) config. See https://maizzle.com/docs/configuration */
module.exports = {
  build: {
    templates: {
      source: 'src/templates',
      destination: { path: 'build_local' },
    },
  },
};
