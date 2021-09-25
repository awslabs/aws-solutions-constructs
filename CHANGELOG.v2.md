# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 2.0.0-rc.1 (2021-09-25)


### ⚠ BREAKING CHANGES

* any testing snapshots will need to be refreshed.
* **aws-kinesisstreams-lambda:** DefaultKinesisEventSourceProps was removed from lambda-event-source-mapping-defaults and replaced with KinesisEventSourceProps. This now follows the same behavior as the aws-dynamodb-stream-lambda and aws-s3-lambda patterns (which use DynamoEventSourceProps and S3EventSourceProps instead of EventSourceMappingOptions)

Co-authored-by: Daniel Pinheiro <dspin@amazon.com>

### Features

* **aws-apigateway-iot:** new aws-apigateway-iot pattern implementation ([#83](https://github.com/awslabs/aws-solutions-constructs/issues/83)) ([5f91913](https://github.com/awslabs/aws-solutions-constructs/commit/5f919135a9e2a2688d6ca277e6af846b614d8e92))
* **aws-apigateway-kinesisstreams:** New aws-apigateway-kinesisstreams pattern implementation ([#56](https://github.com/awslabs/aws-solutions-constructs/issues/56)) ([abddeed](https://github.com/awslabs/aws-solutions-constructs/commit/abddeed6ae0d60f2af5a89aee170696bb4677810))
* **aws-apigateway-sagemakerendpoint:** New aws-apigateway-sagemakerendpoint pattern implementation ([#87](https://github.com/awslabs/aws-solutions-constructs/issues/87)) ([81d3b8b](https://github.com/awslabs/aws-solutions-constructs/commit/81d3b8b8ed9eabd4f2adbdc63d607975990c62ea))
* **aws-cloudfront-mediastore:** new aws-cloudfront-mediastore pattern implementation ([#107](https://github.com/awslabs/aws-solutions-constructs/issues/107)) ([9246945](https://github.com/awslabs/aws-solutions-constructs/commit/9246945881010af144574e303792b5135c8e762c))
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
* **aws-s3-sqs:** New aws-s3-sqs pattern implementation ([#27](https://github.com/awslabs/aws-solutions-constructs/issues/27)) ([#105](https://github.com/awslabs/aws-solutions-constructs/issues/105)) ([80bce76](https://github.com/awslabs/aws-solutions-constructs/commit/80bce76077117df069b6c4a0ed8a31de8717838c))
* **aws-sns-sqs:** New aws-sns-sqs pattern implementation ([#48](https://github.com/awslabs/aws-solutions-constructs/issues/48)) ([58f54de](https://github.com/awslabs/aws-solutions-constructs/commit/58f54de71b6aa18b130866f10462f65c2b5a80bd)), closes [#24](https://github.com/awslabs/aws-solutions-constructs/issues/24)
* **aws-wafwebacl-apigateway:** created new construct ([#366](https://github.com/awslabs/aws-solutions-constructs/issues/366)) ([ee143ca](https://github.com/awslabs/aws-solutions-constructs/commit/ee143ca595784c2011c32cdc1d23766c7b4581e2))
* **aws-wafwebacl-cloudfront:** created README for aws-wafwebacl-cloudfront ([#389](https://github.com/awslabs/aws-solutions-constructs/issues/389)) ([bba361e](https://github.com/awslabs/aws-solutions-constructs/commit/bba361eb9c486af272fce4f8352c667e4e04cfa7))
* **cdk-v2:** Adding build scripts for CDK v2 ([#353](https://github.com/awslabs/aws-solutions-constructs/issues/353)) ([5657b98](https://github.com/awslabs/aws-solutions-constructs/commit/5657b98ee3e5d999fe65448ae3d3095649937650))
* **cdk-v2:** fixing assertion tests to work with both v1 and v2 ([#370](https://github.com/awslabs/aws-solutions-constructs/issues/370)) ([c4c20e4](https://github.com/awslabs/aws-solutions-constructs/commit/c4c20e46ee253ac06629a4d38a07093c46b9905c))
* **cdk-v2:** Rearranging imports, removing deprecated APIs for CDK v2 release ([#350](https://github.com/awslabs/aws-solutions-constructs/issues/350)) ([0c8fba4](https://github.com/awslabs/aws-solutions-constructs/commit/0c8fba44001fedd549923ac16972b7779e1cdeaf))


### Bug Fixes

* **aws-kinesisstreams-kinesisfirehose-s3:** fixed to return pattern created s3 bucket ([#138](https://github.com/awslabs/aws-solutions-constructs/issues/138)) ([721ca37](https://github.com/awslabs/aws-solutions-constructs/commit/721ca375e6ca9b08e8093e7cb8f839c737de6322)), closes [#133](https://github.com/awslabs/aws-solutions-constructs/issues/133)
* **doc:** Typo in aws-sns-lambda README.md ([#374](https://github.com/awslabs/aws-solutions-constructs/issues/374)) ([0dbe295](https://github.com/awslabs/aws-solutions-constructs/commit/0dbe295bae4f24bb599168b2a0f014fdae69c41c))
* **kms policy:** update cfn templates with kms policy to match with CDK v2 ([#397](https://github.com/awslabs/aws-solutions-constructs/issues/397)) ([21f1f93](https://github.com/awslabs/aws-solutions-constructs/commit/21f1f932e5651e108e5995e89d8bc1c6282dd4f3))
* **wrapped constructs:** shorten wrapped ID names in deprecated constructs ([#371](https://github.com/awslabs/aws-solutions-constructs/issues/371)) ([30737ae](https://github.com/awslabs/aws-solutions-constructs/commit/30737ae187b0231ec8e74e0f9abba59bd5c915a9))


* Merge pull request #197 from knihit/master ([69f7fbd](https://github.com/awslabs/aws-solutions-constructs/commit/69f7fbdde5d3d7cf699ee2098db42ade676073d8)), closes [#197](https://github.com/awslabs/aws-solutions-constructs/issues/197) [#196](https://github.com/awslabs/aws-solutions-constructs/issues/196)
