#!/bin/bash
set -euo pipefail

deployment_dir="$PWD"
source_dir="$deployment_dir/../source"

echo "============================================================================================="
echo "building cdk-integ-tools..."
cd $source_dir/tools/cdk-integ-tools
npm install
npm run build
npm link

bail="--bail"
runtarget="build+lint+test"
cd $source_dir/

export PATH=$(npm bin):$PATH
export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"

echo "============================================================================================="
echo "installing..."
yarn install --frozen-lockfile

echo "============================================================================================="
echo "building..."
time lerna run $bail --stream $runtarget || fail
