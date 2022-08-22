# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

NOTE - With AWS CDK V1 deprecated as of 6/1/2022, AWS Solutions Constructs V1 functionality was frozen as of 1.159.0. All V1 releases after this point will just sync with AWS CDK V1 version numbers.

## 1.168.0 (2022-08-22)

* Upgraded all patterns to CDK v1.168.0

## 1.167.0 (2022-08-17)

* Upgraded all patterns to CDK v1.167.0

## 1.166.1 (2022-08-09)

* Upgraded all patterns to CDK v1.166.1

## 1.165.0 (2022-08-09)

* Upgraded all patterns to CDK v1.165.0

## 1.164.0 (2022-08-08)

* Upgraded all patterns to CDK v1.164.0

## 1.163.2 (2022-08-08)

* Upgraded all patterns to CDK v1.163.2

## 1.163.1 (2022-08-08)

* Upgraded all patterns to CDK v1.163.1

## 1.163.0 (2022-08-08)

* Upgraded all patterns to CDK v1.163.0

## 1.162.0 (2022-08-08)

* Upgraded all patterns to CDK v1.162.0

## 1.161.0 (2022-08-08)

* Upgraded all patterns to CDK v1.161.0

## 1.160.0 (2022-08-04)

* Upgraded all patterns to CDK v1.160.0

## [1.159.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.12.0...v1.159.0) (2022-08-01)

* Upgraded all patterns to CDK v1.159.0

## [1.158.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.11.0...v1.158.0) (2022-07-26)

* Upgraded all patterns to CDK v1.158.0

## [1.157.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.8.0...v1.157.0) (2022-06-13)

* Upgraded all patterns to CDK v1.157.0

### Features

* **aws-fargate-eventbridge:** new construct ([#696](https://github.com/awslabs/aws-solutions-constructs/issues/696)) ([6461b35](https://github.com/awslabs/aws-solutions-constructs/commit/6461b352fe920054d2d98f0223e88fd6168365ec))
* **aws-sns-sqs:** added sqsSubscriptionProps ([#700](https://github.com/awslabs/aws-solutions-constructs/issues/700)) ([bcc1216](https://github.com/awslabs/aws-solutions-constructs/commit/bcc1216be187d1c137b71fe391edc8129c65bf75))

### Bug Fixes

* **Use existing queue in ApiGatewayToSqs** Any existing Queue supplied was getting ignored ([#715](https://github.com/awslabs/aws-solutions-constructs/issues/715))

## [1.156.1](https://github.com/awslabs/aws-solutions-constructs/compare/v1.156.0...v1.156.1) (2022-05-20)

* Upgraded all patterns to CDK v1.156.1

## [1.156.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.7.0...v1.156.0) (2022-05-13)

### Features

* Upgraded all patterns to CDK v1.156.0
* Pinned @types/prettier to 2.6.0 in core

## [1.155.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.7.0...v1.155.0) (2022-05-13)

* Upgraded all patterns to CDK v1.155.0

### Features

* **aws-fargate-stepfunctions:** new construct ([#677](https://github.com/awslabs/aws-solutions-constructs/issues/677)) ([f4829ba](https://github.com/awslabs/aws-solutions-constructs/commit/f4829ba1af3643a8b42bb74af9dfa8207d383da3))

### Bug Fixes

* **Test Coverage:** Improve test coverage of 2 core files ([#691](https://github.com/awslabs/aws-solutions-constructs/issues/691)) ([0ea1743](https://github.com/awslabs/aws-solutions-constructs/commit/0ea1743ca1de577ab02ecd3ad0ef67fa56e51a90))
* **@types/prettier** Pin library to version 2.6.0 of @types/prettier

## [1.154.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.6.0...v1.154.0) (2022-05-08)

* Upgraded all patterns to CDK v1.154.0

### Bug Fixes

* **Incorrect Java Artifact ID:** Change lambdas3 lambdaelasticachememcached

## [1.153.1](https://github.com/awslabs/aws-solutions-constructs/compare/v1.153.0...v1.153.1) (2022-05-07)

* Upgraded all patterns to CDK v1.153.1

## [1.153.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.152.0...v1.153.0) (2022-05-07)

* Upgraded all patterns to CDK v1.153.0

### Features

* **aws-fargate-secretsmanager:** Create new construct ([#670](https://github.com/awslabs/aws-solutions-constructs/issues/670)) ([cd218b6](https://github.com/awslabs/aws-solutions-constructs/commit/cd218b6900a174afa09c86f28fb0650ecfe37942))
* **aws-fargate-ssmstringparameter:** New Construct ([#653](https://github.com/awslabs/aws-solutions-constructs/issues/653)) ([bcb7c63](https://github.com/awslabs/aws-solutions-constructs/commit/bcb7c6351ffa9b8ef5f5e7790522c5b1fe87dd9a))
* **aws-lambda-elasticachmemcached:** New Construct ([#675](https://github.com/awslabs/aws-solutions-constructs/issues/675)) ([14c50ae](https://github.com/awslabs/aws-solutions-constructs/commit/14c50ae86e84b05d1395293a001c4baa5d5f9fce))
* **aws-s3-stepfunctions:** Changed escape hatch to eventBridgeEnabled prop ([#666](https://github.com/awslabs/aws-solutions-constructs/issues/666)) ([bc2f733](https://github.com/awslabs/aws-solutions-constructs/commit/bc2f733879a5363407729e1f236302c9361ff652))

### Bug Fixes

* **aws-lambda-secretsmanager:** Update docs  ([#673](https://github.com/awslabs/aws-solutions-constructs/issues/673)) ([1b843bf](https://github.com/awslabs/aws-solutions-constructs/commit/1b843bff718dd05376f4f72ff9075db123e05288))
* All Kinesis Streams constructs - update CloudWatch alarm threshold to the documented 12 hours  ([#673](https://github.com/awslabs/aws-solutions-constructs/issues/663))

## [1.152.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.151.0...v1.152.0) (2022-04-10)

* Upgraded all patterns to CDK v1.152.0

## [1.151.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.149.0...v1.151.0) (2022-04-09)

* Upgraded all patterns to CDK v1.151.0

## [1.150.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.149.0...v1.150.0) (2022-04-08)

* Upgraded all patterns to CDK v1.150.0

### Features

* **aws-fargate-dynamodb:** create new construct ([#633](https://github.com/awslabs/aws-solutions-constructs/issues/633)) ([0b35418](https://github.com/awslabs/aws-solutions-constructs/commit/0b35418b41e24b32b6064a649d77a70f1c6d7bd8))

## [1.149.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.5.0...v1.149.0) (2022-04-07)

* Upgraded all patterns to CDK v1.149.0

### Features

* **README.md:** add python and java minimal deployment ([#582](https://github.com/awslabs/aws-solutions-constructs/issues/582)) ([2ecd9dd](https://github.com/awslabs/aws-solutions-constructs/commit/2ecd9dd935b731d2e4705ed9c146efcad0961fd8))


### Bug Fixes

* **Remove debug statement:** Remove extra debug statement in kinesisfirehose-s3 ([#649](https://github.com/awslabs/aws-solutions-constructs/issues/649)) ([26e9ec0](https://github.com/awslabs/aws-solutions-constructs/commit/26e9ec08257a90034b76a91ea4a3d703d13eb0a2))
* **Sonarqube configuration:** Replace comma between constructs ([#646](https://github.com/awslabs/aws-solutions-constructs/issues/646)) ([79e1b09](https://github.com/awslabs/aws-solutions-constructs/commit/79e1b09544c2d029fb73a2b500dde5e35edbf63a))

## [1.148.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.147.0...v1.148.0) (2022-03-30)

* Upgraded all patterns to CDK v1.148.0

## [1.147.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.4.0...v1.147.0) (2022-03-29)

* Upgraded all patterns to CDK v1.147.0

## [1.146.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.145.0...v1.146.0) (2022-03-02)

* Upgraded all patterns to CDK v1.146.0

## [1.145.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.144.0...v1.145.0) (2022-03-02)

* Upgraded all patterns to CDK v1.145.0

## [1.144.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.143.0...v1.144.0) (2022-03-02)

* Upgraded all patterns to CDK v1.144.0

## [1.143.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.142.0...v1.143.0) (2022-03-01)

* Upgraded all patterns to CDK v1.143.0

## [1.142.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.141.0...v1.142.0) (2022-02-28)

* Upgraded all patterns to CDK v1.142.0

## [1.141.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.140.0...v1.141.0) (2022-02-28)

* Upgraded all patterns to CDK v1.141.0

## [1.140.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.3.0...v1.140.0) (2022-02-26)

* Upgraded all patterns to CDK v1.140.0

### Bug Fixes

* **Python module name for Kinesis Firehose S3 pattern is not correct:** Update Python module name for aws-kinesisfirehose-s3 ([#554](https://github.com/awslabs/aws-solutions-constructs/issues/592))

## [1.139.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.138.2...v1.139.0) (2022-02-23)

* Upgraded all patterns to CDK v1.139.0

## [1.138.2](https://github.com/awslabs/aws-solutions-constructs/compare/v2.2.0...v1.138.2) (2022-02-23)

* Upgraded all patterns to CDK v1.138.2

### Features

* **aws-fargate-sqs:** Created new construct ([#588](https://github.com/awslabs/aws-solutions-constructs/issues/588)) ([f7ddf3f](https://github.com/awslabs/aws-solutions-constructs/commit/f7ddf3f66c84a8cec4514ac08e1cb3445593d8bb))

* **aws-fargate-s3:** Created new construct ([#591](https://github.com/awslabs/aws-solutions-constructs/issues/591))

## [1.138.1](https://github.com/awslabs/aws-solutions-constructs/compare/v1.138.0...v1.138.1) (2022-01-19)

* Upgraded all patterns to CDK v1.138.1

## [1.138.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.1.0...v1.138.0) (2022-01-19)

* Upgraded all patterns to CDK v1.138.0

### Features

* **aws-fargate-sns:** New Construct ([#574](https://github.com/awslabs/aws-solutions-constructs/issues/574)) ([5c86f3a](https://github.com/awslabs/aws-solutions-constructs/commit/5c86f3a711c45c8991b66369b7b5054d5e9229e1))
* **aws-route53-apigateway:** New Construct ([#511](https://github.com/awslabs/aws-solutions-constructs/issues/511)) ([81129dd](https://github.com/awslabs/aws-solutions-constructs/commit/81129ddfaebe198d10c2264feea95dae92205ab7))

## [1.137.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.136.0...v1.137.0) (2022-01-10)

* Upgraded all patterns to CDK v1.137.0

### Features

* **aws-alb-fargate:** New Construct ([#560](https://github.com/awslabs/aws-solutions-constructs/issues/560)) ([5a21b76](https://github.com/awslabs/aws-solutions-constructs/commit/5a21b7652be0be2c77957155a504a9582830eeba))
* **aws-iot-s3:** new construct implementation ([#469](https://github.com/awslabs/aws-solutions-constructs/issues/469)) ([ea024fc](https://github.com/awslabs/aws-solutions-constructs/commit/ea024fc87f40b288fc47f3a681907193c0f7ca6c))

### Bug Fixes

* **aws-apigateway-iot and aws-cloudfront-apigateway-lambda:** fixed deprecated warnings ([#554](https://github.com/awslabs/aws-solutions-constructs/issues/554)) ([655c4af](https://github.com/awslabs/aws-solutions-constructs/commit/655c4aff27eff5cc4c82e170d90466fddc1aac04))
* **aws-s3-cloudfront:** Recognize when client specifies enforceSSL: false ([#559](https://github.com/awslabs/aws-solutions-constructs/issues/559)) ([fc4fab8](https://github.com/awslabs/aws-solutions-constructs/commit/fc4fab88a9cecef65a5dad84c1539daee7862887))

## [1.136.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.135.0...v1.136.0) (2021-12-20)

* Upgraded all patterns to CDK v1.136.0
* Set underlying CDK library to 2.2.0

## [1.135.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.134.0...v1.135.0) (2021-12-17)

* Upgraded all patterns to CDK v1.135.0

## [1.134.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.133.0...v1.134.0) (2021-12-17)

* Upgraded all patterns to CDK v1.134.0

### Features

* **s3-stepfunctions:** removed CloudTrail dependency after new S3 feature ([#529](https://github.com/awslabs/aws-solutions-constructs/issues/529)) ([639f473](https://github.com/awslabs/aws-solutions-constructs/commit/639f47396f868846a81d0f81b6eb8160c61c6ae3))

## [1.133.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.132.0...v1.133.0) (2021-12-16)

* Upgraded all patterns to CDK v1.133.0

## [1.132.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.131.0...v1.132.0) (2021-12-16)

* Upgraded all patterns to CDK v1.132.0

## [1.131.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.130.0...v1.131.0) (2021-12-15)

* Upgraded all patterns to CDK v1.131.0

## [1.130.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.0.0...v1.130.0) (2021-12-15)

* Upgraded all patterns to CDK v1.130.0
* Changed underlying CDK 2.0 release to R26

## [1.129.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.128.0...v1.129.0) (2021-11-28)

* Upgraded all patterns to CDK v1.129.0

## [1.128.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.127.0...v1.128.0) (2021-11-28)

* Upgraded all patterns to CDK v1.128.0

## [1.127.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.0.0-rc.2...v1.127.0) (2021-11-28)

* Upgraded all patterns to CDK v1.127.0

### Features

* **aws-cloudfront-s3:** added logS3AccessLogs prop ([#506](https://github.com/awslabs/aws-solutions-constructs/issues/506)) ([6d3c7c9](https://github.com/awslabs/aws-solutions-constructs/commit/6d3c7c94dbe1398fc2eef16a7862704bb15a8bb9))
* **aws-events-rule-kinesisfirehose-s3:** added logS3AccessLogs and loggingBucketProps ([#492](https://github.com/awslabs/aws-solutions-constructs/issues/492)) ([0af95f5](https://github.com/awslabs/aws-solutions-constructs/commit/0af95f58c395f766d29d1ece791d0307621f63e6))
* **aws-iot-kinesisfirehose-s3:** added custom loggingBucketProps ([#480](https://github.com/awslabs/aws-solutions-constructs/issues/480)) ([76c0aa9](https://github.com/awslabs/aws-solutions-constructs/commit/76c0aa9ed4be859319a830d29be1a397b3322a43))
* **aws-kinesisfirehose-s3-and-kinesisanalytics:** added logS3AccessLogs and loggingBucketProps ([#490](https://github.com/awslabs/aws-solutions-constructs/issues/490)) ([3d8fec6](https://github.com/awslabs/aws-solutions-constructs/commit/3d8fec6632c76711ee26c323893ca5a7a58d917f))
* **aws-kinesisfirehose-s3:** added custom logging bucket props to kinesisfirehose-s3 ([#478](https://github.com/awslabs/aws-solutions-constructs/issues/478)) ([6fab3e5](https://github.com/awslabs/aws-solutions-constructs/commit/6fab3e50de4ef73d2e9f2dbde358d9d6f14e9831))
* **aws-kinesisstreams-gluejob:** encrypted bucket in existing job integ test ([#504](https://github.com/awslabs/aws-solutions-constructs/issues/504)) ([04d0642](https://github.com/awslabs/aws-solutions-constructs/commit/04d06424663b3f7cb5cc4ef6a9995f5eedce1721))
* **aws-kinesisstreams-kinesisfirehose-s3:** added loggingBucketProps and logS3AccessLogs ([#493](https://github.com/awslabs/aws-solutions-constructs/issues/493)) ([85b5f7a](https://github.com/awslabs/aws-solutions-constructs/commit/85b5f7ada3e197dcc83a1ad1bd9e23efedf9f63e))
* **aws-lambda-s3:** added logS3AccessLogs and updated tests ([#496](https://github.com/awslabs/aws-solutions-constructs/issues/496)) ([9922938](https://github.com/awslabs/aws-solutions-constructs/commit/992293810b92b3272e08e6b408c868243007049e))
* **aws-s3-sqs:** added logS3AccessLogs and S3BucketInterface  ([#499](https://github.com/awslabs/aws-solutions-constructs/issues/499)) ([c8320bd](https://github.com/awslabs/aws-solutions-constructs/commit/c8320bdd9cc47e519556a40b2a2e7f163922edc7))
* **aws-s3-stepfunctions:** added logS3AccessLogs and S3BucketInterface ([#500](https://github.com/awslabs/aws-solutions-constructs/issues/500)) ([d7d10f6](https://github.com/awslabs/aws-solutions-constructs/commit/d7d10f683e74276e1f737db8fbac434e0b48cd5e))

## [1.126.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.0.0-rc.1...v1.126.0) (2021-10-25)

* Upgraded all patterns to CDK v1.126.0

### Features

* **aws-alb-lambda:** New Construct - aws-alb-lambda ([#467](https://github.com/awslabs/aws-solutions-constructs/issues/467)) ([4fb7eb9](https://github.com/awslabs/aws-solutions-constructs/commit/4fb7eb95d64959dbf8410a45c824dd1b5f1f5418))
* **aws-cloudfront-apigateway-lambda:** added cloudFrontLoggingBucketProps to cloudfront-apigateway-lambda ([#455](https://github.com/awslabs/aws-solutions-constructs/issues/455)) ([5e42612](https://github.com/awslabs/aws-solutions-constructs/commit/5e42612d67a2e3cd9e2291cf814ea78c0a3c725f))
* **aws-cloudfront-mediastore:** added cloudFrontLoggingBucketProp to cloudfront-mediastore ([#457](https://github.com/awslabs/aws-solutions-constructs/issues/457)) ([ffd8d17](https://github.com/awslabs/aws-solutions-constructs/commit/ffd8d17614047976c8fdbfd647ab9179bfd45f07))
* **aws-cloudfront-s3:** added added cloudFrontLoggingBucketProps ([#457](https://github.com/awslabs/aws-solutions-constructs/issues/460))
* **aws-wafwebacl-alb:** created aws-wafwebacl-alb construct ([#465](https://github.com/awslabs/aws-solutions-constructs/issues/465)) ([cd5c4f4](https://github.com/awslabs/aws-solutions-constructs/commit/cd5c4f432123983af7bd89477044e7639e7c8e75))
* **Implement aws-route53-alb:** Implement new construct ([#421](https://github.com/awslabs/aws-solutions-constructs/issues/421)) ([afd0811](https://github.com/awslabs/aws-solutions-constructs/commit/afd0811cd3c316a7c26931d83c33ab3b6faeab2b))

### Bug Fixes

* **apigateway-helper:** fixed condition for cloudWatchRole creation ([#468](https://github.com/awslabs/aws-solutions-constructs/issues/468)) ([e454349](https://github.com/awslabs/aws-solutions-constructs/commit/e45434928a17cde580698a82ee53f6ee7463c6cf))
* **Set outputBucket property on aws-kinesisstreams-gluejob:** Issue [#448](https://github.com/awslabs/aws-solutions-constructs/issues/448) to include S3 bucket for Glue Job that the consturct creates ([#452](https://github.com/awslabs/aws-solutions-constructs/issues/452)) ([c40e1f7](https://github.com/awslabs/aws-solutions-constructs/commit/c40e1f7c3524652ac8e3277b1c482975e6df9e36))

## [1.125.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.124.0...v1.125.0) (2021-10-08)

* Upgraded all patterns to CDK v1.125.0

### Features

* **aws-cloudfront-s3:** added loggingBucketProps for cloudfront-s3 ([#419](https://github.com/awslabs/aws-solutions-constructs/issues/419)) ([743c874](https://github.com/awslabs/aws-solutions-constructs/commit/743c87485b5f173243423fa598a3f34e2eaacc16))
* **aws-lambda-s3:** added loggingBucketProps for lambda-s3 ([#422](https://github.com/awslabs/aws-solutions-constructs/issues/42))
* **aws-s3-lambda:** added optional loggingBucketProps to aws-s3-lambda ([#411](https://github.com/awslabs/aws-solutions-constructs/issues/411)) ([1552e4e](https://github.com/awslabs/aws-solutions-constructs/commit/1552e4e485ac89cc959ad810526ab4d7aac48210))
* **aws-s3-sqs:** added loggingBucketProps in aws-s3-sqs and updated tests ([#413](https://github.com/awslabs/aws-solutions-constructs/issues/413)) ([3ddf6ef](https://github.com/awslabs/aws-solutions-constructs/commit/3ddf6efcc8de2d78aa2bba4b173089052e3b7956))
* **aws-s3-stepfunctions:** added loggingBucketProps to s3-stepfunctions and s3-step-function ([#414](https://github.com/awslabs/aws-solutions-constructs/issues/414)) ([ed7bdfa](https://github.com/awslabs/aws-solutions-constructs/commit/ed7bdfa055b5b9555d5c0c8bb488e78669a85b6a))
* **dynamodbstreams-lambda-elasticsearch-kibana:** updated cognito user pool domain name ([#433](https://github.com/awslabs/aws-solutions-constructs/issues/433)) ([6f340a6](https://github.com/awslabs/aws-solutions-constructs/commit/6f340a6e6c10148ca40812a1b36c49cc2eb210da))
* **aws-iot-sqs:** updated names to address conflicting duplicate queue and dlq names ([#434](https://github.com/awslabs/aws-solutions-constructs/issues/434)) 

### Bug Fixes

* **cdk-integ-assert-v2:** revert the changes for special CDK v2 handling ([#417](https://github.com/awslabs/aws-solutions-constructs/issues/417)) ([51b1758](https://github.com/awslabs/aws-solutions-constructs/commit/51b1758956541e76cb07fc2d826eb7b602fe806a))
* **cdk-integ-tools:** enabling all feature flags in cdk-integ-tools for CDK v1 ([#410](https://github.com/awslabs/aws-solutions-constructs/issues/410)) ([9c42458](https://github.com/awslabs/aws-solutions-constructs/commit/9c4245854c966fb4162fc12a99ee2afbc56c49d1))
* **cdk-integ-tools:** fix npm run integ for individual pattern ([#432](https://github.com/awslabs/aws-solutions-constructs/issues/432)) ([5d2f3d9](https://github.com/awslabs/aws-solutions-constructs/commit/5d2f3d900f9c50ec9f041c72911615d3dbe9d908))
* **cdk-v2-align-version:** it fails to build cdk-integ-tools for constructs v2.0.0-rc.2 ([#424](https://github.com/awslabs/aws-solutions-constructs/issues/424)) ([80d1fe8](https://github.com/awslabs/aws-solutions-constructs/commit/80d1fe8b48580dd2ec7ab0d46b7636ed159e0478))
* **cdk-v2:** fixing relative paths in deployment/v2/build-cdk-dist.sh ([#429](https://github.com/awslabs/aws-solutions-constructs/issues/429)) ([fd7e210](https://github.com/awslabs/aws-solutions-constructs/commit/fd7e2108fc9c57b8bc94a94002ca0351d9479e81))

## [1.124.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.123.0...v1.124.0) (2021-09-29)

* Upgraded all patterns to CDK v1.124.0

### Features

* **aws-wafwebacl-cloudfront:** New Construct - aws-wafwebacl-cloudfront ([#389](https://github.com/awslabs/aws-solutions-constructs/issues/389)) ([bba361e](https://github.com/awslabs/aws-solutions-constructs/commit/bba361eb9c486af272fce4f8352c667e4e04cfa7))

### Bug Fixes

* **api-usage-plan:** update cfn templates with api usage plan ([#400](https://github.com/awslabs/aws-solutions-constructs/issues/400)) ([57afba8](https://github.com/awslabs/aws-solutions-constructs/commit/57afba81ce0d9a8cc53c764daa7d9ea573ba1ef8))
* **aws-apigateway-kinesisstreams:** Update construct to match DESIGN_GUIDELINES.md ([#395](https://github.com/awslabs/aws-solutions-constructs/issues/395)) ([9dbec8a](https://github.com/awslabs/aws-solutions-constructs/commit/9dbec8a0365b28c3e0ee279ded0dfaa42a319d3b))
* **kms policy:** update cfn templates with kms policy to match with CDK v2 ([#397](https://github.com/awslabs/aws-solutions-constructs/issues/397)) ([21f1f93](https://github.com/awslabs/aws-solutions-constructs/commit/21f1f932e5651e108e5995e89d8bc1c6282dd4f3))

## [1.123.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.122.0...v1.123.0) (2021-09-21)

* Upgraded all patterns to CDK v1.123.0

### Features

* **aws-iot-kinesisstreams:** implement new construct ([#383](https://github.com/awslabs/aws-solutions-constructs/issues/383)) ([9d2e5ec](https://github.com/awslabs/aws-solutions-constructs/commit/9d2e5ec2db2ce70d0498bbd133eaf4ed0c922157))

## [1.122.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.121.0...v1.122.0) (2021-09-20)

* Upgraded all patterns to CDK v1.122.0

## [1.121.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.120.0...v1.121.0) (2021-09-17)

### Changed

* Upgraded all patterns to CDK v1.121.0
* **cdk-v2:** Delete snapshot unit tests ([#373](https://github.com/awslabs/aws-solutions-constructs/pull/373))

### Features

* **aws-eventbridge-kinesisstrems, aws-events-rule-kinesisstreams, aws-eventbridge-kinesisfirehose-s3, aws-events-rule-kinesisfirehose-s3:** support for custom EventBus ([#364](https://github.com/awslabs/aws-solutions-constructs/issues/364)) ([2ed5355](https://github.com/awslabs/aws-solutions-constructs/commit/2ed535576a3ecf9a4e425e63bfa11d52191491a2))
* **aws-eventbridge-sns , aws-events-rule-sns, aws-events-rule-lambda:** custom event bus support ([#362](https://github.com/awslabs/aws-solutions-constructs/issues/362)) ([47221d9](https://github.com/awslabs/aws-solutions-constructs/commit/47221d9dfa2de30c9c33c74eff62a150cb477db0))
* **aws-eventbridge-sqs, aws-events-rule-sqs, aws-eventbridge-stepfunctions, aws-events-rule-step-function:** custom EventBus support ([#363](https://github.com/awslabs/aws-solutions-constructs/issues/363)) ([60dd243](https://github.com/awslabs/aws-solutions-constructs/commit/60dd24384f38fa39ce120c008ab7ce05964cd15e))
* **aws-wafwebacl-apigateway:** created new construct ([#366](https://github.com/awslabs/aws-solutions-constructs/issues/366)) ([ee143ca](https://github.com/awslabs/aws-solutions-constructs/commit/ee143ca595784c2011c32cdc1d23766c7b4581e2))
* **aws-lambda-eventbridge:** created new construct ([#368](https://github.com/awslabs/aws-solutions-constructs/pull/368))
* **cdk-v2:** Adding build scripts for CDK v2 ([#353](https://github.com/awslabs/aws-solutions-constructs/issues/353))
* **cdk-v2:** fixing assertion tests to work with both v1 and v2 ([#370](https://github.com/awslabs/aws-solutions-constructs/issues/370)) ([c4c20e4](https://github.com/awslabs/aws-solutions-constructs/commit/c4c20e46ee253ac06629a4d38a07093c46b9905c))


### Bug Fixes

* **doc:** Typo in aws-sns-lambda README.md ([#374](https://github.com/awslabs/aws-solutions-constructs/issues/374)) ([0dbe295](https://github.com/awslabs/aws-solutions-constructs/commit/0dbe295bae4f24bb599168b2a0f014fdae69c41c))
* **wrapped constructs:** shorten wrapped ID names in deprecated constructs ([#371](https://github.com/awslabs/aws-solutions-constructs/issues/371)) ([30737ae](https://github.com/awslabs/aws-solutions-constructs/commit/30737ae187b0231ec8e74e0f9abba59bd5c915a9))

## [1.120.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.119.0...v1.120.0) (2021-09-02)

### Changed

* Upgraded all patterns to CDK v1.120.0

## [1.119.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.118.0...v1.119.0) (2021-09-02)

### Changed

* Upgraded all patterns to CDK v1.119.0

### Features

* Added custom event bus support to aws-eventbridge-lambda [354](https://github.com/awslabs/aws-solutions-constructs/pull/354)

* **aws-eventbridge-lambda:**  Support for custom EventBus ([#354](https://github.com/awslabs/aws-solutions-constructs/issues/354)) ([fd750a5](https://github.com/awslabs/aws-solutions-constructs/commit/fd750a5fc02f23728214bba5ca2909c99cc6adb4))

## [1.118.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.117.0...v1.118.0) (2021-09-02)

### Changed

* Upgraded all patterns to CDK v1.118.0

### Features

* Provide better error message when Queue and DLQ fifo settings don't match [#343](https://github.com/awslabs/aws-solutions-constructs/pull/343)
* Convert SQS fifo: false to fifo: undefined automatically [#346](https://github.com/awslabs/aws-solutions-constructs/pull/346)
* Added read and delete request template props to aws-apigateway-dynamodb [#347](https://github.com/awslabs/aws-solutions-constructs/pull/347)
* Do not create cloudfront log bucket if logging is disabled on construct [#303](https://github.com/awslabs/aws-solutions-constructs/pull/303)
* Add VPC support to aws-lambda-stepfunctions [#333](https://github.com/awslabs/aws-solutions-constructs/pull/333)
* **cdk-v2:** Rearranging imports, removing deprecated APIs for CDK v2 release ([#350](https://github.com/awslabs/aws-solutions-constructs/issues/350)) ([0c8fba4](https://github.com/awslabs/aws-solutions-constructs/commit/0c8fba44001fedd549923ac16972b7779e1cdeaf))

## [1.117.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.116.0...v1.117.0) (2021-08-14)

### Changed

* Upgraded all patterns to CDK v1.117.0

### Features

* Added VPC support to aws-lambda-sqs-lambda. ([326](https://github.com/awslabs/aws-solutions-constructs/pull/326))

### Added

* **aws-iot-sqs:** initial implementation ([#267](https://github.com/awslabs/aws-solutions-constructs/issues/267)) ([5411ab7](https://github.com/awslabs/aws-solutions-constructs/commit/5411ab73301f85ff7a5df1e6425996e2c6e8ffb5)), closes [#266](https://github.com/awslabs/aws-solutions-constructs/issues/266)

## [1.116.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.115.0...v1.116.0) (2021-08-12)

### Changed

* Upgraded all patterns to CDK v1.116.0

## [1.115.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.114.0...v1.115.0) (2021-08-11)

### Added

* Added new constructs that provide the same implementation as existing constructs but have names that follow our naming standard. aws-lambda-stepfunctions ([285](https://github.com/awslabs/aws-solutions-constructs/issues/285)), aws-eventbridge-stepfunctions ([299](https://github.com/awslabs/aws-solutions-constructs/issues/299)), aws-eventbridge-sns ([309](https://github.com/awslabs/aws-solutions-constructs/issues/309)), aws-eventbridge-kinesisfirehose-s3 ([310](https://github.com/awslabs/aws-solutions-constructs/issues/310)), aws-eventbridge-kinesisstreams ([311](https://github.com/awslabs/aws-solutions-constructs/issues/311)), aws-eventbridge-lambda ([312](https://github.com/awslabs/aws-solutions-constructs/issues/312))aws-eventbridge-sqs ([315](https://github.com/awslabs/aws-solutions-constructs/issues/315)), aws-dynamodbstreams-lambda-elasticsearch-kibana ([319](https://github.com/awslabs/aws-solutions-constructs/issues/319))

### Changed

* Upgraded all patterns to CDK v1.115.0
* Encrypt scrap buckets created for integration tests ([314](https://github.com/awslabs/aws-solutions-constructs/issues/314))
* fixed cfn_nag error when using existingBucketInterface on cloudfront-s3 ([320](https://github.com/awslabs/aws-solutions-constructs/issues/320))
* allow passing sqsEventSourceProps into LambdaToSqsToLambda ([321](https://github.com/awslabs/aws-solutions-constructs/issues/321))
* Set eligible constructs to Stable (9 constructs) ([323](https://github.com/awslabs/aws-solutions-constructs/issues/323))

### ⚠ BREAKING CHANGES

* CloudFrontToApiGateway - use cloudfront function instead of lambda@edge ([313](https://github.com/awslabs/aws-solutions-constructs/issues/))
* CloudFrontToMediaStore - use cloudfront function instead of lambda@edge ([317](https://github.com/awslabs/aws-solutions-constructs/issues/))

## [1.114.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.113.0...v1.114.0) (2021-07-27)

### Changed

* Upgraded all patterns to CDK v1.114.0

## [1.113.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.112.0...v1.113.0) (2021-07-27)

### Changed

* Upgraded all patterns to CDK v1.113.0
* Added keywords to each construct to appear as tags in NPM registry [278](https://github.com/awslabs/aws-solutions-constructs/issues/278)

## [1.112.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.111.0...v1.112.0) (2021-07-24)

### Changed

* Upgraded all patterns to CDK v1.112.0
* Correct rules_to_suppress error in utils.ts [273](https://github.com/awslabs/aws-solutions-constructs/issues/273)

### ⚠ BREAKING CHANGES

* Use cloudfront function instead of lambda@edge for response security headers . [233](https://github.com/awslabs/aws-solutions-constructs/issues/233). The construct property edgeLambdaFunctionVersion is replaced by cloudFrontFunction, only stacks that reference that property will be affected.

## [1.111.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.110.1...v1.111.0) (2021-07-19)

### Changed

* Upgraded all patterns to CDK v1.111.0
* Reduced default worker nodes from 10 to 2 on aws-kinesisstreams-gluejob to reduce costs for the default installation (may require refreshing test snapshots)
* Added bucketname (to the current bucketname/*) in the bucket policy conditions requiring secure transport for greater control  (may require refreshing test snapshots).
* Updated constructs to add cfn_nag rule suppression to metadata rather than replace the metadata section. [228](https://github.com/awslabs/aws-solutions-constructs/issues/228)
* Support IBucket for the existingBucketObj prop in the aws-cloudfront-s3 pattern. [139](https://github.com/awslabs/aws-solutions-constructs/issues/139)

## [1.110.1](https://github.com/awslabs/aws-solutions-constructs/compare/v1.110.0...v1.110.1) (2021-07-01)

### Changed

* Upgraded all patterns to CDK v1.110.1
* Changed URL used to access IoT in aws-apigateway-iot [232](https://github.com/awslabs/aws-solutions-constructs/pull/232)

### ⚠ BREAKING CHANGES

* [253](https://github.com/awslabs/aws-solutions-constructs/pull/253) The construct docs say Mediastore requests are only accepted from CloudFront. The policy as written did not enforce this. If your app relied on the undocumented behavior and made Mediastore requests directly this change will break your app as the policy is now implemented as documented - only calls through CloudFront are accepted.

## [1.110.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.109.0...v1.110.0) (2021-06-26)

### Changed

* Upgraded all patterns to CDK v1.110.0

## [1.109.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.108.1...v1.109.0) (2021-06-26)

### Changed

* Upgraded all patterns to CDK v1.109.0

## [1.108.1](https://github.com/awslabs/aws-solutions-constructs/compare/v1.108.0...v1.108.1) (2021-06-26)

### Changed

* Upgraded all patterns to CDK v1.108.1

## [1.108.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.107.0...v1.108.0) (2021-06-26)

### Changed

* Upgraded all patterns to CDK v1.108.0

### ⚠ BREAKING CHANGES

* [291](https://github.com/awslabs/aws-solutions-constructs/issues/219) Changed the attribute name in for EventsRuleToSnsProps from topicsProps to topicProps to match other constructs and documentation. Clients using EventsRuleToSns will need to change this attribute name where it appears in their code.

## [1.107.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.106.1...v1.107.0) (2021-06-15)

### Changed

* Upgraded all patterns to CDK v1.107.0
* Eliminate name collision for Security Groups on VPC endpoints [212](https://github.com/awslabs/aws-solutions-constructs/pull/212)
* Allow users to pass ITable to existingTableObj for DynamoDB Stream constructs [214](https://github.com/awslabs/aws-solutions-constructs/pull/214)
* Add versioning to Logging Buckets as default behavior [220](https://github.com/awslabs/aws-solutions-constructs/pull/220)
* Set DataTraceEnabled to false default on API Gateway as default behavior [222](https://github.com/awslabs/aws-solutions-constructs/pull/222)
* Add 'period' to prefilter attributes for deep-diff [224](https://github.com/awslabs/aws-solutions-constructs/pull/224)
* Added Restaurant Management System example to Use Cases

### ⚠ BREAKING CHANGES

* Change the log group attribute of Step Functions constructs from LogGroup to ILogGroup [211](https://github.com/awslabs/aws-solutions-constructs/pull/211)
* Other changes may require unit and integration snapshots refresh

## [1.106.1](https://github.com/awslabs/aws-solutions-constructs/compare/v1.106.0...v1.106.1) (2021-06-03)

### Changed

* Upgraded all patterns to CDK v1.106.1

## [1.106.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.105.0...v1.106.0) (2021-06-02)

### Changed

* Upgraded all patterns to CDK v1.106.0
* Fixed stack name duplication for ALL integ tests [#183](https://github.com/awslabs/aws-solutions-constructs/issues/183)
* Fixed aws-cloudfront-mediastore integ tests failure [#194](https://github.com/awslabs/aws-solutions-constructs/issues/194)

## [1.105.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.104.0...v1.105.0) (2021-05-28)

### Changed

* Upgraded all patterns to CDK v1.105.0
* aws-s3-step-function now triggers for Mulitpart uploads and Copy Object [#198](https://github.com/awslabs/aws-solutions-constructs/pull/198)
* Change S3 protocol in glue to use s3a:// [#197](https://github.com/awslabs/aws-solutions-constructs/pull/197)
* Change policy name in for glue so multiple constructs can be included in a single stack [#197](https://github.com/awslabs/aws-solutions-constructs/pull/197)

### ⚠ BREAKING CHANGES

* Existing testing snapshots for aws-s3-step-function and aws-kinesisstreams-gluejob may need to be refreshed.

## [1.104.0](https://github.com/awslabs/aws-solutions-constructs/compare/v1.103.0...v1.104.0) (2021-05-21)

### Changed

* Upgraded all patterns to CDK v1.104.0

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
