#!/bin/bash
set -euo pipefail

deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/../source"

cd $deployment_dir
# Retrieve version numbers for marker and repo
marker=$(node -p "require('./get-version-placeholder')")
repoVersion=$(node -p "require('./get-sc-version')")

cd $source_dir/

# Align versions in ALL package.json with the one in lerna.json
files=$(find . -name package.json |\
    grep -v node_modules)

if [ $# -eq 0 ]; then
    echo "Updating ALL package.json files"
    ${deployment_dir}/align-version.js ${marker} ${repoVersion} ${files}
else
    echo "Reverting back CDK v2 updatesfrom ALL package.json files"
    # Undo the version # updates by refreshing all package.json files with current git contents
    # NOTE - THIS WILL UNDO ALL CHANGES TO PACKAGE.JSON, SO ANY CHANGE YOU WANT TO KEEP MUST
    # BE COMMITTED BEFORE RUNNING build-patterns.sh
    # This command is required ONLY for the local development and it fails in CodePipeline
    if [[ -z "${CODEBUILD_BUILD_ID+x}" ]]; then
        git checkout `find . -name package.json | grep -v node_modules`
    fi
fi