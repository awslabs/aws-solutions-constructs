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
aws-lambda-elasticsearch-kibana
aws-constructs-factories
aws-cloudfront-s3
aws-openapigateway-lambda
aws-fargate-secretsmanager
aws-cloudfront-oai-s3
aws-apigateway-dynamodb
aws-apigateway-kinesisstreams
aws-lambda-kinesisstreams
aws-cloudfront-mediastore
aws-fargate-kinesisstreams
aws-lambda-opensearch
aws-s3-sns
aws-lambda-bedrockinferenceprofile
aws-lambda-eventbridge
aws-lambda-s3
aws-s3-sqs
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