#!/usr/bin/env node
// It will make following updates to package.json
// 1 - align the version in a package.json file to the version of the repo
// 2 - Remove all entries starting with @aws-cdk/* and constructs from "dependencies": { ... }
// 3 - Remove all entries starting with @aws-cdk/* and constructs from "peerDependencies": { ... }, Add { "aws-cdk-lib": "^2.0.0-rc.1", "constructs": "^10.0.0" }
// 4 - Add { "aws-cdk-lib": "2.0.0-rc.1", "constructs": "^10.0.0" } to "devDependencies"
const fs = require('fs');

const versionPlaceHolder = process.argv[2];
const targetSolutionsConstructsVersion = process.argv[3];

// these versions need to be sourced from a config file
const awsCdkLibVersion = '2.118.0';
const constructsVersion = '10.0.0';
const MODULE_EXEMPTIONS = new Set([
  '@aws-cdk/cloudformation-diff',
  'aws-cdk'
]);

for (const file of process.argv.splice(4)) {
  const pkg = JSON.parse(fs.readFileSync(file).toString());

  if (pkg.version !== versionPlaceHolder && pkg.version !== targetSolutionsConstructsVersion) {
    throw new Error(`unexpected - all package.json files in this repo should have a version of ${versionPlaceHolder} or ${targetSolutionsConstructsVersion}: ${file}`);
  }

  pkg.version = targetSolutionsConstructsVersion;

  pkg.dependencies = updateDependencyVersionNumbers(pkg.dependencies || { });
  pkg.peerDependencies = updateDependencyVersionNumbers(pkg.peerDependencies || { });
  pkg.devDependencies = updateDependencyVersionNumbers(pkg.devDependencies || { });

  // This will be removed in the next PR when we remove cdk-integ
  if (pkg.scripts) {
    pkg.scripts["integ-assert"] = "cdk-integ-assert-v2";
  }

  console.error(`${file} => ${targetSolutionsConstructsVersion}`);
  fs.writeFileSync(file, JSON.stringify(pkg, undefined, 2));

}

function updateDependencyVersionNumbers(section) {  let newdependencies = {};
  for (const [ name, version ] of Object.entries(section)) {
    if (name.startsWith('@aws-solutions-constructs')) {
      newdependencies[name] = version.replace(versionPlaceHolder, targetSolutionsConstructsVersion);
    }
    else if (name.startsWith('aws-cdk-lib')) {
      newdependencies[name] = version.replace(versionPlaceHolder, awsCdkLibVersion);
    }
    else {
      newdependencies[name] = version;
    }
  }
  return newdependencies;
}

// function processDependencies(section) {
//   let newdependencies = {};
//   for (const [ name, version ] of Object.entries(section)) {
//     // Remove all entries starting with @aws-cdk/* and constructs
//     if ((!name.startsWith('@aws-cdk/') && !name.startsWith('constructs'))) {
//       newdependencies[name] = version.replace(versionPlaceHolder, targetSolutionsConstructsVersion);
//     }
//     if (MODULE_EXEMPTIONS.has(name)) {
//       newdependencies[name] = version.replace(versionPlaceHolder, awsCdkLibVersion);
//     }
//   }
//   return newdependencies;
// }

// function processPeerDependencies(section) {
//   let newdependencies = {};
//   for (const [ name, version ] of Object.entries(section)) {
//     // Remove all entries starting with @aws-cdk/* and constructs
//     if ((!name.startsWith('@aws-cdk/') && !name.startsWith('constructs'))) {
//       newdependencies[name] = version.replace(versionPlaceHolder, targetSolutionsConstructsVersion);
//     }
//     if (MODULE_EXEMPTIONS.has(name)) {
//       newdependencies[name] = version.replace(versionPlaceHolder, awsCdkLibVersion);
//     }
//   }
//   newdependencies["aws-cdk-lib"] = `^${awsCdkLibVersion}`;
//   newdependencies["constructs"] = `^${constructsVersion}`;
//   return newdependencies;
// }

// function processDevDependencies(section) {
//   let newdependencies = {};
//   for (const [ name, version ] of Object.entries(section)) {
//     // Remove all entries starting with @aws-cdk/* and constructs
//     if ((!name.startsWith('@aws-cdk/') && !name.startsWith('constructs'))) {
//       newdependencies[name] = version.replace(versionPlaceHolder, targetSolutionsConstructsVersion);
//     }
//     if (MODULE_EXEMPTIONS.has(name)) {
//       newdependencies[name] = version.replace(versionPlaceHolder, awsCdkLibVersion);
//     }
//   }

//   // note: no ^ to make sure we test against the minimum version
//   newdependencies["aws-cdk-lib"] = `${awsCdkLibVersion}`;
//   newdependencies["constructs"] = `^${constructsVersion}`;
//   return newdependencies;
// }
