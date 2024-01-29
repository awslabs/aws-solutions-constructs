#!/bin/bash
set -euo pipefail

deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/../../source"

cd $source_dir/

# Assemble a collection of all package.json file folder/names
files=$(find . -name package.json |\
    grep -v node_modules)

# Pass the collection of package.json files to be processed
${deployment_dir}/edit-package-json.js ${files}
