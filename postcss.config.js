module.exports = ctx => ({
  plugins: {
    "postcss-easy-media-query": {
      breakpoints: {
        tablet: 600,
        desktop: 1024
      }
    },
    "postcss-text-remove-gap": {
      defaultFontFamily: "Open Sans",
      defaultLineHeight: "0"
    },
    "postcss-nested": {},
    "postcss-preset-env": {
      autoprefixer: false,
      stage: 1,
      features: {
        'custom-properties': true,
        'custom-media-queries': true,
        'nesting-rules': true
      }
    }
  }
});

// "postcss-nested": {},
// "postcss-sorting": {
//   order: ["custom-properties", "dollar-variables", "declarations", "at-rules", "rules"],
//   "properties-order": "alphabetical",
//   "unspecified-properties-position": "bottom"
// },
// "postcss-utilities": {}
