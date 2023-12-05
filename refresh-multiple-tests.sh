# How to use this script
#
# This script will refresh integration tests for multiple
# Solutions Constructs sequentially and unattended. If you're 
# doing a release and have to update many integration tests, this is
# for you.

# Open a docker build environment
# Run build-patterns.sh through at least the building of core, then you can ctrl-c
# List all the constructs whose integration tests you want to refresh in the
#   export constructs list (you can delete the examples that are there)
# Run this script from the top level aws-solutions-constructs folder.
#
# Advanced use - if you have too many constructs to wait for, you can create
# another copy of this script to run concurrently with a different list of constructs
# 1) Remove the align-version.sh revert lines from this script and the copy
# 2) Remove source allow-partial-builds.sh line from the copy
# 3) Keep any dependencies together and in order 
# (e.g. dynamodbstreams-lambda-elasticsearch must be built AFTER 
# dynamodbstreams-lambda and lambda-elasticsearch)

export constructs="
  aws-kinesisstreams-gluejob
  aws-lambda-s3
"

constructs_root_dir=$(cd $(dirname $0) && pwd)
source_dir="$constructs_root_dir/source"

echo "============================================================================================="
echo "aligning versions and updating package.json for CDK v2..."
/bin/bash $constructs_root_dir/align-version.sh

bail="--bail"
runtarget="build+lint+test"
cd $source_dir/

export PATH=$source_dir/node_modules/.bin:$PATH
export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"

echo "============================================================================================="
echo "installing..."
yarn install --frozen-lockfile

# echo "============================================================================================="
# echo "updating Import statements for CDK v2..."
# /bin/bash $constructs_root_dir/rewrite-imports.sh

echo "============================================================================================="
echo "building cdk-integ-tools..."
cd $source_dir/tools/cdk-integ-tools
npm install
npm run build
npm link

cd $source_dir
echo "============================================================================================="
echo "building..."
time lerna run $bail --stream $runtarget || fail

for construct in $constructs; do

  cd $constructs_root_dir/source/patterns/@aws-solutions-constructs/$construct
  echo Running in $PWD
  npm run jsii && npm run lint
  cdk-integ --no-clean
  npm run build+lint+test
  cd $constructs_root_dir/source/patterns/@aws-solutions-constructs
done
cd $constructs_root_dir
./deployment/v2/align-version.sh revert
