#!/usr/bin/env node
// It will make following updates to package.json
// 1 - align the version in a package.json file to the version of the repo
// 2 - Remove all entries starting with @aws-cdk/* and constructs from "dependencies": { ... }
// 3 - Remove all entries starting with @aws-cdk/* and constructs from "peerDependencies": { ... }, Add { "aws-cdk-lib": "^2.0.0-rc.1", "constructs": "^10.0.0" }
// 4 - Add { "aws-cdk-lib": "2.0.0-rc.1", "constructs": "^10.0.0" } to "devDependencies"
const fs = require('fs');



for (const file of process.argv.splice(4)) {
  const pkg = JSON.parse(fs.readFileSync(file).toString());

  pkg.dependencies = removeCdkModules(pkg.dependencies || { }, file);
//  pkg.peerDependencies = removeCdkModules(pkg.peerDependencies || { }, file);
//  pkg.devDependencies = removeCdkModules(pkg.devDependencies || { }, file);

  console.error(`updated ${pkg.name}`);
  fs.writeFileSync(file, JSON.stringify(pkg, undefined, 2));

}

function removeCdkModules(section, file) {
  let newdependencies = {};
  for (const [ name, version ] of Object.entries(section)) {
    // Remove all entries starting with @aws-cdk/* and constructs
    if (!name.startsWith('@aws-cdk/')) {
      newdependencies[name] = version;
    }
  }
  newdependencies["constructs"]= '10.0.0';
//  newdependencies["aws-cdk-lib"]= "0.0.0";
  return newdependencies;
}
