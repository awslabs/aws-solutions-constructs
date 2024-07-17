#!/bin/bash
#!/bin/bash
set -euo pipefail

starting_dir=$PWD
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
npm install -g aws-cdk

echo "============================================================================================="
echo "installing..."
yarn install --frozen-lockfile

cd $starting_dir
