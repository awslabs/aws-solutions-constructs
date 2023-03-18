#!/usr/bin/env node
// It will make following updates to package.json
// 1 - align the version in a package.json file to the version of the repo
// 2 - Remove all entries starting with @aws-cdk/* and constructs from "dependencies": { ... }
// 3 - Remove all entries starting with @aws-cdk/* and constructs from "peerDependencies": { ... }, Add { "aws-cdk-lib": "^2.0.0-rc.1", "constructs": "^10.0.0" }
// 4 - Add { "aws-cdk-lib": "2.0.0-rc.1", "constructs": "^10.0.0" } to "devDependencies"
const fs = require('fs');

const findVersion = process.argv[2];
const replaceVersion = process.argv[3];

// these versions need to be sourced from a config file
const awsCdkLibVersion = '2.68.0';
const constructsVersion = '10.0.0';
const MODULE_EXEMPTIONS = new Set([
  '@aws-cdk/cloudformation-diff',
  '@aws-cdk/assert',
  '@aws-cdk/assert/jest',
  'aws-cdk'
]);

for (const file of process.argv.splice(4)) {
  const pkg = JSON.parse(fs.readFileSync(file).toString());

  if (pkg.version !== findVersion && pkg.version !== replaceVersion) {
    throw new Error(`unexpected - all package.json files in this repo should have a version of ${findVersion} or ${replaceVersion}: ${file}`);
  }

  pkg.version = replaceVersion;

  pkg.dependencies = processDependencies(pkg.dependencies || { }, file);
  pkg.peerDependencies = processPeerDependencies(pkg.peerDependencies || { }, file);
  pkg.devDependencies = processDevDependencies(pkg.devDependencies || { }, file);
  if (pkg.scripts) {
    pkg.scripts["integ-assert"] = "cdk-integ-assert-v2";
  }

  console.error(`${file} => ${replaceVersion}`);
  fs.writeFileSync(file, JSON.stringify(pkg, undefined, 2));

}

function processDependencies(section, file) {
  let newdependencies = {};
  for (const [ name, version ] of Object.entries(section)) {
    // Remove all entries starting with @aws-cdk/* and constructs
    if ((!name.startsWith('@aws-cdk/') && !name.startsWith('constructs'))) {
      newdependencies[name] = version.replace(findVersion, replaceVersion);
    }
    if (MODULE_EXEMPTIONS.has(name)) {
      newdependencies[name] = version.replace(findVersion, awsCdkLibVersion);
    }
  }
  return newdependencies;
}

function processPeerDependencies(section, file) {
  let newdependencies = {};
  for (const [ name, version ] of Object.entries(section)) {
    // Remove all entries starting with @aws-cdk/* and constructs
    if ((!name.startsWith('@aws-cdk/') && !name.startsWith('constructs'))) {
      newdependencies[name] = version.replace(findVersion, replaceVersion);
    }
    if (MODULE_EXEMPTIONS.has(name)) {
      newdependencies[name] = version.replace(findVersion, awsCdkLibVersion);
    }
  }
  newdependencies["aws-cdk-lib"] = `^${awsCdkLibVersion}`;
  newdependencies["constructs"] = `^${constructsVersion}`;
  return newdependencies;
}

function processDevDependencies(section, file) {
  let newdependencies = {};
  for (const [ name, version ] of Object.entries(section)) {
    // Remove all entries starting with @aws-cdk/* and constructs
    if ((!name.startsWith('@aws-cdk/') && !name.startsWith('constructs'))) {
      newdependencies[name] = version.replace(findVersion, replaceVersion);
    }
    if (MODULE_EXEMPTIONS.has(name)) {
      newdependencies[name] = version.replace(findVersion, awsCdkLibVersion);
    }
  }

  // note: no ^ to make sure we test against the minimum version
  newdependencies["aws-cdk-lib"] = `${awsCdkLibVersion}`;
  newdependencies["constructs"] = `^${constructsVersion}`;
  return newdependencies;
}
