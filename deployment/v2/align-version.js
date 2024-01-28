#!/usr/bin/env node
// It will make following updates to package.json
// 1 - align the version in a package.json file to the version of the repo
// 2 - Remove all entries starting with @aws-cdk/* and constructs from "dependencies": { ... }
// 3 - Remove all entries starting with @aws-cdk/* and constructs from "peerDependencies": { ... }, Add { "aws-cdk-lib": "^2.0.0-rc.1", "constructs": "^10.0.0" }
// 4 - Add { "aws-cdk-lib": "2.0.0-rc.1", "constructs": "^10.0.0" } to "devDependencies"
const fs = require('fs');

const nullVersionMarker = process.argv[2];
const newSolutionsConstrucstVersion = process.argv[3];

// these versions need to be sourced from a config file
const awsCdkLibVersion = '2.118.0';
const constructsVersion = '10.0.0';
const MODULE_EXEMPTIONS = new Set([
  '@aws-cdk/cloudformation-diff',
  'aws-cdk'
]);

for (const file of process.argv.splice(4)) {
  const pkg = JSON.parse(fs.readFileSync(file).toString());

  if (pkg.version !== nullVersionMarker && pkg.version !== newSolutionsConstrucstVersion) {
    throw new Error(`unexpected - all package.json files in this repo should have a version of ${nullVersionMarker} or ${newSolutionsConstrucstVersion}: ${file}`);
  }

  pkg.version = newSolutionsConstrucstVersion;

  pkg.dependencies = processDependencies(pkg.dependencies || { }, file);
  pkg.peerDependencies = processPeerDependencies(pkg.peerDependencies || { }, file);
  pkg.devDependencies = processDevDependencies(pkg.devDependencies || { }, file);
  if (pkg.scripts) {
    pkg.scripts["integ-assert"] = "cdk-integ-assert-v2";
  }

  console.error(`${file} => ${newSolutionsConstrucstVersion}`);
  fs.writeFileSync(file, JSON.stringify(pkg, undefined, 2));

}

function processDependencies(section, file) {
  let newdependencies = {};
  for (const [ name, version ] of Object.entries(section)) {
    // Remove all entries starting with @aws-cdk/* and constructs
    if ((!name.startsWith('@aws-cdk/') && !name.startsWith('constructs'))) {
      newdependencies[name] = version.replace(nullVersionMarker, newSolutionsConstrucstVersion);
    }
    if (MODULE_EXEMPTIONS.has(name)) {
      newdependencies[name] = version.replace(nullVersionMarker, awsCdkLibVersion);
    }
  }
  return newdependencies;
}

function processPeerDependencies(section, file) {
  let newdependencies = {};
  for (const [ name, version ] of Object.entries(section)) {
    // Remove all entries starting with @aws-cdk/* and constructs
    if ((!name.startsWith('@aws-cdk/') && !name.startsWith('constructs'))) {
      newdependencies[name] = version.replace(nullVersionMarker, newSolutionsConstrucstVersion);
    }
    if (MODULE_EXEMPTIONS.has(name)) {
      newdependencies[name] = version.replace(nullVersionMarker, awsCdkLibVersion);
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
      newdependencies[name] = version.replace(nullVersionMarker, newSolutionsConstrucstVersion);
    }
    if (MODULE_EXEMPTIONS.has(name)) {
      newdependencies[name] = version.replace(nullVersionMarker, awsCdkLibVersion);
    }
  }

  // note: no ^ to make sure we test against the minimum version
  newdependencies["aws-cdk-lib"] = `${awsCdkLibVersion}`;
  newdependencies["constructs"] = `^${constructsVersion}`;
  return newdependencies;
}
