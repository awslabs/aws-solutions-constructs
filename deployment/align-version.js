#!/usr/bin/env node
//
// align the version in a package.json file to the version of the repo
//
const fs = require('fs');

const findVersion = process.argv[2];
const replaceVersion = process.argv[3];

for (const file of process.argv.splice(4)) {
  const pkg = JSON.parse(fs.readFileSync(file).toString());

  if (pkg.version !== findVersion && pkg.version !== replaceVersion) {
    throw new Error(`unexpected - all package.json files in this repo should have a version of ${findVersion} or ${replaceVersion}: ${file}`);
  }

  pkg.version = replaceVersion;

  processSection(pkg.dependencies || { }, file);
  processSection(pkg.devDependencies || { }, file);
  processSection(pkg.peerDependencies || { }, file);

  console.error(`${file} => ${replaceVersion}`);
  fs.writeFileSync(file, JSON.stringify(pkg, undefined, 2));
}

function processSection(section, file) {
  for (const [ name, version ] of Object.entries(section)) {
    if (version === findVersion || version === '^' + findVersion) {
      section[name] = version.replace(findVersion, replaceVersion);
    }
  }
}
