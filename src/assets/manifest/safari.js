const base = require('./manifest.json');

module.exports = {
  ...base,

  action: {
    ...base.action,
    default_icon: {
      ...base.action.default_icon,
      19: 'img/icon19.png',
      38: 'img/icon38.png',
    },
  },

  permissions: [...base.permissions, 'declarativeNetRequestWithHostAccess'],

  host_permissions: [...base.host_permissions],
};
