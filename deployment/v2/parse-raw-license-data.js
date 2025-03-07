// This script parses the JSON output of  npm-license-crawler, filtering out
// entries for  the constructs  themselved, then creating a list of libraries found
// along with the specific license.

// If any BlueOak licenses are found, this will append
// a specific BlueOak requirement at the end of the list

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

const blueOakPackages = new Array();
console.log(`\n*******************\nLicenses found in this list:\n*******************`);
groupings.forEach((license, key) => {
  console.log(`${key}`);
});

groupings.forEach((license, key) => {
  console.log(`\n*******************\nLicense: ${key}\n*******************`);
  license.forEach((pkg) => {
    console.log(`${key}: ${pkg}`);
    if (key.match(/BlueOak/)) {
      blueOakPackages.push(pkg);
    }
  })
});
console.log(`\nTotal libraries: ${libCount}\n`);

// Only the main library has Blue Oak issues, don't
// call this for use cases or the validations will fail
// (and if a BlueOak license appears in a use case, this
// will catch it and fail)
if (blueOakPackages.length > 0) {
  CheckAndLogBlueOakLicenses(blueOakPackages);
}

// ***********************
// Functions
// ***********************

// Checks that we received the 3 BlueOak licenses we expected
// and add the BlueOak attribution to the output. This is our
// check to ensure we catch any changes in BlueOak licenses in
// the future
function CheckAndLogBlueOakLicenses(packages) {

  const versionPlaceholder = '[version-tag]';

  const blueOakHeader=`*******************
Specific Blue Oak License attributions
*******************\n`;

  const jackspeakTemplate=`—— Jackspeak @ ${versionPlaceholder} ———
Copyright Isaac Z. Schlueter <i@izs.me>
https://github.com/isaacs/jackspeak
Blue Oak Model License - https://blueoakcouncil.org/license/1.0.0\n`;

  const packageTemplate = `—— package-json-from-dist @ ${versionPlaceholder} ———
Copyright Isaac Z. Schlueter <i@izs.me>
https://github.com/isaacs/package-json-from-dist
Blue Oak Model License - https://blueoakcouncil.org/license/1.0.0\n`;

  const scurryTemplate = `—— path-scurry @ ${versionPlaceholder} ———
Copyright Isaac Z. Schlueter <i@izs.me>
https://github.com/isaacs/path-scurry
Blue Oak Model License - https://blueoakcouncil.org/license/1.0.0\n`;

  console.log(blueOakHeader);
  if (packages.length != 3) {
    throw new Error(`BlueOak Licenses have changed ${packages.length}`);
  }
  packages.forEach((package) => {
    const PackageVersionPair = package.split('@');
    if (PackageVersionPair.length != 2) {
      throw new Error(`Unexpected package version pair: ${package}`);
    }
    if (PackageVersionPair[0] == 'jackspeak') {
      console.log(jackspeakTemplate.replace(versionPlaceholder, PackageVersionPair[1]));
    } else if (PackageVersionPair[0] == 'package-json-from-dist') {
      console.log(packageTemplate.replace(versionPlaceholder, PackageVersionPair[1]));
    } else if (PackageVersionPair[0] == 'path-scurry') {
      console.log(scurryTemplate.replace(versionPlaceholder, PackageVersionPair[1]));
    } else {
      throw new Error(`New BlueOak License Found: ${package}`);
    }
  });
}