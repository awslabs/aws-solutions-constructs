// This script parses the JSON output of  npm-license-crawler, filtering out
// entries for  the constructs  themselved, then creating a list of libraries found
// along with the specific license.

// The output file  of npm-license-crawler is should be passed
// as an input.
const reportLocation = process.argv[2];

const packageTree = require(reportLocation);

const groupings = new Map();

var libCount = 0;
for (const library in packageTree) {
  if (library.match('aws-solutions-constructs')) {
    // Our own libraries are not included third party libraries
    continue;
  }
  var licenses = packageTree[library].licenses;
  libCount++;
  if (groupings.has(licenses)) {
    groupings.get(licenses).push(library);
  } else {
    groupings.set(licenses, [library]);
  }
}

console.log(`\n*******************\nLicenses found in this list:\n*******************`);
groupings.forEach((license, key) => {
  console.log(`${key}`);
});

groupings.forEach((license, key) => {
  console.log(`\n*******************\nLicense: ${key}\n*******************`);
  license.forEach((pkg) => {
    console.log(`${key}: ${pkg}`);
  })
});
console.log(`\nTotal libraries: ${libCount}\n`);
