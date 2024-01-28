#!/bin/bash
set -euo pipefail

deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/../../source"

cd $source_dir/

# Align versions in ALL package.json with the one in lerna.json
files=$(find . -name package.json |\
    grep -v node_modules)

${deployment_dir}/edit-package-json.js ${files}
