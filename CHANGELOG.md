# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.103.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.102.0...v1.103.0) (2021-05-21)

### Changed

* Upgraded all patterns to CDK v1.103.0

## [1.102.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.101.0...v1.102.0) (2021-05-20)

### Changed

* Upgraded all patterns to CDK v1.102.0
* Fixed key name typo on aws-kinesisstreams-gluejob [#185](https://github.com/awslabs/aws-solutions-constructs/pull/185)
* BREAKING CHANGE: Added a check for redundant Prop values. If you send an existing resource and props for a new resource, the construct will now throw an error. In the past it ignored one of the values. Will only be a problem if you depended upon the earlier behavior. [#177](https://github.com/awslabs/aws-solutions-constructs/pull/177)
* BREAKING CHANGE: Updated Sagemaker integration tests to create stacks via cdk-integ. This may affect some snapshot based integration tests. [172](https://github.com/awslabs/aws-solutions-constructs/pull/172/files)

### Added

* **aws-lambda-ssm-string-parameter:** New aws-lambda-ssm-string-parameter pattern implementation ([#64](https://github.com/awslabs/aws-solutions-constructs/issues/64)) ([#175](https://github.com/awslabs/aws-solutions-constructs/issues/175)) ([b0567e4](https://github.com/awslabs/aws-solutions-constructs/commit/b0567e4bd5f5204c7441a4036fdd8b8aa2472975))

## [1.101.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.100.0...v1.101.0) (2021-05-07)

### Changed
- Upgraded all patterns to CDK v1.101.0

### Added
- aws-lambda-secrets-manager pattern added ([#162](https://github.com/awslabs/aws-solutions-constructs/pull/162))

## [1.100.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.99.0...v1.100.0) (2021-04-28)

### Changed
- Upgraded all patterns to CDK v1.100.0
- BREAKING CHANGE: Fixed issue with refreshing Integration Tests leaving Resources Behind in Account ([#164](https://github.com/awslabs/aws-solutions-constructs/pull/164))

## [1.99.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.98.0...v1.99.0) (2021-04-22)

### Changed
- Upgraded all patterns to CDK v1.99.0
- Fixed CloudWatch Log Policy Size in Step Functions construct ([#160](https://github.com/awslabs/aws-solutions-constructs/pull/160))

## 1.98.0 (2021-04-16)

### Changed
- Upgraded all patterns to CDK v1.98.0
- Added VPC support to aws-lambda-dynamodb ([#148](https://github.com/awslabs/aws-solutions-constructs/issues/148))
- Documentation correction ([#158](https://github.com/awslabs/aws-solutions-constructs/pull/158))

## 1.97.0 (2021-04-14)

### Changed
- Upgraded all patterns to CDK v1.97.0
- Made changes to accomodate cfn_nag rule W92
- Updated integration tests to destroy S3 buckets when tearing down the test stack

## 1.96.0 (2021-04-07)

### Changed
- Upgraded all patterns to CDK v1.96.0
- Made changes to accomodate cfn_nag rules W89 and W90

## 1.95.2 (2021-04-03)

### Changed
- Upgraded all patterns to CDK v1.95.2

## 1.95.1 (2021-04-02)

### Changed
- Upgraded all patterns to CDK v1.95.1

## 1.95.0 (2021-04-02)

### Changed
- Upgraded all patterns to CDK v1.95.0

## 1.94.1 (2021-04-02)

### Changed
- Upgraded all patterns to CDK v1.94.1

## 1.94.0 (2021-04-01)

### Changed
- Upgraded all patterns to CDK v1.94.0
- Documentation changes in minimal deployment examples ([#94](https://github.com/awslabs/aws-solutions-constructs/issues/94))
- Documentation changes in Python code in Walkthroughs
- Fixed alarm threshold for Elasticsearch constructs ([#153](https://github.com/awslabs/aws-solutions-constructs/issues/153))

## 1.93.0 (2021-03-19)

### Changed
- Upgraded all patterns to CDK v1.93.0

## 1.92.0 (2021-03-19)

### Changed
- Upgraded all patterns to CDK v1.92.0
- Altered aws-cognito-apigateway-lambda construct integration test to clean up user pool
- Fixed jsii output location for aws-lambda-sagemakerendpoint Java tar files

## 1.91.0 (2021-03-14)

### Changed
- Upgraded all patterns to CDK v1.91.0

## 1.90.1 (2021-03-05)

### Changed
- Upgraded all patterns to CDK v1.90.1
- Allow clients to specify names of Lambda environment variable ([#132](https://github.com/awslabs/aws-solutions-constructs/issues/132))
- Minor documentation updates

## 1.90.0 (2021-03-01)

### Changed
- Upgraded all patterns to CDK v1.90.0

## 1.89.0 (2021-02-23)

### Changed
- Upgraded all patterns to CDK v1.89.0
- Fixed aws-kinesisfirehose-s3 to populate bucket property ([#133](https://github.com/awslabs/aws-solutions-constructs/issues/133))

## 1.88.0 (2021-02-22)

### Added
- aws-lambda-sagemakerendpoint pattern added ([#111](https://github.com/awslabs/aws-solutions-constructs/issues/111))

### Changed
- Upgraded all patterns to CDK v1.88.0

## 1.87.1 (2021-02-22)

### Changed
- Upgraded all patterns to CDK v1.87.1
- Implemented SSE where appropriate on Firehose-S3 patterns
- Updated integration tests to not depend upon specific buckets

## 1.87.0 (2021-02-12)

### Changed
- Upgraded all patterns to CDK v1.87.0

## 1.86.0 (2021-02-12)

### Added
- aws-kinesisstreams-gluejob pattern added ([#40](https://github.com/awslabs/aws-solutions-constructs/issues/40))

### Changed
- Upgraded all patterns to CDK v1.86.0
- Create security-group-helper.ts to consolidate security group code

## 1.85.0 (2021-02-05)

### Changed
- Upgraded all patterns to CDK v1.85.0
- Updated READMEs for all `aws-cloudfront-*` patterns to address ([#127](https://github.com/awslabs/aws-solutions-constructs/issues/127))
- Fixed the bug related to lambda permission name collision when chaining two constructs that require to add LambdaInvokePermission

## 1.84.0 (2021-01-29)

### Changed
- Upgraded all patterns to CDK v1.84.0
- Updated `aws-lambda-sns` and `aws-lambs-s3` to support for VPC
- Added [Design Guidelines](./DESIGN_GUIDELINES.md)
ß
## 1.83.0 (2021-01-21)

### Changed
- Upgraded all patterns to CDK v1.83.0

## 1.82.0 (2021-01-21)

### Changed
- Upgraded all patterns to CDK v1.82.0
- Fixed the issue related to Cfn Nag warnings related to CloudWatchLogs for all patterns ([#121](https://github.com/awslabs/aws-solutions-constructs/issues/121))

## 1.81.0 (2021-01-14)

### Changed
- Upgraded all patterns to CDK v1.81.0
- Fixed the issue related to adding custom lambda@edge removes insertHttpSecurityHeaders lambda@edge for all `aws-cloudfront-*` patterns ([#114](https://github.com/awslabs/aws-solutions-constructs/issues/114))

## 1.80.0 (2021-01-11)

### Changed
- Upgraded all patterns to CDK v1.80.0
- Fixed the `allowReadOperation` override bug for `aws-apigateway-dynamodb` pattern ([#115](https://github.com/awslabs/aws-solutions-constructs/issues/115))
- Updated `vpc-defaults.ts` and `vpc-helper.ts` in `core` to allow different default VPCs

## 1.79.0 (2020-12-31)

### Changed
- Upgraded all patterns to CDK v1.79.0
- Fixed the override warning bug for `aws-lambda-step-function` pattern ([#108](https://github.com/awslabs/aws-solutions-constructs/issues/108))
- Updated `aws-lambda-sqs` construct props `existingVpc` from `ec2.Vpc` to `ec2.IVpc`

## 1.78.0 (2020-12-22)

### Changed
- Upgraded all patterns to CDK v1.78.0
- Allow for `existingTableObj?` for `aws-apigateway-dynamodb` pattern ([#53](https://github.com/awslabs/aws-solutions-constructs/issues/53))
- Updated `aws-cloudfront-apigateway-*` and `aws-cloudfront-mediastore` patterns due to CDK v1.78.0 breaking change: `cloudfront-origins: Default minimum origin SSL protocol for HttpOrigin and LoadBalancerOrigin changed from SSLv3 to TLSv1.2.`

## 1.77.0 (2020-12-16)

### Added
- aws-cloudfront-mediastore pattern added ([#104](https://github.com/awslabs/aws-solutions-constructs/issues/104))
- aws-s3-sqs pattern added ([#27](https://github.com/awslabs/aws-solutions-constructs/issues/27))

### Changed
- Upgraded all patterns to CDK v1.77.0

## 1.76.0 (2020-12-14)

### Changed
- Upgraded all patterns to CDK v1.76.0
- Added ESLint rule to enfore 2 space indentation
- Updated `aws-lambda-sqs` to support for VPC

## 1.75.0 (2020-12-03)

### Changed
- Upgraded all patterns to CDK v1.75.0
- Updated `lambda-helper` in `core` to grant Vpc permissions for the lambda role, if required by the lambda function

## 1.74.0 (2020-11-17)

### Changed
- Upgraded all patterns to CDK v1.74.0

## 1.73.0 (2020-11-11)

### Changed
- Upgraded all patterns to CDK v1.73.0
- Removed aws-lambda-sagemaker pattern from the library

## 1.72.0 (2020-11-09)

### Changed
- Upgraded all patterns to CDK v1.72.0
- Fix ALL lambda patterns to allow for disabling the X-ray tracing ([#95](https://github.com/awslabs/aws-solutions-constructs/issues/95))
- Fix `aws-apigateway-sqs` pattern to override AllowReadOperation to false ([#100](https://github.com/awslabs/aws-solutions-constructs/pull/100/))

## 1.71.0 (2020-10-30)

### Changed
- Upgraded all patterns to CDK v1.71.0

## 1.70.0 (2020-10-26)

### Added
- aws-events-rule-kinesisstreams pattern added ([#59](https://github.com/awslabs/aws-solutions-constructs/issues/59))
- aws-events-rule-kinesisfirehose-s3 pattern added ([#72](https://github.com/awslabs/aws-solutions-constructs/issues/72))
- aws-lambda-sagemaker pattern added ([#23](https://github.com/awslabs/aws-solutions-constructs/issues/23))

### Changed
- Upgraded all patterns to CDK v1.70.0

## 1.69.0 (2020-10-21)

### Changed
- Upgraded all patterns to CDK v1.69.0
- BREAKING CHANGE: Updated `aws-events-rule-sns` and `aws-events-rule-sqs` patterns to use pascal case for class and interface names

## 1.68.0 (2020-10-16)

### Added
- aws-kinesisstreams-kinesisfirehose-s3 pattern added ([#74](https://github.com/awslabs/aws-solutions-constructs/issues/74))
- aws-apigateway-sagemakerendpoint pattern added ([#75](https://github.com/awslabs/aws-solutions-constructs/issues/75))

### Changed
- Upgraded all patterns to CDK v1.68.0
- BREAKING CHANGE: For All `aws-cloudfront-*` patterns, changed the underlying CloudFront L2 construct from `CloudFrontWebDistribution` to `Distribution`

## 1.67.0 (2020-10-09)

### Changed
- Upgraded all patterns to CDK v1.67.0
- Make CloudWatch alarm creation optional ([#85](https://github.com/awslabs/aws-solutions-constructs/issues/85))

## 1.66.0 (2020-10-06)

### Added
- aws-apigateway-iot pattern added ([#61](https://github.com/awslabs/aws-solutions-constructs/issues/61))

### Changed
- Upgraded all patterns to CDK v1.66.0
- Update `aws-dynamodb-stream-lambda` to add AWS Lambda support for Failure-Handling Features for DynamoDB Event Source ([#79](https://github.com/awslabs/aws-solutions-constructs/issues/79))
- Update `aws-kinesisstreams-lambda` to add AWS Lambda support for Failure-Handling Features for Kinesis Event Source ([#78](https://github.com/awslabs/aws-solutions-constructs/issues/78))

## 1.65.0 (2020-10-01)

### Changed
- Upgraded all patterns to CDK v1.65.0

## 1.64.1 (2020-09-26)

### Changed
- Upgraded all patterns to CDK v1.64.1
- Fix for *-S3-* patterns breaking when bucket versioning is turned off ([#80](https://github.com/awslabs/aws-solutions-constructs/issues/80))

## 1.64.0 (2020-09-24)

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

## 1.63.0 (2020-09-14)

### Changed
- Upgraded all patterns to CDK v1.63.0
- BREAKING CHANGE: For `aws-kinesisstreams-lambda` pattern, changed construct prop from `eventSourceProps?: lambda.EventSourceMappingOptions | any` to `kinesisEventSourceProps?: KinesisEventSourceProps`
- Allow for `existingStreamObj?` for `aws-kinesisstreams-lambda` pattern ([#58](https://github.com/awslabs/aws-solutions-constructs/issues/58))

## 1.62.0 (2020-09-09)

### Added
- aws-events-rule-sqs pattern added ([#25](https://github.com/awslabs/aws-solutions-constructs/issues/25))
- aws-events-rule-sns pattern added ([#42](https://github.com/awslabs/aws-solutions-constructs/issues/42))
- aws-apigateway-kinesisstreams pattern added ([#51](https://github.com/awslabs/aws-solutions-constructs/issues/51))

### Changed
- Upgraded all patterns to CDK v1.62.0

## 1.61.1 (2020-09-01)

### Added
- aws-sns-sqs pattern added ([#24](https://github.com/awslabs/aws-solutions-constructs/issues/24))

### Changed
- Upgraded all patterns to CDK v1.61.1
- [All *-sns-*  Patterns] Allow for existingTopicObj and change default encryption ([#49](https://github.com/awslabs/aws-solutions-constructs/issues/49))

## 1.61.0 (2020-08-27)

### Changed
- Upgraded all patterns to CDK v1.61.0
- [All *-lambda-* and *-apigateway-* patterns] Enable X-Ray tracing ([#36](https://github.com/awslabs/aws-solutions-constructs/issues/36))

## 1.60.0 (2020-08-24)

### Changed
- Upgraded all patterns to CDK v1.60.0

## 1.59.0 (2020-08-19)

### Changed
- Upgraded all patterns to CDK v1.59.0

## 1.58.0 (2020-08-14)

### Changed
- Upgraded all patterns to CDK v1.58.0
- Fix `aws-apigateway-sqs` pattern bug with overriding `apiGatewayProps` ([#37](https://github.com/awslabs/aws-solutions-constructs/issues/37))
- Updated `aws-cloudfront-apigateway` and `aws-cloudfront-apigateway-lambda` patterns to deploy unauthenticated APIs
- [All *-dynamodb-* patterns] Enable continuous backups and point-in-time recovery for DynamoDB Table ([#35](https://github.com/awslabs/aws-solutions-constructs/issues/35))
- Removed the default Cognito UserPool SMS role creation ([#9513](https://github.com/aws/aws-cdk/pull/9513))

## 1.57.0 (2020-08-07)

### Changed
- Upgraded all patterns to CDK v1.57.0
- Use `s3.IBucket` type instead of `s3.Bucket` for `existingBucketObj` construct props ([#33](https://github.com/awslabs/aws-solutions-constructs/issues/33))

## 1.56.0 (2020-08-05)

### Changed
- Upgraded all patterns to CDK v1.56.0

## 1.55.0 (2020-08-05)

### Changed
- Upgraded all patterns to CDK v1.55.0

## 1.54.0 (2020-07-31)

### Changed
- Upgraded all patterns to CDK v1.54.0
- Enforce encryption of data in transit for Amazon S3, Amazon SQS and Amazon SNS ([#28](https://github.com/awslabs/aws-solutions-constructs/issues/28))
- Upgrade deprecated CDK property used by API Gateway patterns ([#31](https://github.com/awslabs/aws-solutions-constructs/issues/31))
- Fix for CloudFrontDistributionForApiGateway bug ([#30](https://github.com/awslabs/aws-solutions-constructs/issues/30))

## 1.53.0 (2020-07-27)

### Added
- aws-lambda-sqs-lambda pattern added

### Changed
- Upgraded all patterns to CDK v1.53.0
- Expose all cdk objects created by the construct as pattern properties

## 1.52.0 (2020-07-20)

### Added
- aws-lambda-sqs pattern added

### Changed
- Upgraded all patterns to CDK v1.52.0

## 1.51.0 (2020-07-13)

### Changed
- Upgraded all patterns to CDK v1.51.0

## 1.50.0 (2020-07-09)

### Changed
- Upgraded all patterns to CDK v1.50.0

## 1.49.0 (2020-07-09)

### Changed
- Upgraded all patterns to CDK v1.49.0
- BREAKING CHANGE: Removed `deployLambda` and `deployBucket` from all patterns Construct Props
- Added `tablePermissions` to aws-lambda-dynamodb & aws-iot-lambda-dynamodb for fine-grained table permissions to grant to the lambda function

## 1.48.0 (2020-07-06)

### Added
- aws-lambda-step-function pattern added

### Changed
- Upgraded all patterns to CDK v1.48.0
- Fix for aws-sqs-lambda pattern bug when using FIFO queue ([#13](https://github.com/awslabs/aws-solutions-constructs/pull/13))
- Minor updates to CONTRIBUTING.md and deployment/build-patterns.sh

## 1.47.0 (2020-06-25)

### Changed
- Upgraded all patterns to CDK v1.47.0
- Adding ability to provide a dynamodb table ([#8](https://github.com/awslabs/aws-solutions-constructs/pull/8))
- Fix bug in s3BucketWithLogging function ([#9](https://github.com/awslabs/aws-solutions-constructs/pull/9))

## 1.46.0 (2020-06-22)

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

## 0.8.1-beta (2020-05-21)
### Changed
- Upgraded to CDK v1.40.0
- Ability to emit a warning to the console when a prescriptive default value is overridden by the user
- Automatic injection of best practice HTTP security headers in all HTTP responses from cloudfront
- Fix the Cfn Nag warning Cloudfront should use minimum protocol version TLS 1.2 (W70)

## 0.8.0-beta (2020-03-31)
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
