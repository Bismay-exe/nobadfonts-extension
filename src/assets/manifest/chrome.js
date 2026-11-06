const base = require('./manifest.json');

// Chrome and Edge share this manifest.
module.exports = {
  ...base,

  side_panel: { default_path: 'side-panel-default/index.html' },

  permissions: [...base.permissions, 'identity', 'favicon', 'scripting'],

  optional_permissions: ['sidePanel'],

  host_permissions: [...base.host_permissions, '<all_urls>'],
};
