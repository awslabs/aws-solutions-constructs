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
aws-constructs-factories
aws-dynamodbstreams-lambda
aws-fargate-dynamodb
aws-fargate-ssmstringparameter
aws-kinesisstreams-lambda
aws-lambda-dynamodb
aws-lambda-ssmstringparameter
aws-s3-lambda
aws-s3-stepfunctions
aws-sns-sqs
aws-dynamodbstreams-lambda-elasticsearch-kibana
aws-eventbridge-kinesisfirehose-s3
aws-kinesisstreams-kinesisfirehose-s3
"

deployment_dir=$(cd $(dirname $0) && pwd)
constructs_root_dir="$deployment_dir/../.."
source_dir="$deployment_dir/../../source"


export PATH=$source_dir/node_modules/.bin:$PATH
export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"


cd $source_dir
echo "============================================================================================="
echo "building..."

for construct in $constructs; do

  cd $constructs_root_dir/source/patterns/@aws-solutions-constructs/$construct
  echo Running in $PWD
  npm run blt
  cd $constructs_root_dir/source/patterns/@aws-solutions-constructs
done
cd $constructs_root_dir
