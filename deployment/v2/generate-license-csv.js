const reportLocation = process.argv[2];

const packageTree = require(reportLocation);

const packages = packageTree.analyzer.result.packages;

const groupings = new Map();

packages.forEach((pkg) => {
  if (pkg.declared_licenses.length != 1) {
    console.log(`Multiple licenses: ${pkg.id}`);
  }
  pkg.declared_licenses.forEach((license) => {
    if (groupings.has(license)) {
      groupings.get(license).push(pkg.id);
    } else {
      groupings.set(license, [pkg.id]);
    }
  });
});

groupings.forEach((license, key) => {
  license.forEach((pkg) => {
    console.log(`${key},${stripOffNpm(pkg)}`);
  })
});

function stripOffNpm(pkg) {
  return pkg.replace(/^NPM::/, '').replace(/^NPM:/, '');
}
