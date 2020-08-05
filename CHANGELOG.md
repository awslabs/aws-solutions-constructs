# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.55.0] - 2020-08-05

### Changed
- Upgraded all patterns to CDK v1.55.0

## [1.54.0] - 2020-07-31

### Changed
- Upgraded all patterns to CDK v1.54.0
- Enforce encryption of data in transit for Amazon S3, Amazon SQS and Amazon SNS ([#28](https://github.com/awslabs/aws-solutions-constructs/issues/28))
- Upgrade deprecated CDK property used by API Gateway patterns ([#31](https://github.com/awslabs/aws-solutions-constructs/issues/31))
- Fix for CloudFrontDistributionForApiGateway bug ([#30](https://github.com/awslabs/aws-solutions-constructs/issues/30))

## [1.53.0] - 2020-07-27

### Added
- aws-lambda-sqs-lambda pattern added

### Changed
- Upgraded all patterns to CDK v1.53.0
- Expose all cdk objects created by the construct as pattern properties

## [1.52.0] - 2020-07-20

### Added
- aws-lambda-sqs pattern added

### Changed
- Upgraded all patterns to CDK v1.52.0

## [1.51.0] - 2020-07-13

### Changed
- Upgraded all patterns to CDK v1.51.0

## [1.50.0] - 2020-07-09

### Changed
- Upgraded all patterns to CDK v1.50.0

## [1.49.0] - 2020-07-09

### Changed
- Upgraded all patterns to CDK v1.49.0
- BREAKING CHANGE: Removed `deployLambda` and `deployBucket` from all patterns Construct Props
- Added `tablePermissions` to aws-lambda-dynamodb & aws-iot-lambda-dynamodb for fine-grained table permissions to grant to the lambda function

## [1.48.0] - 2020-07-06

### Added
- aws-lambda-step-function pattern added

### Changed
- Upgraded all patterns to CDK v1.48.0
- Fix for aws-sqs-lambda pattern bug when using FIFO queue ([#13](https://github.com/awslabs/aws-solutions-constructs/pull/13))
- Minor updates to CONTRIBUTING.md and deployment/build-patterns.sh

## [1.47.0] - 2020-06-25

### Changed
- Upgraded all patterns to CDK v1.47.0
- Adding ability to provide a dynamodb table ([#8](https://github.com/awslabs/aws-solutions-constructs/pull/8))
- Fix bug in s3BucketWithLogging function ([#9](https://github.com/awslabs/aws-solutions-constructs/pull/9))

## [1.46.0] - 2020-06-22

General Availability of the AWS Solutions Constructs!! 🎉🎉🥂🥂🍾🍾

### Added
- aws-events-rule-step-function pattern added
- aws-s3-step-function pattern added
- Renamed the Github repo and NPM, PyPi & Maven namespaces to AWS Solutions Constructs

### Changed
- Upgraded all patterns to CDK v1.46.0
- Changed the default encryption setting for Amazon SQS & Amazon Kinesis to use AWS Managed KMS Key
- Updated READMEs for all patterns to include Default settings section
- For all patterns, converted the getter methods to properties; used for retrieving the underlying AWS Resource object(s) created by the Solutions Constructs

## [0.8.1-beta] - 2020-05-21
### Changed
- Upgraded to CDK v1.40.0
- Ability to emit a warning to the console when a prescriptive default value is overridden by the user
- Automatic injection of best practice HTTP security headers in all HTTP responses from cloudfront
- Fix the Cfn Nag warning Cloudfront should use minimum protocol version TLS 1.2 (W70)

## [0.8.0-beta] - 2020-03-31
### Added
- Initial public beta release
- aws-apigateway-dynamodb pattern added
- aws-apigateway-lambda pattern added
- aws-apigateway-sqs pattern added
- aws-cloudfront-apigateway-lambda pattern added
- aws-cloudfront-apigateway pattern added
- aws-cloudfront-s3 pattern added
- aws-cognito-apigateway-lambda pattern added
- aws-dynamodb-stream-lambda-elasticsearch-kibana pattern added
- aws-dynamodb-stream-lambda pattern added
- aws-events-rule-lambda pattern added
- aws-iot-kinesisfirehose-s3 pattern added
- aws-iot-lambda-dynamodb pattern added
- aws-iot-lambda pattern added
- aws-kinesisfirehose-s3-and-kinesisanalytics pattern added
- aws-kinesisfirehose-s3 pattern added
- aws-kinesisstreams-lambda pattern added
- aws-lambda-dynamodb pattern added
- aws-lambda-elasticsearch-kibana pattern added
- aws-lambda-s3 pattern added
- aws-lambda-sns pattern added
- aws-s3-lambda pattern added
- aws-sns-lambda pattern added
- aws-sqs-lambda pattern added
- core pattern added