/** Production config: inline + clean CSS, output to build_production. */
module.exports = {
  build: {
    templates: {
      source: 'src/templates',
      destination: { path: 'build_production' },
    },
  },
  inlineCSS: true,
  removeUnusedCSS: true,
  prettify: true,
};
