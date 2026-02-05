# Implementation Plan: aws-lambda-polly

## Overview

This implementation plan breaks down the aws-lambda-polly construct into discrete coding tasks. The construct integrates AWS Lambda with Amazon Polly text-to-speech service, supporting both synchronous and asynchronous operations.

## Tasks

- [x] 1. Create project structure and configuration files
  - Create directory: `source/patterns/@aws-solutions-constructs/aws-lambda-polly/`
  - Create `package.json` with dependencies and JSII configuration
  - Create `.npmignore` and `.gitignore` files
  - Create `integ.config.json` for integration tests
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 2. Add Polly VPC endpoint support to core
  - [x] 2.1 Add POLLY to ServiceEndpointTypes enum in `core/lib/vpc-helper.ts`
    - Add `POLLY = "POLLY"` to ServiceEndpointTypes enum
    - _Requirements: 10.4_
  
  - [x] 2.2 Add Polly endpoint definition to endpointSettings array in `core/lib/vpc-helper.ts`
    - Add endpoint definition with POLLY name, Interface type, and InterfaceVpcEndpointAwsService.POLLY
    - _Requirements: 10.4_
  
  - [x] 2.3 Write unit test for Polly VPC endpoint
    - Test that Polly interface endpoint is created when requested
    - _Requirements: 10.4_

- [x] 3. Implement core Polly helper function
  - [x] 3.1 Create `core/lib/polly-helper.ts` with `ConfigurePollySupport()` function
    - Implement logic to handle asyncJobs flag
    - Create/use existing S3 bucket when asyncJobs is true
    - Create/use existing SNS topic when asyncJobs is true
    - Return PollyConfiguration object with resources and IAM actions
    - Build environment variable definitions for Lambda
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4, 4.1, 4.2, 4.4, 5.1, 6.1, 6.2, 6.3, 9.1, 9.2, 9.3, 9.4_
  
  - [x] 3.2 Write unit tests for `ConfigurePollySupport()`
    - Test synchronous mode (asyncJobs false/undefined)
    - Test asynchronous mode with default settings
    - Test with existing bucket and topic
    - Test environment variable generation
    - Test IAM action list generation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Implement core Polly validation function
  - [x] 4.1 Create `CheckPollyProps()` function in `core/lib/polly-helper.ts`
    - Validate bucket props only provided when asyncJobs is true
    - Validate topic props only provided when asyncJobs is true
    - Validate conflicting bucket props (existing vs new)
    - Validate conflicting topic props (existing vs new)
    - _Requirements: 13.2, 13.3, 13.5, 13.6_
  
  - [x] 4.2 Write unit tests for `CheckPollyProps()`
    - Test error thrown for bucket props without asyncJobs
    - Test error thrown for topic props without asyncJobs
    - Test error thrown for conflicting bucket props
    - Test error thrown for conflicting topic props
    - _Requirements: 13.2, 13.3, 13.5, 13.6_

- [x] 5. Implement main construct props interface
  - [x] 5.1 Create `lib/index.ts` with `LambdaToPollyProps` interface
    - Add Lambda configuration props (existingLambdaObj, lambdaFunctionProps)
    - Add asyncJobs flag
    - Add S3 bucket props (existingBucketObj, bucketProps, bucketEnvironmentVariableName)
    - Add S3 logging props (logS3AccessLogs, loggingBucketProps)
    - Add SNS topic props (existingTopicObj, topicProps, topicEnvironmentVariableName)
    - Add SNS encryption props (existingTopicEncryptionKey, topicEncryptionKey, topicEncryptionKeyProps, enableTopicEncryptionWithCustomerManagedKey)
    - Add VPC props (existingVpc, vpcProps, deployVpc)
    - Include JSDoc comments matching aws-lambda-textract patterns
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 4.1, 4.2, 8.1, 9.1, 9.3, 10.1, 10.2, 10.3, 11.1, 11.3, 12.2, 12.3, 12.4_

- [x] 6. Implement main construct class
  - [x] 6.1 Create `LambdaToPolly` class with public properties
    - Add lambdaFunction property
    - Add destinationBucket, loggingBucket, destinationBucketInterface properties (async only)
    - Add snsNotificationTopic, notificationTopicEncryptionKey properties (async only)
    - Add vpc property
    - _Requirements: 1.5, 3.5, 3.6, 3.7, 4.5, 10.5, 12.7_
  
  - [x] 6.2 Implement constructor validation
    - Set CDK context for S3 server access logs
    - Call CheckLambdaProps()
    - Call CheckVpcProps()
    - Call CheckPollyProps()
    - _Requirements: 1.3, 10.6, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_
  
  - [x] 6.3 Implement VPC configuration
    - Build VPC when deployVpc or existingVpc provided
    - Add Polly interface endpoint to VPC
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 6.4 Implement Polly configuration
    - Call ConfigurePollySupport() helper
    - Extract bucket, topic, and encryption key from result
    - Store environment variables from result
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4, 4.1, 4.2, 4.4_
  
  - [x] 6.5 Implement Lambda function creation
    - Call buildLambdaFunction() with props and VPC
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [x] 6.6 Implement IAM permissions
    - Add Polly IAM actions from configuration
    - Grant S3 read/write permissions (async only)
    - Grant SNS publish permissions (async only)
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.4, 8.1, 8.2_
  
  - [x] 6.7 Implement environment variables
    - Set bucket and topic environment variables from configuration
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 6.8 Implement VPC endpoints
    - Add S3 gateway endpoint when VPC and asyncJobs
    - _Requirements: 10.5_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write unit tests for construct
  - [x] 8.1 Test default synchronous mode
    - Verify Lambda function created
    - Verify only sync Polly permissions granted
    - Verify no bucket or topic created
    - Verify no environment variables set
    - _Requirements: 1.4, 2.4, 2.5, 2.6, 5.1, 9.5_
  
  - [x] 8.2 Test asynchronous mode with defaults
    - Verify Lambda function created
    - Verify bucket created with encryption, versioning, logging
    - Verify topic created with encryption
    - Verify sync and async Polly permissions granted
    - Verify S3 read/write permissions granted
    - Verify SNS publish permissions granted
    - Verify default environment variables set
    - _Requirements: 2.1, 2.2, 2.3, 3.4, 4.4, 5.1, 6.1, 6.2, 6.3, 7.1, 7.2, 8.1, 9.2, 9.4, 11.1_
  
  - [x] 8.3 Test with existing Lambda function
    - Verify existing Lambda used
    - _Requirements: 1.2_
  
  - [x] 8.4 Test with existing bucket and topic (async mode)
    - Verify existing bucket used
    - Verify existing topic used
    - Verify bucket interface property set
    - _Requirements: 3.2, 4.2_
  
  - [x] 8.5 Test custom environment variable names
    - Verify custom bucket env var name used
    - Verify custom topic env var name used
    - _Requirements: 9.1, 9.3_
  
  - [x] 8.6 Test VPC deployment
    - Verify VPC created when deployVpc true
    - Verify existing VPC used when provided
    - Verify Polly interface endpoint created
    - Verify S3 gateway endpoint created when asyncJobs
    - _Requirements: 10.1, 10.2, 10.4, 10.5_
  
  - [x] 8.7 Test logging configuration
    - Verify access logging enabled by default
    - Verify access logging can be disabled
    - Verify logging bucket created
    - _Requirements: 11.1, 11.2, 11.4_
  
  - [x] 8.8 Test encryption configuration
    - Verify AWS-managed encryption by default
    - Verify customer-managed key when specified
    - Verify encryption key property exposed
    - _Requirements: 12.4, 12.5, 12.6_
  
  - [x] 8.9 Test validation errors
    - Verify error for conflicting Lambda props
    - Verify error for conflicting VPC props
    - Verify error for bucket props without asyncJobs
    - Verify error for topic props without asyncJobs
    - _Requirements: 1.3, 10.6, 13.1, 13.5, 13.6_

- [x] 9. Write property-based tests
  - [x] 9.1 Property test for Lambda function props application
    - **Property 1: Lambda Function Props Application**
    - **Validates: Requirements 1.1**
    - Generate random valid Lambda props
    - Verify props applied to synthesized template
    - Run 100+ iterations
  
  - [x] 9.2 Property test for custom bucket props application
    - **Property 2: Custom Bucket Props Application**
    - **Validates: Requirements 3.1**
    - Generate random valid bucket props with asyncJobs true
    - Verify props applied to synthesized template
    - Run 100+ iterations
  
  - [x] 9.3 Property test for custom topic props application
    - **Property 3: Custom Topic Props Application**
    - **Validates: Requirements 4.1**
    - Generate random valid topic props with asyncJobs true
    - Verify props applied to synthesized template
    - Run 100+ iterations
  
  - [x] 9.4 Property test for custom bucket environment variable names
    - **Property 4: Custom Environment Variable Names**
    - **Validates: Requirements 9.1**
    - Generate random valid env var names with asyncJobs true
    - Verify Lambda has env var with custom name
    - Run 100+ iterations
  
  - [x] 9.5 Property test for custom topic environment variable names
    - **Property 5: Custom Topic Environment Variable Names**
    - **Validates: Requirements 9.3**
    - Generate random valid env var names with asyncJobs true
    - Verify Lambda has env var with custom name
    - Run 100+ iterations
  
  - [x] 9.6 Property test for custom VPC props application
    - **Property 6: Custom VPC Props Application**
    - **Validates: Requirements 10.3**
    - Generate random valid VPC props with deployVpc true
    - Verify props applied to synthesized template
    - Run 100+ iterations
  
  - [x] 9.7 Property test for custom logging bucket props application
    - **Property 7: Custom Logging Bucket Props Application**
    - **Validates: Requirements 11.3**
    - Generate random valid logging bucket props with asyncJobs true
    - Verify props applied to synthesized template
    - Run 100+ iterations
  
  - [x] 9.8 Property test for custom encryption key props application
    - **Property 8: Custom Encryption Key Props Application**
    - **Validates: Requirements 12.3**
    - Generate random valid key props with asyncJobs true
    - Verify props applied to synthesized template
    - Run 100+ iterations

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Write integration tests
  - [x] 11.1 Integration test for default synchronous mode
    - Deploy construct with minimal props
    - Verify Lambda function created
    - Verify no bucket or topic created
    - Capture snapshot
    - _Requirements: 1.4, 2.4, 2.5, 5.1_
  
  - [x] 11.2 Integration test for asynchronous mode with defaults
    - Deploy construct with asyncJobs true
    - Verify Lambda, bucket, and topic created
    - Verify permissions and environment variables
    - Capture snapshot
    - _Requirements: 2.1, 2.2, 2.3, 3.4, 4.4_
  
  - [x] 11.3 Integration test for asynchronous mode with existing resources
    - Create bucket and topic separately
    - Deploy construct with existing resources
    - Verify construct uses existing resources
    - Capture snapshot
    - _Requirements: 3.2, 4.2_
  
  - [x] 11.4 Integration test for VPC deployment with asyncJobs enabled
    - Deploy construct with deployVpc and asyncJobs true
    - Verify VPC, endpoints, Lambda, bucket, topic created
    - Capture snapshot
    - _Requirements: 10.1, 10.4, 10.5_
  
  - [x] 11.5 Integration test for VPC deployment with asyncJobs disabled
    - Deploy construct with deployVpc true and asyncJobs false
    - Verify VPC, Polly endpoint, Lambda created
    - Verify no S3 endpoint, bucket, or topic created
    - Capture snapshot
    - _Requirements: 10.1, 10.4_
  
  - [x] 11.6 Integration test for custom encryption configuration
    - Deploy construct with customer-managed KMS key
    - Verify topic encrypted with custom key
    - Capture snapshot
    - _Requirements: 12.2, 12.4_
  
  - [x] 11.7 Integration test for custom logging configuration
    - Deploy construct with custom logging bucket props
    - Verify logging bucket created with custom props
    - Capture snapshot
    - _Requirements: 11.3, 11.4_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Create README.adoc documentation
  - [x] 13.1 Create README.adoc with standard structure
    - Add stability badge and package information table
    - Add overview section with minimal deployable example in TypeScript, Python, and Java
    - Add Pattern Construct Props table with all props, types, and descriptions
    - Add Pattern Properties table with public properties
    - Add Default Settings section
    - Add Architecture section with diagram placeholder and resource list
    - Add example Lambda function implementation section
    - Follow aws-lambda-textract README.adoc as reference
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end functionality in AWS
- The construct follows Solutions Constructs patterns by delegating resource creation to core helpers
- All Polly-specific logic is encapsulated in `core/lib/polly-helper.ts`
