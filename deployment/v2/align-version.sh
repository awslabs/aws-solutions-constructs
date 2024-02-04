#!/bin/bash
set -euo pipefail

deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/../../source"

cd $deployment_dir
# Retrieve version numbers for nullVersionMarker and Solutions Constructs
nullVersionMarker=$(node -p "require('./get-version-placeholder')")
scRepoVersion=$(node -p "require('./get-sc-version')")

cd $source_dir/

# Align versions in ALL package.json with the one in lerna.json
files=$(find . -name package.json |\
    grep -v node_modules)

if [ $# -eq 0 ]; then
    echo "Syncing the version numbers for all packages"
    ${deployment_dir}/align-version.js ${nullVersionMarker} ${scRepoVersion} ${files}
else
    echo "Reverting version numbers by getting all package.json files from git"
    # This command is required ONLY for the local development and it fails in CodePipeline
    if [[ -z "${CODEBUILD_BUILD_ID+x}" ]]; then
        git checkout `find . -name package.json | grep -v node_modules`
    fi
fi