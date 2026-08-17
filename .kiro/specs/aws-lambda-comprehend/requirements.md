# Requirements Document

## Introduction

This document specifies the requirements for the aws-lambda-comprehend AWS Solutions Construct. This construct integrates AWS Lambda with Amazon Comprehend (natural language processing service), providing a well-architected pattern for building applications that analyze text. The construct creates a Lambda function with least-privilege IAM permissions to call Comprehend APIs, where the granted permissions are the cross product of two Client-selected axes: the processing mode (synchronous single-document, synchronous multi-document, or asynchronous batch) and the analysis family (sentiment, entities, key phrases, and so on). When asynchronous batch support is selected, the construct also creates S3 buckets for job input and output and an IAM role that Amazon Comprehend assumes to read and write those buckets.

The construct does not supply Lambda function code. The Client writes the handler that calls Comprehend; the construct's responsibility is the permissions, the resources, and the environment variables needed to discover them.

## Glossary

- **Lambda_Function**: The AWS Lambda function that invokes Amazon Comprehend APIs
- **Comprehend_Service**: Amazon Comprehend natural language processing service
- **Use_Case**: A Comprehend processing mode, expressed as a `ComprehendUseCase` enum member — `SINGLE_DOCUMENT_SYNC`, `MULTI_DOCUMENT_SYNC`, or `ASYNC_BATCH`
- **Analysis_Type**: A Comprehend analysis family, expressed as a `ComprehendAnalysisType` enum member — `DOMINANT_LANGUAGE`, `ENTITIES`, `KEY_PHRASES`, `SENTIMENT`, `TARGETED_SENTIMENT`, `SYNTAX`, or `PII`
- **Cross_Product**: The set of Comprehend API actions produced by pairing every selected Use_Case with every selected Analysis_Type
- **Source_Bucket**: S3 bucket holding input documents for asynchronous analysis jobs (async only)
- **Destination_Bucket**: S3 bucket to which Comprehend_Service writes asynchronous job output (async only)
- **Data_Access_Role**: IAM role assumed by Comprehend_Service to read Source_Bucket and write Destination_Bucket (async only)
- **Async_Job**: A Comprehend `Start<X>DetectionJob` operation and its lifecycle
- **Construct**: The aws-lambda-comprehend CDK construct
- **Client**: Developer using the construct
- **VPC**: Virtual Private Cloud for network isolation

## Requirements

### Requirement 1: Lambda Function Deployment

**User Story:** As a developer, I want to deploy a Lambda function configured to call Amazon Comprehend, so that I can analyze text in my application.

#### Acceptance Criteria

1. WHEN a Client provides lambdaFunctionProps, THE Construct SHALL create a Lambda_Function with those properties
2. WHEN a Client provides existingLambdaObj, THE Construct SHALL use that Lambda_Function instance
3. WHEN a Client provides both existingLambdaObj and lambdaFunctionProps, THE Construct SHALL reject the configuration with an error
4. WHEN neither existingLambdaObj nor lambdaFunctionProps is provided, THE Construct SHALL create a Lambda_Function with best-practice defaults
5. THE Construct SHALL expose the Lambda_Function as a public property
6. WHEN lambdaFunctionProps does not specify a timeout, THE Construct SHALL set the Lambda_Function timeout to 30 seconds
7. WHEN lambdaFunctionProps specifies a timeout, THE Construct SHALL use the Client-supplied timeout
8. THE Construct SHALL NOT supply Lambda_Function handler code that calls Comprehend_Service

### Requirement 2: Use Case Selection

**User Story:** As a developer, I want to declare which Comprehend processing modes my function uses, so that it receives permissions for those modes and no others.

#### Acceptance Criteria

1. WHEN comprehendUseCases is not provided, THE Construct SHALL default to `[SINGLE_DOCUMENT_SYNC, MULTI_DOCUMENT_SYNC]`
2. WHEN comprehendUseCases is provided, THE Construct SHALL grant permissions for only the selected Use_Cases
3. WHEN comprehendUseCases is an empty array, THE Construct SHALL reject the configuration with an error
4. WHEN comprehendUseCases contains duplicate members, THE Construct SHALL de-duplicate them without raising an error
5. THE Construct SHALL NOT expose a boolean prop for selecting asynchronous processing

### Requirement 3: Analysis Type Selection

**User Story:** As a developer, I want to declare which Comprehend analysis families my function uses, so that its IAM policy names only the actions it actually calls.

#### Acceptance Criteria

1. WHEN analysisTypes is not provided, THE Construct SHALL default to all seven Analysis_Types
2. WHEN analysisTypes is provided, THE Construct SHALL grant permissions for only the selected Analysis_Types
3. WHEN analysisTypes is an empty array, THE Construct SHALL reject the configuration with an error
4. WHEN analysisTypes contains duplicate members, THE Construct SHALL de-duplicate them without raising an error

### Requirement 4: Cross-Product Permission Generation

**User Story:** As a developer, I want the construct to derive the exact Comprehend actions from my two selections, so that I do not have to know which APIs exist for which analysis family.

#### Acceptance Criteria

1. THE Construct SHALL grant the Lambda_Function the Cross_Product of the selected Use_Cases and Analysis_Types
2. WHEN SINGLE_DOCUMENT_SYNC is selected, THE Construct SHALL grant the corresponding `comprehend:Detect<X>` action for each selected Analysis_Type
3. WHEN SINGLE_DOCUMENT_SYNC and PII are both selected, THE Construct SHALL grant both `comprehend:DetectPiiEntities` and `comprehend:ContainsPiiEntities`
4. WHEN MULTI_DOCUMENT_SYNC is selected, THE Construct SHALL grant the corresponding `comprehend:BatchDetect<X>` action for each selected Analysis_Type other than PII
5. WHEN MULTI_DOCUMENT_SYNC and PII are both selected, THE Construct SHALL NOT grant a batch PII action, because none exists
6. WHEN ASYNC_BATCH is selected, THE Construct SHALL grant `Start`, `Describe`, `List`, and `Stop` actions for the corresponding job family of each selected Analysis_Type other than SYNTAX
7. WHEN ASYNC_BATCH and SYNTAX are both selected, THE Construct SHALL NOT grant a syntax job action, because no syntax detection job exists
8. THE Construct SHALL emit the action list in a deterministic order that does not depend on the order of the Client-supplied arrays
9. THE Construct SHALL grant all Comprehend actions in a single IAM policy statement with a resource of `*`
10. WHEN neither comprehendUseCases nor analysisTypes is provided, THE Construct SHALL grant exactly fourteen Comprehend actions
11. THE Construct SHALL NOT grant `comprehend:TagResource`

### Requirement 5: Cross-Product Validation

**User Story:** As a developer, I want an error when a selection I made cannot produce any permission at all, but not when it merely has gaps, so that legitimate combinations are not blocked.

#### Acceptance Criteria

1. WHEN a selected Analysis_Type yields at least one Comprehend action under at least one selected Use_Case, THE Construct SHALL accept the configuration
2. WHEN a selected Analysis_Type yields no Comprehend action under any selected Use_Case, THE Construct SHALL reject the configuration with an error naming that Analysis_Type
3. WHEN comprehendUseCases is `[MULTI_DOCUMENT_SYNC]` and analysisTypes is `[PII]`, THE Construct SHALL reject the configuration
4. WHEN comprehendUseCases is `[ASYNC_BATCH]` and analysisTypes is `[SYNTAX]`, THE Construct SHALL reject the configuration
5. WHEN comprehendUseCases is `[MULTI_DOCUMENT_SYNC, ASYNC_BATCH]` and analysisTypes is `[SYNTAX, PII]`, THE Construct SHALL accept the configuration

### Requirement 6: Asynchronous Batch Support

**User Story:** As a developer, I want to opt into asynchronous Comprehend jobs, so that I can analyze document sets that exceed the synchronous API limits.

#### Acceptance Criteria

1. WHEN comprehendUseCases includes ASYNC_BATCH, THE Construct SHALL provide a Source_Bucket and a Destination_Bucket
2. WHEN comprehendUseCases includes ASYNC_BATCH, THE Construct SHALL create a Data_Access_Role
3. WHEN comprehendUseCases does not include ASYNC_BATCH, THE Construct SHALL NOT create any S3 bucket
4. WHEN comprehendUseCases does not include ASYNC_BATCH, THE Construct SHALL NOT create a Data_Access_Role
5. WHEN comprehendUseCases does not include ASYNC_BATCH, THE Construct SHALL leave the dataAccessRole public property undefined

### Requirement 7: Source Bucket Configuration

**User Story:** As a developer using asynchronous jobs, I want control over the bucket holding job input, so that I can reuse an existing bucket or customize a new one.

#### Acceptance Criteria

1. WHEN ASYNC_BATCH is selected and sourceBucketProps is provided, THE Construct SHALL create a Source_Bucket with those properties
2. WHEN ASYNC_BATCH is selected and existingSourceBucketObj is provided, THE Construct SHALL use that bucket interface
3. WHEN ASYNC_BATCH is selected and both existingSourceBucketObj and sourceBucketProps are provided, THE Construct SHALL reject the configuration with an error
4. WHEN ASYNC_BATCH is selected and neither is provided, THE Construct SHALL create a Source_Bucket with encryption, versioning, blocked public access, enforced SSL, and access logging enabled
5. WHEN the Construct creates a Source_Bucket, THE Construct SHALL expose it as a public property of type `s3.Bucket`
6. WHEN ASYNC_BATCH is selected, THE Construct SHALL expose the source bucket interface as a public property of type `s3.IBucket`
7. WHEN the Construct creates a source logging bucket, THE Construct SHALL expose it as a public property of type `s3.Bucket`
8. WHEN existingSourceBucketObj is provided, THE Construct SHALL leave the sourceBucket public property undefined

### Requirement 8: Destination Bucket Configuration

**User Story:** As a developer using asynchronous jobs, I want control over the bucket receiving job output, so that I can reuse an existing bucket or customize a new one.

#### Acceptance Criteria

1. WHEN ASYNC_BATCH is selected and destinationBucketProps is provided, THE Construct SHALL create a Destination_Bucket with those properties
2. WHEN ASYNC_BATCH is selected and existingDestinationBucketObj is provided, THE Construct SHALL use that bucket interface
3. WHEN ASYNC_BATCH is selected and both existingDestinationBucketObj and destinationBucketProps are provided, THE Construct SHALL reject the configuration with an error
4. WHEN ASYNC_BATCH is selected and neither is provided, THE Construct SHALL create a Destination_Bucket with encryption, versioning, blocked public access, enforced SSL, and access logging enabled
5. WHEN the Construct creates a Destination_Bucket, THE Construct SHALL expose it as a public property of type `s3.Bucket`
6. WHEN ASYNC_BATCH is selected, THE Construct SHALL expose the destination bucket interface as a public property of type `s3.IBucket`
7. WHEN the Construct creates a destination logging bucket, THE Construct SHALL expose it as a public property of type `s3.Bucket`
8. WHEN existingDestinationBucketObj is provided, THE Construct SHALL leave the destinationBucket public property undefined

### Requirement 9: Shared Bucket Option

**User Story:** As a developer using asynchronous jobs, I want the option of a single bucket for both input and output, so that I do not manage two buckets when one will do.

#### Acceptance Criteria

1. WHEN ASYNC_BATCH is selected and useSameBucket is true, THE Construct SHALL provide one bucket serving as both Source_Bucket and Destination_Bucket
2. WHEN useSameBucket is true, THE Construct SHALL set the source and destination bucket name environment variables to the same value
3. WHEN useSameBucket is true, THE Construct SHALL grant the Lambda_Function read and write access to that bucket in a single grant
4. WHEN useSameBucket is true, THE Construct SHALL grant the Data_Access_Role read and write access to that bucket in a single grant
5. WHEN useSameBucket is true and any destination bucket prop is provided, THE Construct SHALL reject the configuration with an error

### Requirement 10: Data Access Role

**User Story:** As a developer using asynchronous jobs, I want the construct to create the role Comprehend assumes, so that jobs can read input and write output without my writing a trust policy.

#### Acceptance Criteria

1. WHEN ASYNC_BATCH is selected, THE Construct SHALL create a Data_Access_Role trusted by the `comprehend.amazonaws.com` service principal
2. THE Construct SHALL condition the Data_Access_Role trust policy on `aws:SourceAccount` matching the deploying account
3. WHEN ASYNC_BATCH is selected, THE Construct SHALL grant the Data_Access_Role read access to the Source_Bucket
4. WHEN ASYNC_BATCH is selected, THE Construct SHALL grant the Data_Access_Role read and write access to the Destination_Bucket
5. WHEN ASYNC_BATCH is selected, THE Construct SHALL expose the Data_Access_Role as a public property
6. WHEN ASYNC_BATCH is selected, THE Construct SHALL grant the Lambda_Function `iam:PassRole` on the Data_Access_Role ARN
7. THE Construct SHALL condition the `iam:PassRole` grant on `iam:PassedToService` equal to `comprehend.amazonaws.com`
8. WHEN ASYNC_BATCH is not selected, THE Construct SHALL NOT grant the Lambda_Function `iam:PassRole`
9. THE Construct SHALL NOT grant the Data_Access_Role any KMS permissions

### Requirement 11: Lambda S3 Permissions

**User Story:** As a developer, I want my Lambda function to be able to stage input and read job output, so that my handler can drive the full asynchronous workflow.

#### Acceptance Criteria

1. WHEN ASYNC_BATCH is selected, THE Construct SHALL grant the Lambda_Function read and write access to the Source_Bucket
2. WHEN ASYNC_BATCH is selected, THE Construct SHALL grant the Lambda_Function read access to the Destination_Bucket
3. THE Construct SHALL apply S3 grants to the bucket interface, so that grants are emitted for Client-supplied existing buckets as well as Construct-created buckets
4. WHEN ASYNC_BATCH is not selected, THE Construct SHALL NOT grant the Lambda_Function any S3 permissions

### Requirement 12: Additional Permissions

**User Story:** As a developer, I want an escape hatch for Comprehend actions the construct does not model, so that I am not blocked by the construct's scope.

#### Acceptance Criteria

1. WHEN additionalPermissions is provided, THE Construct SHALL grant those actions to the Lambda_Function
2. THE Construct SHALL place additionalPermissions in the same policy statement as the generated Comprehend actions
3. THE Construct SHALL append additionalPermissions after the generated actions and de-duplicate them against the generated actions
4. WHEN additionalPermissions is not provided, THE Construct SHALL grant only the generated actions

### Requirement 13: Environment Variables for Resource Discovery

**User Story:** As a developer using asynchronous jobs, I want the Lambda function to receive the bucket names and role ARN, so that my handler can pass them to Comprehend.

#### Acceptance Criteria

1. WHEN ASYNC_BATCH is selected and sourceBucketEnvironmentVariableName is not provided, THE Construct SHALL set `SOURCE_BUCKET_NAME` on the Lambda_Function to the Source_Bucket name
2. WHEN ASYNC_BATCH is selected and sourceBucketEnvironmentVariableName is provided, THE Construct SHALL use that name instead
3. WHEN ASYNC_BATCH is selected and destinationBucketEnvironmentVariableName is not provided, THE Construct SHALL set `DESTINATION_BUCKET_NAME` on the Lambda_Function to the Destination_Bucket name
4. WHEN ASYNC_BATCH is selected and destinationBucketEnvironmentVariableName is provided, THE Construct SHALL use that name instead
5. WHEN ASYNC_BATCH is selected and dataAccessRoleArnEnvironmentVariableName is not provided, THE Construct SHALL set `DATA_ACCESS_ROLE_ARN` on the Lambda_Function to the Data_Access_Role ARN
6. WHEN ASYNC_BATCH is selected and dataAccessRoleArnEnvironmentVariableName is provided, THE Construct SHALL use that name instead
7. WHEN ASYNC_BATCH is not selected, THE Construct SHALL NOT set any bucket or role environment variables on the Lambda_Function

### Requirement 14: VPC Deployment Support

**User Story:** As a developer, I want to optionally deploy the Lambda function in a VPC, so that I can meet network isolation requirements.

#### Acceptance Criteria

1. WHEN deployVpc is true, THE Construct SHALL create a VPC with best-practice isolated configuration
2. WHEN existingVpc is provided, THE Construct SHALL deploy the Lambda_Function in that VPC
3. WHEN vpcProps is provided, THE Construct SHALL create a VPC with those properties
4. WHEN a VPC is used, THE Construct SHALL create a Comprehend Interface Endpoint for the VPC
5. WHEN a VPC is used and ASYNC_BATCH is selected, THE Construct SHALL create an S3 Gateway Endpoint for the VPC
6. WHEN a VPC is used and ASYNC_BATCH is not selected, THE Construct SHALL NOT create an S3 Gateway Endpoint
7. WHEN a VPC is used, THE Construct SHALL expose the VPC as a public property
8. WHEN both deployVpc and existingVpc are provided, THE Construct SHALL reject the configuration with an error
9. WHEN vpcProps contains properties that are not valid VPC properties, THE Construct SHALL reject the configuration with an error
10. WHEN a VPC is used and ASYNC_BATCH is selected, THE Construct SHALL emit a warning stating that Comprehend Async_Jobs do not execute inside the Client's VPC
11. THE Construct SHALL NOT expose props for configuring job-level Comprehend VPC settings

### Requirement 15: Access Logging Configuration

**User Story:** As a developer using asynchronous jobs, I want per-bucket control of access logging, so that I can audit access to input and output independently.

#### Acceptance Criteria

1. WHEN ASYNC_BATCH is selected and logSourceS3AccessLogs is true or undefined, THE Construct SHALL enable access logging on the Source_Bucket
2. WHEN ASYNC_BATCH is selected and logSourceS3AccessLogs is false, THE Construct SHALL NOT enable access logging on the Source_Bucket
3. WHEN ASYNC_BATCH is selected and logDestinationS3AccessLogs is true or undefined, THE Construct SHALL enable access logging on the Destination_Bucket
4. WHEN ASYNC_BATCH is selected and logDestinationS3AccessLogs is false, THE Construct SHALL NOT enable access logging on the Destination_Bucket
5. WHEN sourceLoggingBucketProps is provided, THE Construct SHALL create the source logging bucket with those properties
6. WHEN destinationLoggingBucketProps is provided, THE Construct SHALL create the destination logging bucket with those properties

### Requirement 16: Props Validation

**User Story:** As a developer, I want clear error messages when I provide conflicting props, so that I can quickly fix configuration issues.

#### Acceptance Criteria

1. THE Construct SHALL validate all props before creating any resource
2. WHEN more than one Comprehend-specific prop error is present, THE Construct SHALL report every Comprehend-specific error in a single thrown error
3. WHEN Comprehend-specific errors and errors from another service's validation are both present, THE Construct MAY report only the first service's errors
4. WHEN any async-only prop is provided and ASYNC_BATCH is not selected, THE Construct SHALL reject the configuration with an error
5. WHEN both existingLambdaObj and lambdaFunctionProps are provided, THE Construct SHALL reject the configuration with an error
6. WHEN both deployVpc and existingVpc are provided, THE Construct SHALL reject the configuration with an error
7. WHEN existingLambdaObj references a function that is not bound to a VPC and a VPC is requested, THE Construct SHALL reject the configuration with an error

### Requirement 17: Multi-Language Support

**User Story:** As a developer using TypeScript, Python, Java, or .NET, I want to use the construct in my preferred language, so that it integrates with my existing CDK application.

#### Acceptance Criteria

1. THE Construct SHALL be published to NPM for TypeScript and JavaScript
2. THE Construct SHALL be published to PyPI for Python
3. THE Construct SHALL be published to Maven for Java
4. THE Construct SHALL be published to NuGet for .NET
5. THE Construct SHALL maintain consistent prop names and types across all languages
6. THE Construct SHALL re-export the ComprehendUseCase and ComprehendAnalysisType enums from its own package entry point
7. THE Construct documentation SHALL state the import path for both enums in every documented language
