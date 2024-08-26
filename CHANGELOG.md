# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.68.0](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/compare/v2.14.0...v2.68.0) (2024-08-26)


### Features

* **apigateway:** accept MethodResponses along with IntegrationResponses ([#1146](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1146)) ([c351953](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/c35195335b530bde8e782bdc2ded8003060c9650))
* **aws-apigateway-*:** add optional request templates for non-default content-types. ([#888](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/888)) ([ace70f0](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/ace70f0ff9efed0cd1cdf46cabd8fa2e9f0e1bcc))
* **aws-apigateway-dynamodb:** add optional resourceName parameter ([#898](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/898)) ([09e54ec](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/09e54ec2150257be3e2c1cb1aa42124aa4e8f55e))
* **aws-cloudfront-apigateway-lambda:** require explicit authentication type ([#1044](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1044)) ([720dec5](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/720dec500a728a3c57832b7e479ee8eca1f08056))
* **aws-cloudfront-s3:** update construct to use origin access controls; add support for CMK-encrypted buckets ([#1038](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1038)) ([012f9e7](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/012f9e7b6ebd3a717ff120941131a84e803b2922)), closes [#1037](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1037)
* **aws-constructs-factories:** add a factory for sqs queues ([#1131](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1131)) ([b35b9b8](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/b35b9b86dcbda1d90dceac1cc539be816defe288))
* **aws-constructs-factories:** add state machine factory ([#1128](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1128)) ([d82342c](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/d82342c99c1b5ec77a015c96620bc99b0650346f))
* **aws-dynamodbstreams-lambda-elasticsearch-kibana:** Added VPC support ([#816](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/816)) ([30a5160](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/30a5160ce3165fa838e571fabb0d31c13961bb8f))
* **aws-iot-lambda-dynamodb:** add vpc and environment variable name to construct interface ([#894](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/894)) ([8ee687a](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/8ee687a8d644be8c7db8f905a55e5fced5a70bfc))
* **aws-lambda-kinesisstream:** created new construct  ([#873](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/873)) ([81592de](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/81592de3b14a9d6f01a7e61519be6c6b90695cff))
* **aws-lambda-opensearch:** created new construct ([#818](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/818)) ([f31f59d](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/f31f59d1ce4d945508f999d58905b1775f26a891))
* **aws-openapi-lambda:** make names unique ([#987](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/987)) ([be9997a](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/be9997a4e7e376670ef7f3d8bf1335ea3cebc515))
* **aws-wafwebacl-agigateway:** enable govcloud ([#900](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/900)) ([dd19d93](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/dd19d9363fa6c33b0c616a1a5392c26369bc02b2))
* **aws-wafwebacl-appsync:** created new construct ([#833](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/833)) ([1c708b9](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/1c708b9bb2527ba2cbec974eab3a0e272ad26ad4))
* **cloudfront constructs:** add s3 access logging to cloudfront access log buckets by default ([#1042](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1042)) ([51ec028](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/51ec028ebd4763965671483e74924e3b8e328337))
* **new construct:** aws-fargate-kinesisfirehose ([#881](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/881)) ([3a74a27](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/3a74a27f9c3e895a44b485ee1bb8fe9adc50a80e))
* **new construct:** aws-fargate-kinesisstreams ([#877](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/877)) ([08b7975](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/08b79756743e4a3f9930128e8318670666e01367)), closes [#875](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/875)
* **new construct:** aws-lambda-kendra ([#989](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/989)) ([24fe018](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/24fe018898dafd4be2d20d6636ad54333da4145d))
* **new construct:** aws-lambda-kinesisfirehose ([#875](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/875)) ([aef3efa](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/aef3efab4b4658f12ed82937683d08997162d9bc))
* **new construct:** aws-openapigateway-lambda ([#912](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/912)) ([09465d6](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/09465d65fc5969da5691cf5057c278ded8753b43)), closes [#910](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/910) [#917](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/917) [#922](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/922) [#929](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/929) [#930](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/930)
* **s3:** constructs factories - create well architected s3 buckets ([#1110](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1110)) ([f561cf6](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/f561cf65c377684c0579417b404b33cdc97fa407))


### Bug Fixes

* **all constructs:** use aws.partition where value could refer to govcloud ([#941](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/941)) ([e4cc3c0](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/e4cc3c090d669a8f163adb013c26fcd3796b5d8b))
* **all:** correct aws-cdk-lib version in peerdependency ([#1081](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1081)) ([1ad214d](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/1ad214d9f85a742a168734a0b29ace597fd60e4d))
* **all:** typos ([#1010](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1010)) ([0787baf](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/0787baf7c68f84599139e5b886d5942b076174f2))
* **aws-alb-fargate:** change container used to launch integ tests ([#962](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/962)) ([30ba7d9](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/30ba7d94a3cdd3766c24af49dbf66e56053b7b41))
* **aws-apigateway-sqs:** Remove /message path when delete method is not allowed ([#1030](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1030)) ([f772200](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/f772200d6885cf0e0030239ce6f7511cdb2814d6))
* **aws-cloudfront-s3:** observe props.logCloudFrontAccessLog ([#1170](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1170)) ([b2b8201](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/b2b8201930326fe7de93d7eadf808f899fa8aa25))
* **aws-eventbridge-sns:** long sns topic names break eventbridge bindings ([#1024](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1024)) ([9da7065](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/9da706586cf6cceb9bf4eba3cb9332003af195e0))
* **aws-s3-cloudfront:** address handling and definition of peripheral buckets ([#1129](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1129)) ([8b30791](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/8b30791902e09db2f7c49410a03d5d95ccc2ef51))
* **aws-sns-sqs:** fix circular dependency error in aws-sns-sqs ([#1122](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1122)) ([2366272](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/23662723b477baf43787979cb9c8b809ceba6dfe))
* **kms:** do not use fixed name when building kms key constructs ([#1103](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1103)) ([a5fa0f9](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/a5fa0f957e763802062dcb99d2b0508ad3f09154))
* **npmlog:** update npmlog version ([#1075](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1075)) ([968639a](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/968639ae3048dc933a6c6e7baf9013e0f41bd16a))
* **openapigateway-to-lambda:** refine python example in README based on deployed code ([#1093](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1093)) ([57738a2](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/57738a227fb073188ce1ac1c06c696e03e87bfae))
* **readme.md files:** update all documentation links to v2 ([#815](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/815)) ([ad1f9d7](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/ad1f9d77ad956f6a139adceec1891132996611ee))
* **resources/template-writer:** add IAM policy as customResource dependency ([#1148](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1148)) ([bbdeddd](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/bbdeddd4b5c57cdc2397f82d1724027e610df550))
* **s3-bucket-helper:** not populating response.loggingBucket when bucket supplied ([#934](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/934)) ([b65986d](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/b65986d7d1791c2ed19e62c8f39ffe42b6f2a274))
* **s3-constructs:** accommodate s3 change that disables acls by default ([#949](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/949)) ([46d02cc](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/46d02ccf98e368206b59c27a16003dc3b16d4236))
* **StepFunctions:** Address LogGroup behavior problems ([#922](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/922)) ([84e581c](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/84e581cad10f59daf827fb6e8f8101e1ec6b11f3))
* **utils:** address issues in printing override warnings ([#1113](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1113)) ([1732949](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/1732949a7b81fe4670d642a83db091e08b954317))

## [2.67.1](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/compare/v2.14.0...v2.67.1) (2024-08-24)

Test Patch

### Features

* **apigateway:** accept MethodResponses along with IntegrationResponses ([#1146](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1146)) ([c351953](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/c35195335b530bde8e782bdc2ded8003060c9650))
* **aws-apigateway-*:** add optional request templates for non-default content-types. ([#888](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/888)) ([ace70f0](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/ace70f0ff9efed0cd1cdf46cabd8fa2e9f0e1bcc))
* **aws-apigateway-dynamodb:** add optional resourceName parameter ([#898](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/898)) ([09e54ec](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/09e54ec2150257be3e2c1cb1aa42124aa4e8f55e))
* **aws-cloudfront-apigateway-lambda:** require explicit authentication type ([#1044](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1044)) ([720dec5](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/720dec500a728a3c57832b7e479ee8eca1f08056))
* **aws-cloudfront-s3:** update construct to use origin access controls; add support for CMK-encrypted buckets ([#1038](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1038)) ([012f9e7](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/012f9e7b6ebd3a717ff120941131a84e803b2922)), closes [#1037](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1037)
* **aws-constructs-factories:** add a factory for sqs queues ([#1131](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1131)) ([b35b9b8](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/b35b9b86dcbda1d90dceac1cc539be816defe288))
* **aws-constructs-factories:** add state machine factory ([#1128](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1128)) ([d82342c](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/d82342c99c1b5ec77a015c96620bc99b0650346f))
* **aws-dynamodbstreams-lambda-elasticsearch-kibana:** Added VPC support ([#816](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/816)) ([30a5160](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/30a5160ce3165fa838e571fabb0d31c13961bb8f))
* **aws-iot-lambda-dynamodb:** add vpc and environment variable name to construct interface ([#894](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/894)) ([8ee687a](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/8ee687a8d644be8c7db8f905a55e5fced5a70bfc))
* **aws-lambda-kinesisstream:** created new construct  ([#873](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/873)) ([81592de](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/81592de3b14a9d6f01a7e61519be6c6b90695cff))
* **aws-lambda-opensearch:** created new construct ([#818](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/818)) ([f31f59d](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/f31f59d1ce4d945508f999d58905b1775f26a891))
* **aws-openapi-lambda:** make names unique ([#987](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/987)) ([be9997a](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/be9997a4e7e376670ef7f3d8bf1335ea3cebc515))
* **aws-wafwebacl-agigateway:** enable govcloud ([#900](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/900)) ([dd19d93](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/dd19d9363fa6c33b0c616a1a5392c26369bc02b2))
* **aws-wafwebacl-appsync:** created new construct ([#833](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/833)) ([1c708b9](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/1c708b9bb2527ba2cbec974eab3a0e272ad26ad4))
* **cloudfront constructs:** add s3 access logging to cloudfront access log buckets by default ([#1042](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1042)) ([51ec028](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/51ec028ebd4763965671483e74924e3b8e328337))
* **new construct:** aws-fargate-kinesisfirehose ([#881](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/881)) ([3a74a27](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/3a74a27f9c3e895a44b485ee1bb8fe9adc50a80e))
* **new construct:** aws-fargate-kinesisstreams ([#877](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/877)) ([08b7975](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/08b79756743e4a3f9930128e8318670666e01367)), closes [#875](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/875)
* **new construct:** aws-lambda-kendra ([#989](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/989)) ([24fe018](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/24fe018898dafd4be2d20d6636ad54333da4145d))
* **new construct:** aws-lambda-kinesisfirehose ([#875](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/875)) ([aef3efa](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/aef3efab4b4658f12ed82937683d08997162d9bc))
* **new construct:** aws-openapigateway-lambda ([#912](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/912)) ([09465d6](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/09465d65fc5969da5691cf5057c278ded8753b43)), closes [#910](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/910) [#917](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/917) [#922](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/922) [#929](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/929) [#930](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/930)
* **s3:** constructs factories - create well architected s3 buckets ([#1110](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1110)) ([f561cf6](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/f561cf65c377684c0579417b404b33cdc97fa407))


### Bug Fixes

* **all constructs:** use aws.partition where value could refer to govcloud ([#941](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/941)) ([e4cc3c0](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/e4cc3c090d669a8f163adb013c26fcd3796b5d8b))
* **all:** correct aws-cdk-lib version in peerdependency ([#1081](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1081)) ([1ad214d](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/1ad214d9f85a742a168734a0b29ace597fd60e4d))
* **all:** typos ([#1010](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1010)) ([0787baf](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/0787baf7c68f84599139e5b886d5942b076174f2))
* **aws-alb-fargate:** change container used to launch integ tests ([#962](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/962)) ([30ba7d9](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/30ba7d94a3cdd3766c24af49dbf66e56053b7b41))
* **aws-apigateway-sqs:** Remove /message path when delete method is not allowed ([#1030](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1030)) ([f772200](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/f772200d6885cf0e0030239ce6f7511cdb2814d6))
* **aws-cloudfront-s3:** observe props.logCloudFrontAccessLog ([#1170](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1170)) ([b2b8201](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/b2b8201930326fe7de93d7eadf808f899fa8aa25))
* **aws-eventbridge-sns:** long sns topic names break eventbridge bindings ([#1024](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1024)) ([9da7065](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/9da706586cf6cceb9bf4eba3cb9332003af195e0))
* **aws-s3-cloudfront:** address handling and definition of peripheral buckets ([#1129](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1129)) ([8b30791](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/8b30791902e09db2f7c49410a03d5d95ccc2ef51))
* **aws-sns-sqs:** fix circular dependency error in aws-sns-sqs ([#1122](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1122)) ([2366272](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/23662723b477baf43787979cb9c8b809ceba6dfe))
* **kms:** do not use fixed name when building kms key constructs ([#1103](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1103)) ([a5fa0f9](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/a5fa0f957e763802062dcb99d2b0508ad3f09154))
* **npmlog:** update npmlog version ([#1075](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1075)) ([968639a](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/968639ae3048dc933a6c6e7baf9013e0f41bd16a))
* **openapigateway-to-lambda:** refine python example in README based on deployed code ([#1093](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1093)) ([57738a2](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/57738a227fb073188ce1ac1c06c696e03e87bfae))
* **readme.md files:** update all documentation links to v2 ([#815](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/815)) ([ad1f9d7](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/ad1f9d77ad956f6a139adceec1891132996611ee))
* **resources/template-writer:** add IAM policy as customResource dependency ([#1148](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1148)) ([bbdeddd](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/bbdeddd4b5c57cdc2397f82d1724027e610df550))
* **s3-bucket-helper:** not populating response.loggingBucket when bucket supplied ([#934](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/934)) ([b65986d](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/b65986d7d1791c2ed19e62c8f39ffe42b6f2a274))
* **s3-constructs:** accommodate s3 change that disables acls by default ([#949](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/949)) ([46d02cc](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/46d02ccf98e368206b59c27a16003dc3b16d4236))
* **StepFunctions:** Address LogGroup behavior problems ([#922](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/922)) ([84e581c](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/84e581cad10f59daf827fb6e8f8101e1ec6b11f3))
* **utils:** address issues in printing override warnings ([#1113](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1113)) ([1732949](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/1732949a7b81fe4670d642a83db091e08b954317))

## [2.67.0](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/compare/v2.14.0...v2.67.0) (2024-08-24)

Test Release

### Features

* **apigateway:** accept MethodResponses along with IntegrationResponses ([#1146](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1146)) ([c351953](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/c35195335b530bde8e782bdc2ded8003060c9650))
* **aws-apigateway-*:** add optional request templates for non-default content-types. ([#888](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/888)) ([ace70f0](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/ace70f0ff9efed0cd1cdf46cabd8fa2e9f0e1bcc))
* **aws-apigateway-dynamodb:** add optional resourceName parameter ([#898](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/898)) ([09e54ec](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/09e54ec2150257be3e2c1cb1aa42124aa4e8f55e))
* **aws-cloudfront-apigateway-lambda:** require explicit authentication type ([#1044](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1044)) ([720dec5](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/720dec500a728a3c57832b7e479ee8eca1f08056))
* **aws-cloudfront-s3:** update construct to use origin access controls; add support for CMK-encrypted buckets ([#1038](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1038)) ([012f9e7](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/012f9e7b6ebd3a717ff120941131a84e803b2922)), closes [#1037](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1037)
* **aws-constructs-factories:** add a factory for sqs queues ([#1131](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1131)) ([b35b9b8](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/b35b9b86dcbda1d90dceac1cc539be816defe288))
* **aws-constructs-factories:** add state machine factory ([#1128](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1128)) ([d82342c](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/d82342c99c1b5ec77a015c96620bc99b0650346f))
* **aws-dynamodbstreams-lambda-elasticsearch-kibana:** Added VPC support ([#816](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/816)) ([30a5160](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/30a5160ce3165fa838e571fabb0d31c13961bb8f))
* **aws-iot-lambda-dynamodb:** add vpc and environment variable name to construct interface ([#894](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/894)) ([8ee687a](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/8ee687a8d644be8c7db8f905a55e5fced5a70bfc))
* **aws-lambda-kinesisstream:** created new construct  ([#873](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/873)) ([81592de](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/81592de3b14a9d6f01a7e61519be6c6b90695cff))
* **aws-lambda-opensearch:** created new construct ([#818](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/818)) ([f31f59d](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/f31f59d1ce4d945508f999d58905b1775f26a891))
* **aws-openapi-lambda:** make names unique ([#987](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/987)) ([be9997a](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/be9997a4e7e376670ef7f3d8bf1335ea3cebc515))
* **aws-wafwebacl-agigateway:** enable govcloud ([#900](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/900)) ([dd19d93](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/dd19d9363fa6c33b0c616a1a5392c26369bc02b2))
* **aws-wafwebacl-appsync:** created new construct ([#833](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/833)) ([1c708b9](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/1c708b9bb2527ba2cbec974eab3a0e272ad26ad4))
* **cloudfront constructs:** add s3 access logging to cloudfront access log buckets by default ([#1042](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1042)) ([51ec028](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/51ec028ebd4763965671483e74924e3b8e328337))
* **new construct:** aws-fargate-kinesisfirehose ([#881](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/881)) ([3a74a27](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/3a74a27f9c3e895a44b485ee1bb8fe9adc50a80e))
* **new construct:** aws-fargate-kinesisstreams ([#877](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/877)) ([08b7975](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/08b79756743e4a3f9930128e8318670666e01367)), closes [#875](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/875)
* **new construct:** aws-lambda-kendra ([#989](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/989)) ([24fe018](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/24fe018898dafd4be2d20d6636ad54333da4145d))
* **new construct:** aws-lambda-kinesisfirehose ([#875](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/875)) ([aef3efa](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/aef3efab4b4658f12ed82937683d08997162d9bc))
* **new construct:** aws-openapigateway-lambda ([#912](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/912)) ([09465d6](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/09465d65fc5969da5691cf5057c278ded8753b43)), closes [#910](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/910) [#917](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/917) [#922](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/922) [#929](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/929) [#930](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/930)
* **s3:** constructs factories - create well architected s3 buckets ([#1110](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1110)) ([f561cf6](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/f561cf65c377684c0579417b404b33cdc97fa407))


### Bug Fixes

* **all constructs:** use aws.partition where value could refer to govcloud ([#941](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/941)) ([e4cc3c0](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/e4cc3c090d669a8f163adb013c26fcd3796b5d8b))
* **all:** correct aws-cdk-lib version in peerdependency ([#1081](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1081)) ([1ad214d](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/1ad214d9f85a742a168734a0b29ace597fd60e4d))
* **all:** typos ([#1010](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1010)) ([0787baf](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/0787baf7c68f84599139e5b886d5942b076174f2))
* **aws-alb-fargate:** change container used to launch integ tests ([#962](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/962)) ([30ba7d9](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/30ba7d94a3cdd3766c24af49dbf66e56053b7b41))
* **aws-apigateway-sqs:** Remove /message path when delete method is not allowed ([#1030](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1030)) ([f772200](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/f772200d6885cf0e0030239ce6f7511cdb2814d6))
* **aws-cloudfront-s3:** observe props.logCloudFrontAccessLog ([#1170](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1170)) ([b2b8201](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/b2b8201930326fe7de93d7eadf808f899fa8aa25))
* **aws-eventbridge-sns:** long sns topic names break eventbridge bindings ([#1024](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1024)) ([9da7065](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/9da706586cf6cceb9bf4eba3cb9332003af195e0))
* **aws-s3-cloudfront:** address handling and definition of peripheral buckets ([#1129](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1129)) ([8b30791](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/8b30791902e09db2f7c49410a03d5d95ccc2ef51))
* **aws-sns-sqs:** fix circular dependency error in aws-sns-sqs ([#1122](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1122)) ([2366272](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/23662723b477baf43787979cb9c8b809ceba6dfe))
* **kms:** do not use fixed name when building kms key constructs ([#1103](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1103)) ([a5fa0f9](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/a5fa0f957e763802062dcb99d2b0508ad3f09154))
* **npmlog:** update npmlog version ([#1075](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1075)) ([968639a](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/968639ae3048dc933a6c6e7baf9013e0f41bd16a))
* **openapigateway-to-lambda:** refine python example in README based on deployed code ([#1093](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1093)) ([57738a2](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/57738a227fb073188ce1ac1c06c696e03e87bfae))
* **readme.md files:** update all documentation links to v2 ([#815](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/815)) ([ad1f9d7](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/ad1f9d77ad956f6a139adceec1891132996611ee))
* **resources/template-writer:** add IAM policy as customResource dependency ([#1148](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1148)) ([bbdeddd](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/bbdeddd4b5c57cdc2397f82d1724027e610df550))
* **s3-bucket-helper:** not populating response.loggingBucket when bucket supplied ([#934](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/934)) ([b65986d](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/b65986d7d1791c2ed19e62c8f39ffe42b6f2a274))
* **s3-constructs:** accommodate s3 change that disables acls by default ([#949](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/949)) ([46d02cc](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/46d02ccf98e368206b59c27a16003dc3b16d4236))
* **StepFunctions:** Address LogGroup behavior problems ([#922](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/922)) ([84e581c](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/84e581cad10f59daf827fb6e8f8101e1ec6b11f3))
* **utils:** address issues in printing override warnings ([#1113](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1113)) ([1732949](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/1732949a7b81fe4670d642a83db091e08b954317))

## [2.66.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.65.0...v2.66.0) (2024-08-22)

Built on CDK v2.151.0

There are no other changes in this release, we are testing our upgraded release pipeline

## [2.65.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.64.0...v2.65.0) (2024-08-11)

Built on CDK v2.150.0

### Bug Fixes
* **aws-apiv2gatewaywebsockets-sqs:** fix for custom websocket route not mapping to request template ([#1171](https://github.com/awslabs/aws-solutions-constructs/issues/1171))

* **aws-cloudfront-s3:** observe props.logCloudFrontAccessLog ([#1170](https://github.com/awslabs/aws-solutions-constructs/issues/1170)) ([b2b8201](https://github.com/awslabs/aws-solutions-constructs/commit/b2b8201930326fe7de93d7eadf808f899fa8aa25))

## [2.64.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.63.0...v2.64.0) (2024-07-31)

Built on CDK v2.150.0

* **aws-alb-lambda** allow vpc in loadBalancerProps when specifying subnets ([#1161](https://github.com/awslabs/aws-solutions-constructs/issues/1161))

## [2.63.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.62.0...v2.63.0) (2024-07-19)

Built on CDK v2.150.0

* **aws-apigatewayv2websockets-sqs:** New construct! ([#1140](https://github.com/awslabs/aws-solutions-constructs/pull/1140))

## [2.62.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.61.0...v2.62.0) (2024-07-16)

Built on CDK v2.147.3

### Features

* **apigateway:** accept MethodResponses along with IntegrationResponses ([#1146](https://github.com/awslabs/aws-solutions-constructs/issues/1146)) ([c351953](https://github.com/awslabs/aws-solutions-constructs/commit/c35195335b530bde8e782bdc2ded8003060c9650))


### Bug Fixes

* **resources/template-writer:** add IAM policy as customResource dependency ([#1148](https://github.com/awslabs/aws-solutions-constructs/issues/1148)) ([bbdeddd](https://github.com/awslabs/aws-solutions-constructs/commit/bbdeddd4b5c57cdc2397f82d1724027e610df550))

## [2.61.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.60.0...v2.61.0) (2024-07-05)

Built on CDK v2.147.3

### Maintenance

* Updated all javascript to Node.js 20

## [2.60.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.59.0...v2.60.0) (2024-06-11)

Built on CDK v2.145.0

### Features

* **aws-constructs-factories:** add a factory for sqs queues ([#1131](https://github.com/awslabs/aws-solutions-constructs/issues/1131)) ([b35b9b8](https://github.com/awslabs/aws-solutions-constructs/commit/b35b9b86dcbda1d90dceac1cc539be816defe288))

WARNING - This release changes the resource IDs of DLQs. As a result a stack update will delete the existing DLQ and create a new one. Before updating your stack, process all messages in your current DLQ.

## [2.59.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.58.1...v2.59.0) (2024-06-08)

Built on CDK v2.143.0

### Features

* **aws-constructs-factories:** add state machine factory ([#1128](https://github.com/awslabs/aws-solutions-constructs/issues/1128)) ([d82342c](https://github.com/awslabs/aws-solutions-constructs/commit/d82342c99c1b5ec77a015c96620bc99b0650346f))

### Bug Fixes

* **aws-s3-cloudfront:** address handling and definition of peripheral buckets ([#1129](https://github.com/awslabs/aws-solutions-constructs/issues/1129)) ([8b30791](https://github.com/awslabs/aws-solutions-constructs/commit/8b30791902e09db2f7c49410a03d5d95ccc2ef51))

## [2.58.1](https://github.com/awslabs/aws-solutions-constructs/compare/v2.58.0...v2.58.1) (2024-05-28)

Built on CDK v2.143.0

No library changes - testing changes in our CI/CD process

## [2.58.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.57.0...v2.58.0) (2024-05-25)

Built on CDK v2.143.0

### Bug Fixes

* **aws-sns-sqs:** fix circular dependency error in aws-sns-sqs ([#1122](https://github.com/awslabs/aws-solutions-constructs/issues/1122)) ([2366272](https://github.com/awslabs/aws-solutions-constructs/commit/23662723b477baf43787979cb9c8b809ceba6dfe))

## [2.57.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.56.0...v2.57.0) (2024-05-06)

Built on CDK v2.138.0

### Bug Fixes

* **utils:** address issues in printing override warnings ([#1113](https://github.com/awslabs/aws-solutions-constructs/issues/1113)) ([1732949](https://github.com/awslabs/aws-solutions-constructs/commit/1732949a7b81fe4670d642a83db091e08b954317))

## [2.56.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.55.0...v2.56.0) (2024-04-24)

Built on CDK v2.138.0

### Features

* **s3:** constructs factories - create well architected s3 buckets ([#1110](https://github.com/awslabs/aws-solutions-constructs/issues/1110)) ([f561cf6](https://github.com/awslabs/aws-solutions-constructs/commit/f561cf65c377684c0579417b404b33cdc97fa407))

## [2.55.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.54.1...v2.55.0) (2024-04-12)

Built on CDK v2.135.0

### Bug Fixes

* **kms:** do not use fixed name when building kms key constructs ([#1103](https://github.com/awslabs/aws-solutions-constructs/issues/1103)) ([a5fa0f9](https://github.com/awslabs/aws-solutions-constructs/commit/a5fa0f957e763802062dcb99d2b0508ad3f09154))

## [2.54.1](https://github.com/awslabs/aws-solutions-constructs/compare/v2.54.0...v2.54.1) (2024-04-04)

Built on CDK v2.135.0

### Bug Fixes

* **openapigateway-to-lambda:** refine python example in README based on deployed code ([#1093](https://github.com/awslabs/aws-solutions-constructs/issues/1093)) ([57738a2](https://github.com/awslabs/aws-solutions-constructs/commit/57738a227fb073188ce1ac1c06c696e03e87bfae))

* **aws-kinesisstreams-kinesisfirehose-s3:** allow later versions of cdk lib by updating peerDependencies ([#1094](https://github.com/awslabs/aws-solutions-constructs/issues/1094)) ([e08903f7f6839e343cd0df207ae80c03c2dcace3](https://github.com/awslabs/aws-solutions-constructs/pull/1095/commits/e08903f7f6839e343cd0df207ae80c03c2dcace3))

## [2.54.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.53.0...v2.54.0) (2024-02-29)

Built on CDK v2.130.0

### Bug Fixes

* **step-functions** no longer attempt to modify cloudwatch logs permissions for state machines ([#1090](https://github.com/awslabs/aws-solutions-constructs/pull/1090))

## [2.53.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.52.1...v2.53.0) (2024-02-22)

Built on CDK v2.127.0

### Bug Fixes

* **stepfunctions** find correct logs policy statement to replace ([#1086](https://github.com/awslabs/aws-solutions-constructs/pull/1086))

## [2.52.1](https://github.com/awslabs/aws-solutions-constructs/compare/v2.52.0...v2.52.1) (2024-02-16)

Built on CDK v2.127.0

### Bug Fixes

* **all:** correct aws-cdk-lib version in peerdependency ([#1081](https://github.com/awslabs/aws-solutions-constructs/issues/1081)) ([1ad214d](https://github.com/awslabs/aws-solutions-constructs/commit/1ad214d9f85a742a168734a0b29ace597fd60e4d))

## [2.52.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.51.0...v2.52.0) (2024-02-12)

Built on CDK v2.127.0

### Bug Fixes

* **npmlog:** update npmlog version ([#1075](https://github.com/awslabs/aws-solutions-constructs/issues/1075)) ([968639a](https://github.com/awslabs/aws-solutions-constructs/commit/968639ae3048dc933a6c6e7baf9013e0f41bd16a))

## [2.51.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.50.0...v2.51.0) (2024-01-30)

Built on CDK v2.118.0

* **all:** lack of ^ in package.json led to version incompability (PR [1066](https://github.com/awslabs/aws-solutions-constructs/pull/1066))


## [2.50.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.49.0...v2.50.0) (2024-01-30)

Built on CDK v2.118.0

### Bug Fixes

* **aws-eventbridge-lambda:** handle provided role correctly (PR [1063](https://github.com/awslabs/aws-solutions-constructs/pull/1063))

## [2.49.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.48.0...v2.49.0) (2024-01-23)

Built on CDK v2.118.0

### Bug Fixes

* **aws-cloudfront-s3:** do not create s3 access log bucket for cf log bucket when an existing bucket is provided (PR [1052](https://github.com/awslabs/aws-solutions-constructs/pull/1052))

* **aws-cloudfront-s3:** insert empty originAccessIdentity (PR [1053](https://github.com/awslabs/aws-solutions-constructs/pull/1053))

## [2.48.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.47.0...v2.48.0) (2024-01-09)

Built on CDK v2.111.0

### ⚠ BREAKING CHANGES

* **aws-cloudfront-apigateway-lambda:** require explicit authentication type ([#1044](https://github.com/awslabs/aws-solutions-constructs/issues/1044)) ([720dec5](https://github.com/awslabs/aws-solutions-constructs/commit/720dec500a728a3c57832b7e479ee8eca1f08056))

### Features

* **aws-cloudfront-s3:** update construct to use origin access controls; add support for CMK-encrypted buckets ([#1038](https://github.com/awslabs/aws-solutions-constructs/issues/1038)) ([012f9e7](https://github.com/awslabs/aws-solutions-constructs/commit/012f9e7b6ebd3a717ff120941131a84e803b2922)), closes [#1037](https://github.com/awslabs/aws-solutions-constructs/issues/1037)
* **cloudfront constructs:** add s3 access logging to cloudfront access log buckets by default ([#1042](https://github.com/awslabs/aws-solutions-constructs/issues/1042)) ([51ec028](https://github.com/awslabs/aws-solutions-constructs/commit/51ec028ebd4763965671483e74924e3b8e328337))

## [2.47.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.46.0...v2.47.0) (2023-12-01)

Built on CDK v2.111.0

### Bug Fixes

* **aws-apigateway-sqs:** Remove /message path when delete method is not allowed ([#1030](https://github.com/awslabs/aws-solutions-constructs/issues/1030)) ([f772200](https://github.com/awslabs/aws-solutions-constructs/commit/f772200d6885cf0e0030239ce6f7511cdb2814d6))
=======

## [2.47.0](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/compare/v2.14.0...v2.47.0) (2023-11-27)

Test Release


### Features

* **aws-apigateway-*:** add optional request templates for non-default content-types. ([#888](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/888)) ([ace70f0](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/ace70f0ff9efed0cd1cdf46cabd8fa2e9f0e1bcc))
* **aws-apigateway-dynamodb:** add optional resourceName parameter ([#898](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/898)) ([09e54ec](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/09e54ec2150257be3e2c1cb1aa42124aa4e8f55e))
* **aws-dynamodbstreams-lambda-elasticsearch-kibana:** Added VPC support ([#816](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/816)) ([30a5160](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/30a5160ce3165fa838e571fabb0d31c13961bb8f))
* **aws-iot-lambda-dynamodb:** add vpc and environment variable name to construct interface ([#894](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/894)) ([8ee687a](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/8ee687a8d644be8c7db8f905a55e5fced5a70bfc))
* **aws-lambda-kinesisstream:** created new construct  ([#873](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/873)) ([81592de](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/81592de3b14a9d6f01a7e61519be6c6b90695cff))
* **aws-lambda-opensearch:** created new construct ([#818](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/818)) ([f31f59d](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/f31f59d1ce4d945508f999d58905b1775f26a891))
* **aws-openapi-lambda:** make names unique ([#987](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/987)) ([be9997a](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/be9997a4e7e376670ef7f3d8bf1335ea3cebc515))

* **aws-wafwebacl-agigateway:** enable govcloud ([#900](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/900)) ([dd19d93](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/dd19d9363fa6c33b0c616a1a5392c26369bc02b2))
* **aws-wafwebacl-appsync:** created new construct ([#833](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/833)) ([1c708b9](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/1c708b9bb2527ba2cbec974eab3a0e272ad26ad4))
* **new construct:** aws-fargate-kinesisfirehose ([#881](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/881)) ([3a74a27](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/3a74a27f9c3e895a44b485ee1bb8fe9adc50a80e))
* **new construct:** aws-fargate-kinesisstreams ([#877](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/877)) ([08b7975](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/08b79756743e4a3f9930128e8318670666e01367)), closes [#875](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/875)
* **new construct:** aws-lambda-kendra ([#989](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/989)) ([24fe018](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/24fe018898dafd4be2d20d6636ad54333da4145d))
* **new construct:** aws-lambda-kinesisfirehose ([#875](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/875)) ([aef3efa](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/aef3efab4b4658f12ed82937683d08997162d9bc))
* **new construct:** aws-openapigateway-lambda ([#912](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/912)) ([09465d6](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/09465d65fc5969da5691cf5057c278ded8753b43)), closes [#910](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/910) [#917](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/917) [#922](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/922) [#929](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/929) [#930](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/930)



### Bug Fixes

* **all constructs:** use aws.partition where value could refer to govcloud ([#941](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/941)) ([e4cc3c0](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/e4cc3c090d669a8f163adb013c26fcd3796b5d8b))
* **all:** typos ([#1010](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1010)) ([0787baf](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/0787baf7c68f84599139e5b886d5942b076174f2))
* **aws-alb-fargate:** change container used to launch integ tests ([#962](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/962)) ([30ba7d9](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/30ba7d94a3cdd3766c24af49dbf66e56053b7b41))
* **aws-apigateway-sqs:** Remove /message path when delete method is not allowed ([#1030](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1030)) ([f772200](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/f772200d6885cf0e0030239ce6f7511cdb2814d6))
* **aws-eventbridge-sns:** long sns topic names break eventbridge bindings ([#1024](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/1024)) ([9da7065](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/9da706586cf6cceb9bf4eba3cb9332003af195e0))
* **readme.md files:** update all documentation links to v2 ([#815](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/815)) ([ad1f9d7](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/ad1f9d77ad956f6a139adceec1891132996611ee))
* **s3-bucket-helper:** not populating response.loggingBucket when bucket supplied ([#934](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/934)) ([b65986d](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/b65986d7d1791c2ed19e62c8f39ffe42b6f2a274))
* **s3-constructs:** accommodate s3 change that disables acls by default ([#949](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/949)) ([46d02cc](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/46d02ccf98e368206b59c27a16003dc3b16d4236))
* **StepFunctions:** Address LogGroup behavior problems ([#922](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/issues/922)) ([84e581c](https://github.com/aws-solutions-constructs-team/aws-solutions-constructs-test/commit/84e581cad10f59daf827fb6e8f8101e1ec6b11f3))

## [2.46.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.45.0...v2.46.0) (2023-11-09)

Built on CDK v2.105.0
Renaming and refreshing of all integration test files

### Bug Fixes

* **aws-eventbridge-sns:** long sns topic names break eventbridge bindings ([#1024](https://github.com/awslabs/aws-solutions-constructs/issues/1024)) ([9da7065](https://github.com/awslabs/aws-solutions-constructs/commit/9da706586cf6cceb9bf4eba3cb9332003af195e0))

## [2.45.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.44.0...v2.45.0) (2023-10-14)

Built on CDK v2.99.1
Significant internal clean up chores

### Bug Fixes

* **all:** typos ([#1010](https://github.com/awslabs/aws-solutions-constructs/issues/1010)) ([0787baf](https://github.com/awslabs/aws-solutions-constructs/commit/0787baf7c68f84599139e5b886d5942b076174f2))

## [2.44.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.43.0...v2.44.0) (2023-08-29)

Built on CDK v2.82.0 (no new features, just internal housekeeping)

### Bug Fixes

* **aws-lambda-kendra:** fixed package.json issues

## [2.43.1](https://github.com/awslabs/aws-solutions-constructs/compare/v2.43.0...v2.43.1) (2023-08-28)

BUG NOTICE - THIS RELEASE WAS ONLY PARTIALLY PUBLISHED in PYPI, USE 2.44.0

Built on CDK v2.82.0

### Bug Fixes

* **aws-lambda-kendra:** remove extra info from bottom of package.json

## [2.43.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.42.0...v2.43.0) (2023-08-28)

BUG NOTICE - THIS RELEASE WAS ONLY PARTIALLY PUBLISHED in PYPI, USE 2.44.0

Built on CDK v2.82.0

### Bug Fixes

* **aws-kinesisfirehose-s3:** resource name collision when two instances deployed in same stack ([#991](https://github.com/awslabs/aws-solutions-constructs/pull/991))

### Features

* **aws-openapi-lambda:** make names unique ([#987](https://github.com/awslabs/aws-solutions-constructs/issues/987)) ([be9997a](https://github.com/awslabs/aws-solutions-constructs/commit/be9997a4e7e376670ef7f3d8bf1335ea3cebc515))
* **new construct:** aws-lambda-kendra ([#989](https://github.com/awslabs/aws-solutions-constructs/issues/989)) ([24fe018](https://github.com/awslabs/aws-solutions-constructs/commit/24fe018898dafd4be2d20d6636ad54333da4145d))

## [2.42.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.41.0...v2.42.0) (2023-08-12)

Build on CDK v2.82.0

### Features

* **new construct:** aws-openapigateway-lambda ([#912](https://github.com/awslabs/aws-solutions-constructs/issues/912)) ([09465d6](https://github.com/awslabs/aws-solutions-constructs/commit/09465d65fc5969da5691cf5057c278ded8753b43)), closes [#910](https://github.com/awslabs/aws-solutions-constructs/issues/910) [#917](https://github.com/awslabs/aws-solutions-constructs/issues/917) [#922](https://github.com/awslabs/aws-solutions-constructs/issues/922) [#929](https://github.com/awslabs/aws-solutions-constructs/issues/929) [#930](https://github.com/awslabs/aws-solutions-constructs/issues/930)

## [2.41.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.40.0...v2.41.0) (2023-06-06)

Built on CDK v2.82.0

## [2.40.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.39.0...v2.40.0) (2023-06-03)

Built on CDK v2.82.0

### Bug Fixes

* **s3 buckets:** do not remove lifecycle rules from log buckets ([#969](https://github.com/awslabs/aws-solutions-constructs/issues/969))

* **aws-alb-fargate:** change container used to launch integ tests ([#962](https://github.com/awslabs/aws-solutions-constructs/issues/962)) ([30ba7d9](https://github.com/awslabs/aws-solutions-constructs/commit/30ba7d94a3cdd3766c24af49dbf66e56053b7b41))

## [2.39.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.38.0...v2.39.0) (2023-04-23)

Built on CDK v2.76.0

### Bug Fixes

* **aws-*-stepfunctions:** generate stack specific physical log group name ([#945](https://github.com/awslabs/aws-solutions-constructs/issues/945)) ([3e46579](https://github.com/awslabs/aws-solutions-constructs/commit/3e46579ef02e726143cf437be293c9435d013f5f))

## [2.38.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.37.0...v2.38.0) (2023-04-16)

Build on CDK v2.74.0

### Bug Fixes

* **s3-constructs:** accommodate s3 change that disables acls by default ([#949](https://github.com/awslabs/aws-solutions-constructs/issues/949)) ([46d02cc](https://github.com/awslabs/aws-solutions-constructs/commit/46d02ccf98e368206b59c27a16003dc3b16d4236))

## [2.37.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.36.0...v2.37.0) (2023-04-11)

Built on CDK v2.73.0

### Features

* **wafwebacl-all:** allow any type for webAclProps ([#943](https://github.com/awslabs/aws-solutions-constructs/pull/943))

### Bug Fixes

* **all constructs:** use aws.partition where value could refer to govcloud ([#941](https://github.com/awslabs/aws-solutions-constructs/issues/941)) ([e4cc3c0](https://github.com/awslabs/aws-solutions-constructs/commit/e4cc3c090d669a8f163adb013c26fcd3796b5d8b))
* **s3-bucket-helper:** not populating response.loggingBucket when bucket supplied ([#934](https://github.com/awslabs/aws-solutions-constructs/issues/934)) ([b65986d](https://github.com/awslabs/aws-solutions-constructs/commit/b65986d7d1791c2ed19e62c8f39ffe42b6f2a274))

## [2.36.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.35.0...v2.36.0) (2023-03-29)

Built on CDK v2.71.0

## [2.35.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.34.0...v2.35.0) (2023-03-23)

Built on CDK v2.68.0

### Bug Fixes

* **aws-cloudfront-s3** Set s3LoggingBucket property ([#930](https://github.com/awslabs/aws-solutions-constructs/pull/930))

## [2.34.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.33.0...v2.34.0) (2023-03-18)

Built on CDK v2.68.0

### Bug Fixes

* **StepFunctions:** Address LogGroup behavior problems ([#922](https://github.com/awslabs/aws-solutions-constructs/issues/922)) ([84e581c](https://github.com/awslabs/aws-solutions-constructs/commit/84e581cad10f59daf827fb6e8f8101e1ec6b11f3))

## [2.33.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.32.0...v2.33.0) (2023-03-03)

Build on CDK v2.67.0

### Features

* **aws-apigateway-dynamodb:** add optional resourceName parameter ([#898](https://github.com/awslabs/aws-solutions-constructs/issues/898)) ([09e54ec](https://github.com/awslabs/aws-solutions-constructs/commit/09e54ec2150257be3e2c1cb1aa42124aa4e8f55e))

### Bug Fixes

* **core:** id conflict with multiple buildLambdaFunction() ([#910](https://github.com/awslabs/aws-solutions-constructs/pull/910))

## [2.32.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.31.0...v2.32.0) (2023-02-14)

Build on CDK 2.64.0

### Features

* **aws-wafwebacl-agigateway:** enable govcloud ([#900](https://github.com/awslabs/aws-solutions-constructs/issues/900)) ([dd19d93](https://github.com/awslabs/aws-solutions-constructs/commit/dd19d9363fa6c33b0c616a1a5392c26369bc02b2))

## [2.31.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.30.0...v2.31.0) (2023-02-09)

Build on CDK 2.64.0

### Features

* **aws-apigateway-*:** add optional request templates for non-default content-types. ([#888](https://github.com/awslabs/aws-solutions-constructs/issues/888)) ([ace70f0](https://github.com/awslabs/aws-solutions-constructs/commit/ace70f0ff9efed0cd1cdf46cabd8fa2e9f0e1bcc))
* **aws-iot-lambda-dynamodb:** add vpc and environment variable name to construct interface ([#894](https://github.com/awslabs/aws-solutions-constructs/issues/894)) ([8ee687a](https://github.com/awslabs/aws-solutions-constructs/commit/8ee687a8d644be8c7db8f905a55e5fced5a70bfc))

## [2.30.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.29.0...v2.30.0) (2022-12-28)

Built on CDK 2.57.0

### Features

* **aws-lambda-kinesisstream:** created new construct  ([#873](https://github.com/awslabs/aws-solutions-constructs/issues/873)) ([81592de](https://github.com/awslabs/aws-solutions-constructs/commit/81592de3b14a9d6f01a7e61519be6c6b90695cff))
* **new construct:** aws-fargate-kinesisfirehose ([#881](https://github.com/awslabs/aws-solutions-constructs/issues/881)) ([3a74a27](https://github.com/awslabs/aws-solutions-constructs/commit/3a74a27f9c3e895a44b485ee1bb8fe9adc50a80e))
* **new construct:** aws-fargate-kinesisstreams ([#877](https://github.com/awslabs/aws-solutions-constructs/issues/877)) ([08b7975](https://github.com/awslabs/aws-solutions-constructs/commit/08b79756743e4a3f9930128e8318670666e01367)), closes [#875](https://github.com/awslabs/aws-solutions-constructs/issues/875)
* **new construct:** aws-lambda-kinesisfirehose ([#875](https://github.com/awslabs/aws-solutions-constructs/issues/875)) ([aef3efa](https://github.com/awslabs/aws-solutions-constructs/commit/aef3efab4b4658f12ed82937683d08997162d9bc))

## [2.29.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.28.0...v2.29.0) (2022-12-04)

### Features

* **aws-s3-sns:** created new construct ([#849](https://github.com/awslabs/aws-solutions-constructs/pull/849))
* **aws-cloudfront-*:** Add optional parameter cloudfront.ResponseHeadersPolicyProps ([#852](https://github.com/awslabs/aws-solutions-constructs/pull/852))
* Standardize how encryption properties are used for SNS/SQS construct ([#846](https://github.com/awslabs/aws-solutions-constructs/pull/846))

## [2.28.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.27.0...v2.28.0) (2022-11-30)

Built on CDK 2.53.0

### Chores

* Standardize how encryption properties are used for SNS/SQS constructs ([#846](https://github.com/awslabs/aws-solutions-constructs/pull/846)) 
* Lots of housekeeping, documentation edits

## [2.27.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.26.0...v2.27.0) (2022-11-02)

Built on CDK 2.50.0

### Features

* **aws-wafwebacl-appsync:** created new construct ([#833](https://github.com/awslabs/aws-solutions-constructs/issues/833)) ([1c708b9](https://github.com/awslabs/aws-solutions-constructs/commit/1c708b9bb2527ba2cbec974eab3a0e272ad26ad4))

* **aws-fargate-opensearch:** created new construct ([#823](https://github.com/awslabs/aws-solutions-constructs/issues/823))


## [2.26.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.25.0...v2.26.0) (2022-10-12)

### Features

* **aws-dynamodbstreams-lambda-elasticsearch-kibana:** Added VPC support ([#816](https://github.com/awslabs/aws-solutions-constructs/issues/816)) ([30a5160](https://github.com/awslabs/aws-solutions-constructs/commit/30a5160ce3165fa838e571fabb0d31c13961bb8f))

* **aws-lambda-opensearch:** created new construct ([#818](https://github.com/awslabs/aws-solutions-constructs/issues/818)) ([f31f59d](https://github.com/awslabs/aws-solutions-constructs/commit/f31f59d1ce4d945508f999d58905b1775f26a891))

## [2.25.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.24.0...v2.25.0) (2022-09-13)

(no functional changes in this release)
Built on CDK 2.45.0

## [2.24.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.23.0...v2.24.0) (2022-09-13)

(no changes in this release)

## [2.23.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.22.0...v2.23.0) (2022-09-12)

(no changes in this release)
Note - 2.23.0 is not available in Maven
## [2.22.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.21.0...v2.22.0) (2022-09-11)

(no changes in this release)
Note - 2.22.0 is not available in Maven

## [2.21.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.20.0...v2.21.0) (2022-08-26)

* **Upgrade to Typescript 4.7.4:** ([#783](https://github.com/awslabs/aws-solutions-constructs/pull/783))
* **Update contributing.md:** ensure all instructions reflect that v2 is now the only cdk version ([#785](https://github.com/awslabs/aws-solutions-constructs/pull/785))

## [2.20.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.19.0...v2.20.0) (2022-08-25)

(no changes in this release)

## [2.19.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.18.0...v2.19.0) (2022-08-24)

(no changes in this release)

## [2.18.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.17.0...v2.18.0) (2022-08-19)

(no changes in this release)

## [2.17.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.16.0...v2.17.0) (2022-08-17)

This is one of a number of identical releases we have created as we overhaul our release process for CDK V2 and the deprecation of V1

## [2.16.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.14.0...v2.16.0) (2022-08-16)


## Note - there is no Release 2.15.0
## [2.14.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.13.0...v2.14.0) (2022-08-09)

* Built upon underlying CDK version V2.36.0

## [2.13.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.12.0...v2.13.0) (2022-08-09)

* Built upon underlying CDK version V2.25.0

## [2.12.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.11.0...v2.12.0) (2022-07-26)

* Built upon underlying CDK version V2.25.0

## [2.11.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.10.0...v2.11.0) (2022-07-18)

* Built upon underlying CDK version V2.24.0

### Features

* **aws-lambda-elasticsearch-kibana:** added VPC support ([#718](https://github.com/awslabs/aws-solutions-constructs/issues/718)) ([33e8f17](https://github.com/awslabs/aws-solutions-constructs/commit/33e8f17a1d1df5be78882a8a59b54d689fea1e82))

## [2.10.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.9.0...v2.10.0) (2022-07-01)

* Includes all functionality of V1.157.0
* Built upon underlying CDK version V2.24.0

## [2.9.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.8.0...v2.9.0) (2022-06-13)

* Includes all functionality of V1.157.0
* Built upon underlying CDK version V2.23.0

## [2.8.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.7.0...v2.8.0) (2022-05-20)

* Includes all functionality of V1.156.1
* Built upon underlying CDK version V2.23.0
## [2.7.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.6.0...v2.7.0) (2022-05-09)

* Includes all functionality of V1.154.0
* Built upon underlying CDK version V2.23.0

## [2.6.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.5.0...v2.6.0) (2022-05-07)

* Includes all functionality of V1.153.1
* Built upon underlying CDK version V2.15.0

### Features

* **aws-fargate-dynamodb:** create new construct ([#633](https://github.com/awslabs/aws-solutions-constructs/issues/633)) ([0b35418](https://github.com/awslabs/aws-solutions-constructs/commit/0b35418b41e24b32b6064a649d77a70f1c6d7bd8))
* **aws-fargate-secretsmanager:** Create new construct ([#670](https://github.com/awslabs/aws-solutions-constructs/issues/670)) ([cd218b6](https://github.com/awslabs/aws-solutions-constructs/commit/cd218b6900a174afa09c86f28fb0650ecfe37942))
* **aws-fargate-ssmstringparameter:** New Construct ([#653](https://github.com/awslabs/aws-solutions-constructs/issues/653)) ([bcb7c63](https://github.com/awslabs/aws-solutions-constructs/commit/bcb7c6351ffa9b8ef5f5e7790522c5b1fe87dd9a))
* **aws-lambda-elasticachmemcached:** New Construct ([#675](https://github.com/awslabs/aws-solutions-constructs/issues/675)) ([14c50ae](https://github.com/awslabs/aws-solutions-constructs/commit/14c50ae86e84b05d1395293a001c4baa5d5f9fce))
* **aws-s3-stepfunctions:** Changed escape hatch to eventBridgeEnabled prop ([#666](https://github.com/awslabs/aws-solutions-constructs/issues/666)) ([bc2f733](https://github.com/awslabs/aws-solutions-constructs/commit/bc2f733879a5363407729e1f236302c9361ff652))
* **README.md:** add python and java minimal deployment ([#582](https://github.com/awslabs/aws-solutions-constructs/issues/582)) ([2ecd9dd](https://github.com/awslabs/aws-solutions-constructs/commit/2ecd9dd935b731d2e4705ed9c146efcad0961fd8))


### Bug Fixes

* **aws-lambda-secretsmanager:** Update docs  ([#673](https://github.com/awslabs/aws-solutions-constructs/issues/673)) ([1b843bf](https://github.com/awslabs/aws-solutions-constructs/commit/1b843bff718dd05376f4f72ff9075db123e05288))
* **Remove debug statement:** Remove extra debug statement in kinesisfirehose-s3 ([#649](https://github.com/awslabs/aws-solutions-constructs/issues/649)) ([26e9ec0](https://github.com/awslabs/aws-solutions-constructs/commit/26e9ec08257a90034b76a91ea4a3d703d13eb0a2))
* **Sonarqube configuration:** Replace comma between constructs ([#646](https://github.com/awslabs/aws-solutions-constructs/issues/646)) ([79e1b09](https://github.com/awslabs/aws-solutions-constructs/commit/79e1b09544c2d029fb73a2b500dde5e35edbf63a))

## [2.5.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.4.0...v2.5.0) (2022-03-30)

### Features
* Includes all functionality of V1.148.0
* Built upon underlying CDK version V2.15.0

## [2.4.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.3.0...v2.4.0) (2022-03-29)

### Features
* Includes all functionality of V1.146.0
* Built upon underlying CDK version V2.15.0

## [2.3.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.2.0...v2.3.0) (2022-02-24)

### Features

* Includes all functionality of V1.139.0
* Built upon underlying CDK version V2.7.0
* **aws-fargate-sqs:** Created new construct ([#588](https://github.com/awslabs/aws-solutions-constructs/issues/588)) ([f7ddf3f](https://github.com/awslabs/aws-solutions-constructs/commit/f7ddf3f66c84a8cec4514ac08e1cb3445593d8bb))
* **aws-fargate-s3:** Created new construct ([#591](https://github.com/awslabs/aws-solutions-constructs/issues/591))

## [2.2.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.1.0...v2.2.0) (2022-01-20)

### Features

* Includes all functionality of V1.138.0
* Built upon underlying CDK version V2.4.0
* **aws-fargate-sns:** New Construct ([#574](https://github.com/awslabs/aws-solutions-constructs/issues/574)) ([5c86f3a](https://github.com/awslabs/aws-solutions-constructs/commit/5c86f3a711c45c8991b66369b7b5054d5e9229e1))
* **aws-route53-apigateway:** New Construct ([#511](https://github.com/awslabs/aws-solutions-constructs/issues/511)) ([81129dd](https://github.com/awslabs/aws-solutions-constructs/commit/81129ddfaebe198d10c2264feea95dae92205ab7))

## [2.1.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.0.0...v2.1.0) (2022-01-11)

### Features

* Includes all functionality of V1.137.0
* Build upon underlying CDK version V2.4.0

* **aws-alb-fargate:** New Construct ([#560](https://github.com/awslabs/aws-solutions-constructs/issues/560)) ([5a21b76](https://github.com/awslabs/aws-solutions-constructs/commit/5a21b7652be0be2c77957155a504a9582830eeba))
* **aws-iot-s3:** new construct implementation ([#469](https://github.com/awslabs/aws-solutions-constructs/issues/469)) ([ea024fc](https://github.com/awslabs/aws-solutions-constructs/commit/ea024fc87f40b288fc47f3a681907193c0f7ca6c))
* **s3-stepfunctions:** removed CloudTrail dependency after new S3 feature ([#529](https://github.com/awslabs/aws-solutions-constructs/issues/529)) ([639f473](https://github.com/awslabs/aws-solutions-constructs/commit/639f47396f868846a81d0f81b6eb8160c61c6ae3))

### Bug Fixes

* **aws-apigateway-iot and aws-cloudfront-apigateway-lambda:** fixed deprecated warnings ([#554](https://github.com/awslabs/aws-solutions-constructs/issues/554)) ([655c4af](https://github.com/awslabs/aws-solutions-constructs/commit/655c4aff27eff5cc4c82e170d90466fddc1aac04))
* **aws-s3-cloudfront:** Recognize when client specifies enforceSSL: false ([#559](https://github.com/awslabs/aws-solutions-constructs/issues/559)) ([fc4fab8](https://github.com/awslabs/aws-solutions-constructs/commit/fc4fab88a9cecef65a5dad84c1539daee7862887))

## [2.0.0](https://github.com/awslabs/aws-solutions-constructs/compare/v2.0.0-rc.2...v2.0.0) (2021-12-02)

* Includes all functionality of V1.129.0

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


### Bug Fixes

* **Update reference from existingBucketInterface to existingBucketObj:** Update Documentation [#520](https://github.com/awslabs/aws-solutions-constructs/issues/520) ([0c030e8](https://github.com/awslabs/aws-solutions-constructs/commit/0c030e82a83ffffd61b0ede90b379e7903008ab8))

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
* **Set outputBucket property on aws-kinesisstreams-gluejob:** Issue [#448](https://github.com/awslabs/aws-solutions-constructs/issues/448) to include S3 bucket for Glue Job that the construct creates ([#452](https://github.com/awslabs/aws-solutions-constructs/issues/452)) ([c40e1f7](https://github.com/awslabs/aws-solutions-constructs/commit/c40e1f7c3524652ac8e3277b1c482975e6df9e36))

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
