#!/bin/bash
set -euo pipefail

deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/../../source"

echo "============================================================================================="
echo "aligning versions and updating package.json for CDK v2..."
/bin/bash $deployment_dir/align-version.sh

echo "============================================================================================="
echo "building aws-cdk-migration..."
cd $source_dir/tools/aws-cdk-migration
npm install
npm run build
npm link

bail="--bail"
runtarget="build+lint+test"
cd $source_dir/

export PATH=$(npm bin):$PATH
export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"

echo "============================================================================================="
echo "Migrating TypeScript import statements from modular CDK (i.e. @aws-cdk/aws-s3) to aws-cdk-lib (i.e. aws-cdk-lib)"
cd $source_dir/
for subdir in $source_dir/patterns/\@aws-solutions-constructs/* ; do
  if [ -d "$subdir" -a `basename $subdir` != "node_modules" ]; then
    echo $subdir
    rewrite-imports-v2 $subdir/**/*.ts
  fi
done

echo "============================================================================================="
echo "building cdk-integ-tools..."
cd $source_dir/tools/cdk-integ-tools
npm install
npm run build
npm link

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

echo "============================================================================================="
echo "reverting back TypeScript import statements for CDK v2..."
git checkout `find . -name *.ts | grep -v node_modules | grep -v **/*.d.ts`