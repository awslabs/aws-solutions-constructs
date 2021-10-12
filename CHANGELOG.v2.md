# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 2.0.0-rc.1 (2021-10-12)


### ⚠ BREAKING CHANGES

* any testing snapshots will need to be refreshed.
* **aws-kinesisstreams-lambda:** DefaultKinesisEventSourceProps was removed from lambda-event-source-mapping-defaults and replaced with KinesisEventSourceProps. This now follows the same behavior as the aws-dynamodb-stream-lambda and aws-s3-lambda patterns (which use DynamoEventSourceProps and S3EventSourceProps instead of EventSourceMappingOptions)

Co-authored-by: Daniel Pinheiro <dspin@amazon.com>

### Features

* **aws-apigateway-iot:** new aws-apigateway-iot pattern implementation ([#83](https://github.com/awslabs/aws-solutions-constructs/issues/83)) ([5f91913](https://github.com/awslabs/aws-solutions-constructs/commit/5f919135a9e2a2688d6ca277e6af846b614d8e92))
* **aws-apigateway-kinesisstreams:** New aws-apigateway-kinesisstreams pattern implementation ([#56](https://github.com/awslabs/aws-solutions-constructs/issues/56)) ([abddeed](https://github.com/awslabs/aws-solutions-constructs/commit/abddeed6ae0d60f2af5a89aee170696bb4677810))
* **aws-apigateway-sagemakerendpoint:** New aws-apigateway-sagemakerendpoint pattern implementation ([#87](https://github.com/awslabs/aws-solutions-constructs/issues/87)) ([81d3b8b](https://github.com/awslabs/aws-solutions-constructs/commit/81d3b8b8ed9eabd4f2adbdc63d607975990c62ea))
* **aws-cloudfront-apigateway:** added cloudfrontLoggingBucketProps to cloudfront-apigateway ([#444](https://github.com/awslabs/aws-solutions-constructs/issues/444)) ([aa881db](https://github.com/awslabs/aws-solutions-constructs/commit/aa881db0c3cccc9cbcbd3e1c8be39ac093ebf2c5))
* **aws-cloudfront-mediastore:** new aws-cloudfront-mediastore pattern implementation ([#107](https://github.com/awslabs/aws-solutions-constructs/issues/107)) ([9246945](https://github.com/awslabs/aws-solutions-constructs/commit/9246945881010af144574e303792b5135c8e762c))
* **aws-cloudfront-s3:** added loggingBucketProps for cloudfront-s3 ([#419](https://github.com/awslabs/aws-solutions-constructs/issues/419)) ([743c874](https://github.com/awslabs/aws-solutions-constructs/commit/743c87485b5f173243423fa598a3f34e2eaacc16))
* **aws-eventbridge-kinesisstrems, aws-events-rule-kinesisstreams, aws-eventbridge-kinesisfirehose-s3, aws-events-rule-kinesisfirehose-s3:** support for custom EventBus ([#364](https://github.com/awslabs/aws-solutions-constructs/issues/364)) ([2ed5355](https://github.com/awslabs/aws-solutions-constructs/commit/2ed535576a3ecf9a4e425e63bfa11d52191491a2))
* **aws-eventbridge-lambda:**  Support for custom EventBus ([#354](https://github.com/awslabs/aws-solutions-constructs/issues/354)) ([fd750a5](https://github.com/awslabs/aws-solutions-constructs/commit/fd750a5fc02f23728214bba5ca2909c99cc6adb4))
* **aws-eventbridge-sns , aws-events-rule-sns, aws-events-rule-lambda:** custom event bus support ([#362](https://github.com/awslabs/aws-solutions-constructs/issues/362)) ([47221d9](https://github.com/awslabs/aws-solutions-constructs/commit/47221d9dfa2de30c9c33c74eff62a150cb477db0))
* **aws-eventbridge-sqs, aws-events-rule-sqs, aws-eventbridge-stepfunctions, aws-events-rule-step-function:** custom EventBus support ([#363](https://github.com/awslabs/aws-solutions-constructs/issues/363)) ([60dd243](https://github.com/awslabs/aws-solutions-constructs/commit/60dd24384f38fa39ce120c008ab7ce05964cd15e))
* **aws-events-rule-sqs & aws-events-rule-sns:** New aws-events-rule-sqs and aws-events-rule-sns pattern implementation ([#55](https://github.com/awslabs/aws-solutions-constructs/issues/55)) ([0397579](https://github.com/awslabs/aws-solutions-constructs/commit/03975799433bee20dab9884724a85aa0c669158d))
* **aws-iot-kinesisstreams:** implement new construct ([#383](https://github.com/awslabs/aws-solutions-constructs/issues/383)) ([9d2e5ec](https://github.com/awslabs/aws-solutions-constructs/commit/9d2e5ec2db2ce70d0498bbd133eaf4ed0c922157))
* **aws-iot-sqs:** initial implementation ([#267](https://github.com/awslabs/aws-solutions-constructs/issues/267)) ([5411ab7](https://github.com/awslabs/aws-solutions-constructs/commit/5411ab73301f85ff7a5df1e6425996e2c6e8ffb5)), closes [#266](https://github.com/awslabs/aws-solutions-constructs/issues/266)
* **aws-kinesisstreams-lambda:** Add ability to bring-your-own Kinesis Stream to this pattern ([#60](https://github.com/awslabs/aws-solutions-constructs/issues/60)) ([f5d8fe0](https://github.com/awslabs/aws-solutions-constructs/commit/f5d8fe077c5d3f3c8334c1cf1a16b5cd9a637a64))
* **aws-lambda-*:** add custom environment variable name ([#141](https://github.com/awslabs/aws-solutions-constructs/issues/141)) ([187724e](https://github.com/awslabs/aws-solutions-constructs/commit/187724e16c648824ff75fa40d6b0d13dce50b150))
* **aws-lambda-sagemakerendpoint:** new pattern aws-lambda-sagemakerendpoint implementation ([#112](https://github.com/awslabs/aws-solutions-constructs/issues/112)) ([ea4ab3b](https://github.com/awslabs/aws-solutions-constructs/commit/ea4ab3b71299417cd58177c55dce8a477a4bb2a8))
* **aws-lambda-ssm-string-parameter:** New aws-lambda-ssm-string-parameter pattern implementation ([#64](https://github.com/awslabs/aws-solutions-constructs/issues/64)) ([#175](https://github.com/awslabs/aws-solutions-constructs/issues/175)) ([b0567e4](https://github.com/awslabs/aws-solutions-constructs/commit/b0567e4bd5f5204c7441a4036fdd8b8aa2472975))
* **aws-s3-lambda:** added optional loggingBucketProps to aws-s3-lambda ([#411](https://github.com/awslabs/aws-solutions-constructs/issues/411)) ([1552e4e](https://github.com/awslabs/aws-solutions-constructs/commit/1552e4e485ac89cc959ad810526ab4d7aac48210))
* **aws-s3-sqs:** added loggingBucketProps in aws-s3-sqs and updated tests ([#413](https://github.com/awslabs/aws-solutions-constructs/issues/413)) ([3ddf6ef](https://github.com/awslabs/aws-solutions-constructs/commit/3ddf6efcc8de2d78aa2bba4b173089052e3b7956))
* **aws-s3-sqs:** New aws-s3-sqs pattern implementation ([#27](https://github.com/awslabs/aws-solutions-constructs/issues/27)) ([#105](https://github.com/awslabs/aws-solutions-constructs/issues/105)) ([80bce76](https://github.com/awslabs/aws-solutions-constructs/commit/80bce76077117df069b6c4a0ed8a31de8717838c))
* **aws-s3-stepfunctions:** added loggingBucketProps to s3-stepfunctions and s3-step-function ([#414](https://github.com/awslabs/aws-solutions-constructs/issues/414)) ([ed7bdfa](https://github.com/awslabs/aws-solutions-constructs/commit/ed7bdfa055b5b9555d5c0c8bb488e78669a85b6a))
* **aws-sns-sqs:** New aws-sns-sqs pattern implementation ([#48](https://github.com/awslabs/aws-solutions-constructs/issues/48)) ([58f54de](https://github.com/awslabs/aws-solutions-constructs/commit/58f54de71b6aa18b130866f10462f65c2b5a80bd)), closes [#24](https://github.com/awslabs/aws-solutions-constructs/issues/24)
* **aws-wafwebacl-apigateway:** created new construct ([#366](https://github.com/awslabs/aws-solutions-constructs/issues/366)) ([ee143ca](https://github.com/awslabs/aws-solutions-constructs/commit/ee143ca595784c2011c32cdc1d23766c7b4581e2))
* **aws-wafwebacl-cloudfront:** created README for aws-wafwebacl-cloudfront ([#389](https://github.com/awslabs/aws-solutions-constructs/issues/389)) ([bba361e](https://github.com/awslabs/aws-solutions-constructs/commit/bba361eb9c486af272fce4f8352c667e4e04cfa7))
* **cdk-v2:** Adding build scripts for CDK v2 ([#353](https://github.com/awslabs/aws-solutions-constructs/issues/353)) ([5657b98](https://github.com/awslabs/aws-solutions-constructs/commit/5657b98ee3e5d999fe65448ae3d3095649937650))
* **cdk-v2:** fixing assertion tests to work with both v1 and v2 ([#370](https://github.com/awslabs/aws-solutions-constructs/issues/370)) ([c4c20e4](https://github.com/awslabs/aws-solutions-constructs/commit/c4c20e46ee253ac06629a4d38a07093c46b9905c))
* **cdk-v2:** Rearranging imports, removing deprecated APIs for CDK v2 release ([#350](https://github.com/awslabs/aws-solutions-constructs/issues/350)) ([0c8fba4](https://github.com/awslabs/aws-solutions-constructs/commit/0c8fba44001fedd549923ac16972b7779e1cdeaf))
* **dynamodbstreams-lambda-elasticsearch-kibana:** updated cognito user pool domain name ([#433](https://github.com/awslabs/aws-solutions-constructs/issues/433)) ([6f340a6](https://github.com/awslabs/aws-solutions-constructs/commit/6f340a6e6c10148ca40812a1b36c49cc2eb210da))


### Bug Fixes

* **api-usage-plan:** update cfn templates with api usage plan ([#400](https://github.com/awslabs/aws-solutions-constructs/issues/400)) ([57afba8](https://github.com/awslabs/aws-solutions-constructs/commit/57afba81ce0d9a8cc53c764daa7d9ea573ba1ef8))
* **aws-apigateway-kinesisstreams:** Update construct to match DESIGN_GUIDELINES.md ([#395](https://github.com/awslabs/aws-solutions-constructs/issues/395)) ([9dbec8a](https://github.com/awslabs/aws-solutions-constructs/commit/9dbec8a0365b28c3e0ee279ded0dfaa42a319d3b))
* **aws-kinesisstreams-kinesisfirehose-s3:** fixed to return pattern created s3 bucket ([#138](https://github.com/awslabs/aws-solutions-constructs/issues/138)) ([721ca37](https://github.com/awslabs/aws-solutions-constructs/commit/721ca375e6ca9b08e8093e7cb8f839c737de6322)), closes [#133](https://github.com/awslabs/aws-solutions-constructs/issues/133)
* **cdk-integ-assert-v2:** revert the changes for special CDK v2 handling ([#417](https://github.com/awslabs/aws-solutions-constructs/issues/417)) ([51b1758](https://github.com/awslabs/aws-solutions-constructs/commit/51b1758956541e76cb07fc2d826eb7b602fe806a))
* **cdk-integ-tools:** enabling all feature flags in cdk-integ-tools for CDK v1 ([#410](https://github.com/awslabs/aws-solutions-constructs/issues/410)) ([9c42458](https://github.com/awslabs/aws-solutions-constructs/commit/9c4245854c966fb4162fc12a99ee2afbc56c49d1))
* **cdk-integ-tools:** fix npm run integ for individual pattern ([#432](https://github.com/awslabs/aws-solutions-constructs/issues/432)) ([5d2f3d9](https://github.com/awslabs/aws-solutions-constructs/commit/5d2f3d900f9c50ec9f041c72911615d3dbe9d908))
* **cdk-v2-align-version:** it fails to build cdk-integ-tools for constructs v2.0.0-rc.2 ([#424](https://github.com/awslabs/aws-solutions-constructs/issues/424)) ([80d1fe8](https://github.com/awslabs/aws-solutions-constructs/commit/80d1fe8b48580dd2ec7ab0d46b7636ed159e0478))
* **cdk-v2-build-dist:** Ignore publishing deprecated modules in v2 ([#443](https://github.com/awslabs/aws-solutions-constructs/issues/443)) ([c33f048](https://github.com/awslabs/aws-solutions-constructs/commit/c33f0484b1bb1d894730a5e3343d3f354c7a031e))
* **cdk-v2:** fixing relative paths in deployment/v2/build-cdk-dist.sh ([#429](https://github.com/awslabs/aws-solutions-constructs/issues/429)) ([fd7e210](https://github.com/awslabs/aws-solutions-constructs/commit/fd7e2108fc9c57b8bc94a94002ca0351d9479e81))
* **constructs-main-pipeline:** Failing in Codepipeline at Build-v2 stage ([#439](https://github.com/awslabs/aws-solutions-constructs/issues/439)) ([06f97ca](https://github.com/awslabs/aws-solutions-constructs/commit/06f97ca5f3b974c1092850bf90a6229dd3622995))
* **doc:** Typo in aws-sns-lambda README.md ([#374](https://github.com/awslabs/aws-solutions-constructs/issues/374)) ([0dbe295](https://github.com/awslabs/aws-solutions-constructs/commit/0dbe295bae4f24bb599168b2a0f014fdae69c41c))
* **kms policy:** update cfn templates with kms policy to match with CDK v2 ([#397](https://github.com/awslabs/aws-solutions-constructs/issues/397)) ([21f1f93](https://github.com/awslabs/aws-solutions-constructs/commit/21f1f932e5651e108e5995e89d8bc1c6282dd4f3))
* **wrapped constructs:** shorten wrapped ID names in deprecated constructs ([#371](https://github.com/awslabs/aws-solutions-constructs/issues/371)) ([30737ae](https://github.com/awslabs/aws-solutions-constructs/commit/30737ae187b0231ec8e74e0f9abba59bd5c915a9))


* Merge pull request #197 from knihit/master ([69f7fbd](https://github.com/awslabs/aws-solutions-constructs/commit/69f7fbdde5d3d7cf699ee2098db42ade676073d8)), closes [#197](https://github.com/awslabs/aws-solutions-constructs/issues/197) [#196](https://github.com/awslabs/aws-solutions-constructs/issues/196)
