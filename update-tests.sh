export constructs="
aws-eventbridge-stepfunctions
aws-events-rule-step-function
aws-kinesisfirehose-s3
aws-kinesisfirehose-s3-and-kinesisanalytics
aws-kinesisstreams-gluejob
aws-kinesisstreams-kinesisfirehose-s3
aws-kinesisstreams-lambda
aws-lambda-dynamodb
aws-lambda-elasticsearch-kibana
aws-lambda-stepfunctions
aws-lambda-step-function
aws-s3-stepfunctions
aws-s3-step-function
aws-sqs-lambda
"

deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/source"

./deployment/align-version.sh
cd source
export PATH=$(npm bin):$PATH

for construct in $constructs; do
  cd $deployment_dir/source/patterns/@aws-solutions-constructs/$construct
  npm run jsii && npm run build
  cdk-integ
  npm run snapshot-update
done
