#!/bin/bash
# --------------------------------------------------------------------------------------------------
#
# This script is intended to be used to bump the version of the CDK modules, update package.json,
# package-lock.json, and create a commit.
#
# to start a version bump, run:
#     bump.sh <version | version Type>
#
# If a version is not provided, the 'minor' version will be bumped.
# The version can be an explicit version _or_ one of:
# 'major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', or 'prerelease'.
#
# --------------------------------------------------------------------------------------------------
set -euo pipefail
version=${1:-minor}
deployment_dir=$(cd $(dirname $0) && pwd)

echo "Starting ${version} version bump"

# Generate CHANGELOG and create a commit
npx standard-version --release-as ${version}

# Disabled the autocommit of 'standard-version' due to faulty CHANGELOG.md updates during CDK v2  build
# and hence need to run git add/commit commands outside of 'standard-version'
repoVersion=$(node -p "require('${deployment_dir}/get-version')")
echo "repoVersion=${repoVersion}"

git add source/lerna.json
git add CHANGELOG.md
git commit -m "chore(release): ${repoVersion}"