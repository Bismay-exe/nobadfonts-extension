const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

/**
 * Reads KEY=VALUE lines from one env file into process.env, without replacing
 * a value the shell already set. Quotes are optional and comments are ignored.
 */
const loadFile = file => {
  const text = fs.readFileSync(file, 'utf8');

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const equals = line.indexOf('=');

    if (equals === -1) {
      continue;
    }

    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

/**
 * Loads .env.local then .env, so a local file wins without overriding flags a
 * build was started with.
 */
module.exports = () => {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(ROOT, name);

    if (fs.existsSync(file)) {
      loadFile(file);
    }
  }
};
