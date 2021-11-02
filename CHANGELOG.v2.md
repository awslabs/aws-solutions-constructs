# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.0.0-rc.2](https://github.com/awslabs/aws-solutions-constructs/compare/v2.0.0-rc.1...v2.0.0-rc.2) (2021-11-02)

### Features

* **aws-alb-lambda:** New Construct - aws-alb-lambda ([#467](https://github.com/awslabs/aws-solutions-constructs/issues/467)) ([4fb7eb9](https://github.com/awslabs/aws-solutions-constructs/commit/4fb7eb95d64959dbf8410a45c824dd1b5f1f5418))
* **aws-cloudfront-apigateway-lambda:** added cloudFrontLoggingBucketProps to cloudfront-apigateway-lambda ([#455](https://github.com/awslabs/aws-solutions-constructs/issues/455)) ([5e42612](https://github.com/awslabs/aws-solutions-constructs/commit/5e42612d67a2e3cd9e2291cf814ea78c0a3c725f))
* **aws-cloudfront-mediastore:** added cloudFrontLoggingBucketProp to cloudfront-mediastore ([#457](https://github.com/awslabs/aws-solutions-constructs/issues/457)) ([ffd8d17](https://github.com/awslabs/aws-solutions-constructs/commit/ffd8d17614047976c8fdbfd647ab9179bfd45f07))
* **aws-cloudfront-s3:** added added cloudFrontLoggingBucketProps ([#457](https://github.com/awslabs/aws-solutions-constructs/issues/460))
* **aws-wafwebacl-alb:** created aws-wafwebacl-alb construct ([#465](https://github.com/awslabs/aws-solutions-constructs/issues/465)) ([cd5c4f4](https://github.com/awslabs/aws-solutions-constructs/commit/cd5c4f432123983af7bd89477044e7639e7c8e75))
* **Implement aws-route53-alb:** Implement new construct ([#421](https://github.com/awslabs/aws-solutions-constructs/issues/421)) ([afd0811](https://github.com/awslabs/aws-solutions-constructs/commit/afd0811cd3c316a7c26931d83c33ab3b6faeab2b))

### Bug Fixes

* **apigateway-helper:** fixed condition for cloudWatchRole creation ([#468](https://github.com/awslabs/aws-solutions-constructs/issues/468)) ([e454349](https://github.com/awslabs/aws-solutions-constructs/commit/e45434928a17cde580698a82ee53f6ee7463c6cf))
* **scripts:** Fix postinstall script ([#477](https://github.com/awslabs/aws-solutions-constructs/issues/477)) ([3902a91](https://github.com/awslabs/aws-solutions-constructs/commit/3902a912547b2e7645ad352feec9811d88678543))
* **service-staff:** Fix create-order lambda ([#479](https://github.com/awslabs/aws-solutions-constructs/issues/479)) ([982c026](https://github.com/awslabs/aws-solutions-constructs/commit/982c02619d0bb4a5f9fd1433f60b74ef89a1603c))
* **Set outputBucket property on aws-kinesisstreams-gluejob:** Issue [#448](https://github.com/awslabs/aws-solutions-constructs/issues/448) to include S3 bucket for Glue Job that the consturct creates ([#452](https://github.com/awslabs/aws-solutions-constructs/issues/452)) ([c40e1f7](https://github.com/awslabs/aws-solutions-constructs/commit/c40e1f7c3524652ac8e3277b1c482975e6df9e36))

## 2.0.0-rc.1 (2021-10-12)

### Added
This is the first release candidate of Solutions Constructs 2.0 based on CDK v2.0 🎉
- aws-apigateway-dynamodb
- aws-apigateway-iot
- aws-apigateway-kinesisstreams
- aws-apigateway-lambda
- aws-apigateway-sagemakerendpoint
- aws-apigateway-sqs
- aws-cloudfront-apigateway
- aws-cloudfront-apigateway-lambda
- aws-cloudfront-mediastore
- aws-cloudfront-s3
- aws-cognito-apigateway-lambda
- aws-dynamodbstreams-lambda
- aws-dynamodbstreams-lambda-elasticsearch-kibana
- aws-eventbridge-kinesisfirehose-s3
- aws-eventbridge-kinesisstreams
- aws-eventbridge-lambda
- aws-eventbridge-sns
- aws-eventbridge-sqs
- aws-eventbridge-stepfunctions
- aws-iot-kinesisfirehose-s3
- aws-iot-kinesisstreams
- aws-iot-lambda
- aws-iot-lambda-dynamodb
- aws-iot-sqs
- aws-kinesisfirehose-s3
- aws-kinesisfirehose-s3-and-kinesisanalytics
- aws-kinesisstreams-gluejob
- aws-kinesisstreams-kinesisfirehose-s3
- aws-kinesisstreams-lambda
- aws-lambda-dynamodb
- aws-lambda-elasticsearch-kibana
- aws-lambda-eventbridge
- aws-lambda-s3
- aws-lambda-sagemakerendpoint
- aws-lambda-secretsmanager
- aws-lambda-sns
- aws-lambda-sqs
- aws-lambda-sqs-lambda
- aws-lambda-ssmstringparameter
- aws-lambda-stepfunctions
- aws-s3-lambda
- aws-s3-sqs
- aws-s3-stepfunctions
- aws-sns-lambda
- aws-sns-sqs
- aws-sqs-lambda
- aws-wafwebacl-apigateway
- aws-wafwebacl-cloudfront