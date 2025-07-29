#!/usr/bin/env node
// It will make following updates to package.json
// 1 - align the version in a package.json file to the version of the repo
// 2 - Remove all entries starting with @aws-cdk/* and constructs from "dependencies": { ... }
// 3 - Remove all entries starting with @aws-cdk/* and constructs from "peerDependencies": { ... }, Add { "aws-cdk-lib": "^2.0.0-rc.1", "constructs": "^10.0.0" }
// 4 - Add { "aws-cdk-lib": "2.0.0-rc.1", "constructs": "^10.0.0" } to "devDependencies"
const fs = require('fs');

const nullVersionMarker = process.argv[2];
const targetSolutionsConstructsVersion = process.argv[3];

// these versions need to be sourced from a config file
const awsCdkLibVersion = '2.206.0';

for (const file of process.argv.splice(4)) {
  const pkg = JSON.parse(fs.readFileSync(file).toString());

  if (pkg.version !== nullVersionMarker && pkg.version !== targetSolutionsConstructsVersion) {
    throw new Error(`unexpected - all package.json files in this repo should have a version of ${nullVersionMarker} or ${targetSolutionsConstructsVersion}: ${file}`);
  }

  pkg.version = targetSolutionsConstructsVersion;

  pkg.dependencies = updateDependencyVersionNumbers(pkg.dependencies || { });
  pkg.peerDependencies = updateDependencyVersionNumbers(pkg.peerDependencies || { }, '^');
  pkg.devDependencies = updateDependencyVersionNumbers(pkg.devDependencies || { });

  console.error(`${file} => ${targetSolutionsConstructsVersion}`);
  fs.writeFileSync(file, JSON.stringify(pkg, undefined, 2));

}

function updateDependencyVersionNumbers(section, orBetter = '') {  let newdependencies = {};
  for (const [ name, version ] of Object.entries(section)) {
    if (name.startsWith('@aws-solutions-constructs')) {
      newdependencies[name] = version.replace(nullVersionMarker, targetSolutionsConstructsVersion);
    }

    else if (name.startsWith('aws-cdk-lib') || name === '@aws-cdk/integ-tests-alpha') {
      newdependencies[name] = version.replace(nullVersionMarker, awsCdkLibVersion);
    }
    else {
      newdependencies[name] = version;
    }
  }
  return newdependencies;
}
