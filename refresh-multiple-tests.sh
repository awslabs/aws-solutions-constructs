# How to use this script
#
# This script will refresh integration tests for multiple
# Solutions Constructs sequentially and unattended. If you're 
# doing a release and have to update many integration tests, this is
# for you.

# Open a docker build environment
# List all the constructs whose integration tests you want to refresh in the
#   export constructs list (you can delete the examples that are there)
# Run this script from the top level aws-solutions-constructs folder.
#
# Options to accelerate
# * adding --no-clean to the cdk-integ command will allow it to 
#   finish without destroying the stack. You can then destroy the stack manually
#   from the console or command line so the stack destruction does not slow the process
# * adding & to the end of the cdk-integ command will execute it asynchronously. This 
#   allows you to refresh MANY constructs' tests simultaneously. Probably good to add
#   a sleep 10 command before the end of the loop to keep from overwhelming CloudFormation

export constructs="
  aws-cloudfront-s3
  aws-fargate-s3
  aws-iot-s3
  aws-kinesisfirehose-s3
  aws-lambda-kendra
  aws-lambda-s3
  aws-openapigateway-lambda
  aws-s3-lambda
  aws-s3-sns
  aws-s3-sqs
  aws-eventbridge-stepfunctions
  aws-s3-stepfunctions
  aws-eventbridge-kinesisfirehose-s3
  aws-kinesisstreams-kinesisfirehose-s3
"

constructs_root_dir=$(cd $(dirname $0) && pwd)
source_dir="$constructs_root_dir/source"

echo "============================================================================================="
echo "aligning versions and updating package.json for CDK v2..."
/bin/bash $constructs_root_dir/align-version.sh

bail="--bail"
runtarget="jsii"
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
  cdk-integ --no-clean &
  sleep 10
  cd $constructs_root_dir/source/patterns/@aws-solutions-constructs
done
cd $constructs_root_dir
./deployment/v2/align-version.sh revert
