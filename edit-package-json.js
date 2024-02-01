#!/usr/bin/env node
// It will make following updates to package.json
// 1 - align the version in a package.json file to the version of the repo
// 2 - Remove all entries starting with @aws-cdk/* and constructs from "dependencies": { ... }
// 3 - Remove all entries starting with @aws-cdk/* and constructs from "peerDependencies": { ... }, Add { "aws-cdk-lib": "^2.0.0-rc.1", "constructs": "^10.0.0" }
// 4 - Add { "aws-cdk-lib": "2.0.0-rc.1", "constructs": "^10.0.0" } to "devDependencies"
const fs = require('fs');



for (const file of process.argv.splice(4)) {
  const pkg = JSON.parse(fs.readFileSync(file).toString());

  pkg.scripts = removeCdkInteg(pkg.scripts || { });

  console.error(`updated ${pkg.name}`);
  fs.writeFileSync(file, JSON.stringify(pkg, undefined, 2));

}

function removeCdkInteg(section) {
  let newScripts = {};
  for (const [ name, version ] of Object.entries(section)) {
    // Remove all entries starting with @aws-cdk/* and constructs
    if (name==="integ-assert") {
      newScripts[name] = "";
    } else {
      newScripts[name] = version;
    }
  }
  return newScripts;
}
