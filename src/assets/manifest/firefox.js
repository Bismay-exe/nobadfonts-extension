const base = require('./manifest.json');

module.exports = {
  ...base,

  // Runs the background as an event page, under its own add-on id.
  background: { scripts: ['background/index.js'], type: 'module' },

  browser_specific_settings: {
    gecko: {
      id: 'nobadfonts@nobadfonts.in',
      strict_min_version: '137.0',
    },
  },

  permissions: [...base.permissions, 'identity'],
};
