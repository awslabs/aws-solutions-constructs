#!/bin/bash
set -euo pipefail

deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/../../source"

echo "============================================================================================="
echo "aligning versions and updating package.json for CDK v2..."

bail="--bail"
runtarget="asciidoc"
cd $source_dir/

export PATH=$source_dir/node_modules/.bin:$PATH
export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"

echo "============================================================================================="
echo "building..."
npx nx run-many -t asciidoc --parallel=12 --output-style=static

