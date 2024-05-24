/**
 * Returns the current repo version.
 * 
 * Usage:
 * 
 *    const version = require('./get-sc-version');
 * 
 * Or from the command line:
 * 
 *    node -p require('./get-sc-version')
 * 
 */
const versionFile = 'source/lerna.json';
if (!versionFile) {
  throw new Error(`unable to determine version filename from .versionrc.json at the root of the repo`);
}

module.exports = require(`../../${versionFile}`).version;
