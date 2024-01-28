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
version=${1:-prerelease}
deployment_dir=$(cd $(dirname $0) && pwd)

echo "Starting ${version} version bump"
echo "Loading ${deployment_dir}/get-sc-version"

# # Rename CHANGELOG.md
# echo "Rename CHANGELOG.md to CHANGELOG.md.bak"
# mv CHANGELOG.md CHANGELOG.md.bak
# echo "Rename CHANGELOG.v2.md to CHANGELOG.md"
# mv CHANGELOG.v2.md CHANGELOG.md

# # Rename lerna.json
# echo "Rename source/lerna.json to source/lerna.json.bak"
# mv source/lerna.json source/lerna.json.bak
# echo "Rename source/lerna.v2.json to  source/lerna.json"
# mv source/lerna.v2.json source/lerna.json

# `standard-version` will -- among other things -- create the changelog.
# However, on the v2 branch, `conventional-changelog` (which `standard-release` uses) gets confused
# and creates really muddled changelogs with both v1 and v2 releases intermingled, and lots of missing data.
# A super HACK here is to locally remove all version tags that don't match this major version prior
# to doing the bump, and then later fetching to restore those tags.
# BiffNote - it's unclear whether this is still required now that Main is V2 only...
git tag -d `git tag -l | grep -v '^v2.'`

# Generate CHANGELOG and create a commit
npx standard-version --release-as ${version}

# fetch back the tags, and only the tags, removed locally above
git fetch origin "refs/tags/*:refs/tags/*"

# # Restore CHANGELOG.md
# echo "Rename CHANGELOG.md to CHANGELOG.v2.md"
# mv CHANGELOG.md CHANGELOG.v2.md
# echo "Rename CHANGELOG.md.bak to CHANGELOG.md"
# mv CHANGELOG.md.bak CHANGELOG.md

# # Restore lerna.json
# echo "Rename source/lerna.json to source/lerna.v2.json"
# mv source/lerna.json source/lerna.v2.json
# echo "Rename source/lerna.json.bak to source/lerna.json"
# mv source/lerna.json.bak source/lerna.json

# Disabled the autocommit of 'standard-version' due to faulty CHANGELOG.md updates during CDK v2  build
# and hence need to run git add/commit commands outside of 'standard-version'
repoVersion=$(node -p "require('${deployment_dir}/get-sc-version')")
echo "repoVersion=${repoVersion}"

git add source/lerna.json
git add CHANGELOG.md
git commit -m "chore(release): ${repoVersion}"