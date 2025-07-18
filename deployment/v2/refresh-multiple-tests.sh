# How to use this script
#
# This script will refresh integration tests for all
# Solutions Constructs sequentially and unattended. If you're 
# doing a release and have to update many integration tests, this is
# for you.
#
# The account where you run this must have the following quota increases:
#
# VPC: VPCs per Region: 250
# VPC: NAT Gateways per Availability Zone: 50
# EC2: VPC Elastic IP Addresses: 100
# VPC: Gateway VPC endpoints per Region: 100
# VPC: Interface VPC endpoints per VPC: 150

export constructs="
aws-alb-fargate
aws-alb-lambda
aws-apigateway-dynamodb
aws-apigateway-iot
aws-apigateway-kinesisstreams
aws-apigateway-lambda
aws-apigateway-sagemakerendpoint
aws-apigateway-sqs
aws-cloudfront-apigateway
aws-cloudfront-apigateway-lambda
aws-cloudfront-s3
aws-cloudfront-oai-s3
aws-cognito-apigateway-lambda
aws-constructs-factories
aws-dynamodbstreams-lambda
aws-dynamodbstreams-lambda-elasticsearch-kibana
aws-eventbridge-kinesisfirehose-s3
aws-eventbridge-kinesisstreams
aws-eventbridge-lambda
aws-eventbridge-sns
aws-eventbridge-sqs
aws-eventbridge-stepfunctions
aws-fargate-dynamodb
aws-fargate-eventbridge
aws-fargate-kinesisfirehose
aws-fargate-kinesisstreams
aws-fargate-opensearch
aws-fargate-s3
aws-fargate-secretsmanager
aws-fargate-sns
aws-fargate-sqs
aws-fargate-ssmstringparameter
aws-fargate-stepfunctions
aws-iot-kinesisfirehose-s3
aws-iot-kinesisstreams
aws-iot-lambda
aws-iot-lambda-dynamodb
aws-iot-s3
aws-iot-sqs
aws-kinesisfirehose-s3
aws-kinesisstreams-gluejob
aws-kinesisstreams-kinesisfirehose-s3
aws-kinesisstreams-lambda
aws-lambda-bedrockinferenceprofile
aws-lambda-dynamodb
aws-lambda-elasticachememcached
aws-lambda-elasticsearch-kibana
aws-lambda-eventbridge
aws-lambda-kendra
aws-lambda-kinesisfirehose
aws-lambda-kinesisstreams
aws-lambda-opensearch
aws-lambda-s3
aws-lambda-sagemakerendpoint
aws-lambda-secretsmanager
aws-lambda-sns
aws-lambda-sqs
aws-lambda-sqs-lambda
aws-lambda-ssmstringparameter
aws-lambda-stepfunctions
aws-openapigateway-lambda
aws-route53-alb
aws-route53-apigateway
aws-s3-lambda
aws-s3-sns
aws-s3-sqs
aws-s3-stepfunctions
aws-sns-lambda
aws-sns-sqs
aws-sqs-lambda
aws-wafwebacl-alb
aws-wafwebacl-apigateway
aws-wafwebacl-appsync
aws-wafwebacl-cloudfront
aws-apigatewayv2websocket-sqs
resources
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
npm install --legacy-peer-deps

# echo "============================================================================================="
# echo "updating Import statements for CDK v2..."
# /bin/bash $constructs_root_dir/rewrite-imports.sh

npm link

cd $source_dir
echo "============================================================================================="
echo "building..."
npx nx run-many -t $runtarget --parallel=12 --output-style=static

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