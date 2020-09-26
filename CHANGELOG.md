# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.64.1] - 2020-09-26

### Changed
- Upgraded all patterns to CDK v1.64.1
- Fix for *-S3-* patterns breaking when bucket versioning is turned off ([#80](https://github.com/awslabs/aws-solutions-constructs/issues/80))

## [1.64.0] - 2020-09-24

### Changed
- Upgraded all patterns to CDK v1.64.0
- Fix `aws-cognito-apigateway-lambda` pattern bug with override for `cognitoUserPoolClientProps` ([#71](https://github.com/awslabs/aws-solutions-constructs/issues/71))
- Fix `api-gateway-sqs` pattern bug with override for `createRequestTemplate` ([#69](https://github.com/awslabs/aws-solutions-constructs/issues/69))
- Fix `aws-kinesisfirehose-s3-and-kinesisanalytics` pattern bug with override for `kinesisFirehoseProps` ([#73](https://github.com/awslabs/aws-solutions-constructs/issues/73))
- Fix `aws-cloudfront-apigateway-lambda` pattern bug with override for `apiGatewayProps`
- Fix ALL patterns to use the ARNs with `${cdk.Aws.PARTITION}` partition instead of `aws` ([#67](https://github.com/awslabs/aws-solutions-constructs/issues/67))
- Update `aws-lambda-elasticsearch-kibana` pattern to add an optional construct props to provide Cognito Domain separately ([#54](https://github.com/awslabs/aws-solutions-constructs/issues/54))
- Update ALL S3 patterns to disable versioning for the Logging bucket and apply default lifecycle policy for the versioned buckets ([#44](https://github.com/awslabs/aws-solutions-constructs/issues/44))
- Fix ALL SQS patterns to not create DLQ when user provides the `existingQueueObj`
- Update `aws-sqs-lambda` pattern to allow for overriding `sqsEventSourceProps`

## [1.63.0] - 2020-09-14

### Changed
- Upgraded all patterns to CDK v1.63.0
- BREAKING CHANGE: For `aws-kinesisstreams-lambda` pattern, changed construct prop from `eventSourceProps?: lambda.EventSourceMappingOptions | any` to `kinesisEventSourceProps?: KinesisEventSourceProps`
- Allow for `existingStreamObj?` for `aws-kinesisstreams-lambda` pattern ([#58](https://github.com/awslabs/aws-solutions-constructs/issues/58))

## [1.62.0] - 2020-09-09

### Added
- aws-events-rule-sqs pattern added ([#25](https://github.com/awslabs/aws-solutions-constructs/issues/25))
- aws-events-rule-sns pattern added ([#42](https://github.com/awslabs/aws-solutions-constructs/issues/42))
- aws-apigateway-kinesisstreams pattern added ([#51](https://github.com/awslabs/aws-solutions-constructs/issues/51))

### Changed
- Upgraded all patterns to CDK v1.62.0

## [1.61.1] - 2020-09-01

### Added
- aws-sns-sqs pattern added ([#24](https://github.com/awslabs/aws-solutions-constructs/issues/24))

### Changed
- Upgraded all patterns to CDK v1.61.1
- [All *-sns-*  Patterns] Allow for existingTopicObj and change default encryption ([#49](https://github.com/awslabs/aws-solutions-constructs/issues/49))

## [1.61.0] - 2020-08-27

### Changed
- Upgraded all patterns to CDK v1.61.0
- [All *-lambda-* and *-apigateway-* patterns] Enable X-Ray tracing ([#36](https://github.com/awslabs/aws-solutions-constructs/issues/36))

## [1.60.0] - 2020-08-24

### Changed
- Upgraded all patterns to CDK v1.60.0

## [1.59.0] - 2020-08-19

### Changed
- Upgraded all patterns to CDK v1.59.0

## [1.58.0] - 2020-08-14

### Changed
- Upgraded all patterns to CDK v1.58.0
- Fix `aws-apigateway-sqs` pattern bug with overriding `apiGatewayProps` ([#37](https://github.com/awslabs/aws-solutions-constructs/issues/37))
- Updated `aws-cloudfront-apigateway` and `aws-cloudfront-apigateway-lambda` patterns to deploy unauthenticated APIs
- [All *-dynamodb-* patterns] Enable continuous backups and point-in-time recovery for DynamoDB Table ([#35](https://github.com/awslabs/aws-solutions-constructs/issues/35))
- Removed the default Cognito UserPool SMS role creation ([#9513](https://github.com/aws/aws-cdk/pull/9513))

## [1.57.0] - 2020-08-07

### Changed
- Upgraded all patterns to CDK v1.57.0
- Use `s3.IBucket` type instead of `s3.Bucket` for `existingBucketObj` construct props ([#33](https://github.com/awslabs/aws-solutions-constructs/issues/33))

## [1.56.0] - 2020-08-05

### Changed
- Upgraded all patterns to CDK v1.56.0

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