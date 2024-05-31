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
aws-constructs-factories
aws-eventbridge-stepfunctions
aws-fargate-stepfunctions
aws-lambda-stepfunctions
aws-s3-stepfunctions
"

deployment_dir=$(cd $(dirname $0) && pwd)
constructs_root_dir="$deployment_dir/../.."
source_dir="$deployment_dir/../../source"

echo "============================================================================================="
echo "Syncing the version numbers for all packages"
/bin/bash $constructs_root_dir/deployment/v2/align-version.sh

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

npm link

cd $source_dir
echo "============================================================================================="
echo "building..."
time lerna run $bail --stream $runtarget || fail

for construct in $constructs; do

  cd $constructs_root_dir/source/patterns/@aws-solutions-constructs/$construct
  echo Running in $PWD
  integ-runner --update-on-failed --no-clean &
  sleep 10
  cd $constructs_root_dir/source/patterns/@aws-solutions-constructs
done
cd $constructs_root_dir
echo "Reverting version numbers by getting all package.json files from git"
./deployment/v2/align-version.sh revert
