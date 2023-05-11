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
  aws-lambda-elasticsearch-kibana
  aws-lambda-opensearch
  aws-fargate-opensearch
  aws-dynamodbstreams-lambda-elasticsearch-kibana
"

# deployment_dir is top level aws-solutions-constructs
deployment_dir=$(cd $(dirname $0) && pwd)

source ./deployment/v2/allow-partial-builds.sh
for construct in $constructs; do

  cd $deployment_dir/source/patterns/@aws-solutions-constructs/$construct
  echo Running in $PWD
  npm run jsii && npm run lint
  cdk-integ
  npm run build+lint+test
  cd $deployment_dir/source/patterns/@aws-solutions-constructs
done
cd $deployment_dir
./deployment/v2/align-version.sh revert
