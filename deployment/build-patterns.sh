#!/bin/bash
echo    !!!!!!!!!!!!!!!!!!!!
echo
echo Building V1 from the main branch is deprecated.
echo
echo Run ./deployment/v2/build-patterns.sh to do a V2 build
echo
exit 1

set -euo pipefail

deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/../source"

echo "============================================================================================="
echo "aligning versions..."
/bin/bash $deployment_dir/align-version.sh

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

echo "============================================================================================="
echo "packaging..."
time lerna run --bail --stream jsii-pacmak || fail

echo "============================================================================================="
echo "reverting back versions..."
/bin/bash $deployment_dir/align-version.sh revert