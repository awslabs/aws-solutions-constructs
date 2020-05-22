# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.1-beta] - 2020-05-21
### Changed
- Upgraded to CDK v1.40.0
- Ability to emit a warning to the console when a prescriptive default value is overridden by the user
- Automatic injection of best practice HTTP security headers in all HTTP responses from cloudfront
- Fix the Cfn Nag warning Cloudfront should use minimum protocol version TLS 1.2 (W70)

## [0.8.0-beta] - 2020-03-31
### Added
- Initial public beta release
- aws-apigateway-dynamodb module added
- aws-apigateway-lambda module added
- aws-apigateway-sqs module added
- aws-cloudfront-apigateway-lambda module added
- aws-cloudfront-apigateway module added
- aws-cloudfront-s3 module added
- aws-cognito-apigateway-lambda module added
- aws-dynamodb-stream-lambda-elasticsearch-kibana module added
- aws-dynamodb-stream-lambda module added
- aws-events-rule-lambda module added
- aws-iot-kinesisfirehose-s3 module added
- aws-iot-lambda-dynamodb module added
- aws-iot-lambda module added
- aws-kinesisfirehose-s3-and-kinesisanalytics module added
- aws-kinesisfirehose-s3 module added
- aws-kinesisstreams-lambda module added
- aws-lambda-dynamodb module added
- aws-lambda-elasticsearch-kibana module added
- aws-lambda-s3 module added
- aws-lambda-sns module added
- aws-s3-lambda module added
- aws-sns-lambda module added
- aws-sqs-lambda module added
- core module added
