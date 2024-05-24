#!/bin/bash
set -euo pipefail

deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/../../source"

echo "============================================================================================="
echo "aligning versions and updating package.json for CDK v2..."
/bin/bash $deployment_dir/align-version.sh

bail="--bail"
runtarget="build+lint+test"
cd $source_dir/

export PATH=$source_dir/node_modules/.bin:$PATH
export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"

 npm install -g @aws-cdk/integ-runner

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
echo "reverting back versions and updates to package.json for CDK v2..."
/bin/bash $deployment_dir/align-version.sh revert
