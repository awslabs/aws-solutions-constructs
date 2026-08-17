# Implementation Plan: aws-lambda-comprehend

## Overview

This plan implements the aws-lambda-comprehend construct in nine groups. Each group leaves the repository in a building, passing state and is executed independently.

Group 2 ends at a review gate: the README.adoc is the construct's public contract, and the Constructs team reviews it before any code is written. No task after group 2 begins until that review completes.

Groups 3 and 4 add to `@aws-solutions-constructs/core`. Group 5 creates the construct package. Groups 6 and 7 test it. Groups 8 and 9 register it in the repository's documentation and build machinery and verify the whole thing end to end.

## Tasks

- [x] 1. Kiro spec
  - [x] 1.1 Write `requirements.md`
    - Introduction, glossary, and seventeen requirements in EARS format
    - Glossary defines `ComprehendUseCase`, `ComprehendAnalysisType`, the data access role, and the job/VPC boundary
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_
  - [x] 1.2 Write `design.md`
    - Overview, architecture with ASCII diagrams for synchronous, asynchronous, and VPC deployment
    - Components and interfaces, data models, implementation details, error handling, observability, testing strategy
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 1.3 Write `tasks.md`
    - Nine groups with requirement back-references
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2. README.adoc — public contract **[review gate: stop for Constructs team sign-off]**
  - [x] 2.1 Write the header and overview
    - Machine-readable preamble, experimental stability badge, language package table
    - Minimal deployable example in TypeScript, Python, and Java
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  - [x] 2.2 Document the props table
    - Every prop with its type, default, and description; descriptions must match the JSDoc written in group 5 verbatim
    - Spell out the enum import path for each documented language, since a JSII re-export does not create a new fully-qualified name
    - _Requirements: 17.5, 17.6, 17.7_
  - [x] 2.3 Document the properties table and default settings
    - Nine public properties with the conditions under which each is defined
    - Default settings per service, including the fourteen-action default policy
    - _Requirements: 4.10, 7.5, 7.6, 7.7, 8.5, 8.6, 8.7, 10.5_
  - [x] 2.4 Document the caveats and additional examples
    - The asynchronous-jobs-do-not-run-in-your-VPC note, the one-TPS non-adjustable job start limit, and that `comprehend:TagResource` is not granted and must be requested through `additionalPermissions`
    - Asynchronous example, shared-bucket example, VPC example
    - _Requirements: 4.11, 12.1, 12.4, 14.10, 14.11_
  - [x] 2.5 **STOP** — request Constructs team review of README.adoc before writing any code
    - _Requirements: 17.5_

- [x] 3. Core VPC endpoint support
  - [x] 3.1 Add `ServiceEndpointTypes.COMPREHEND` to `core/lib/vpc-helper.ts`
    - Map the new member to `ec2.InterfaceVpcEndpointAwsService.COMPREHEND` in the endpoint settings record
    - _Requirements: 14.4_
  - [x] 3.2 Add a core unit test for the new endpoint type
    - Assert an interface endpoint is created for the Comprehend service
    - _Requirements: 14.4_

- [x] 4. Core comprehend-helper
  - [x] 4.1 Declare the two enums in `core/lib/comprehend-helper.ts`
    - `ComprehendUseCase` with three members and `ComprehendAnalysisType` with seven, in the declaration order the emission loop depends on
    - _Requirements: 2.1, 2.2, 3.1, 3.2_
  - [x] 4.2 Build the action map and the async action expander
    - One flat record keyed by analysis type, with absent fields marking the gaps rather than empty arrays
    - Expand each job family to Start, Describe, List (plural), and Stop
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [x] 4.3 Implement `resolveComprehendSelection(props)`
    - Apply defaults, de-duplicate, and return the resolved selection used by both the check and the configure function
    - _Requirements: 2.1, 2.4, 3.1, 3.4_
  - [x] 4.4 Implement the action emission loop
    - Use case outer, analysis type inner, both in enum declaration order, de-duplicated preserving first-seen order
    - _Requirements: 4.1, 4.8, 4.10, 4.11_
  - [x] 4.5 Implement `CheckComprehendProps(props)`
    - Accumulate every Comprehend-specific message and throw once
    - Reject empty arrays, unproductive analysis types, async-only props without `ASYNC_BATCH`, and destination props combined with `useSameBucket`
    - _Requirements: 2.3, 3.3, 5.1, 5.2, 5.3, 5.4, 5.5, 9.5, 16.1, 16.2, 16.3, 16.4_
  - [x] 4.6 Implement bucket provisioning inside `ConfigureComprehendSupport`
    - Source and destination buckets via `buildS3Bucket`, honouring existing-bucket props, per-bucket logging flags, and logging bucket props
    - Collapse to one bucket when `useSameBucket`
    - _Requirements: 6.1, 6.3, 7.1, 7.2, 7.3, 7.4, 7.8, 8.1, 8.2, 8.3, 8.4, 8.8, 9.1, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  - [x] 4.7 Implement the data access role
    - Trust `comprehend.amazonaws.com` with an `aws:SourceAccount` condition; grant S3 read on source and read/write on destination, collapsed when `useSameBucket`; grant no KMS permissions
    - _Requirements: 6.2, 6.4, 9.4, 10.1, 10.2, 10.3, 10.4, 10.9_
  - [x] 4.8 Implement the Lambda grants and environment variable definitions
    - Read/write on source and read on destination, applied to the bucket interface so existing buckets receive grants; collapsed to one read/write grant when `useSameBucket`
    - `iam:PassRole` conditioned on `iam:PassedToService`
    - Return the three environment variable definitions with their overridable names
    - _Requirements: 9.2, 9.3, 10.6, 10.7, 10.8, 11.1, 11.2, 11.3, 11.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  - [x] 4.9 Add core unit tests for the helper
    - Cover the action map, the emission order, the selection resolver, and every branch of `CheckComprehendProps`
    - _Requirements: 4.8, 5.1, 5.2, 16.2_

- [x] 5. Construct package
  - [x] 5.1 Create the package scaffolding
    - `package.json` with the standard scripts including `blt`, JSII targets for Python, Java, and .NET, `.npmignore`, `.gitignore`, brief `README.md`
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  - [x] 5.2 Define `LambdaToComprehendProps` in `lib/index.ts`
    - Every prop optional; `vpcProps` typed `ec2.VpcProps | any`; JSDoc matching README.adoc verbatim
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 7.1, 7.2, 8.1, 8.2, 12.1, 13.1, 14.1, 14.2, 14.3_
  - [x] 5.3 Re-export both enums from `lib/index.ts`
    - _Requirements: 17.6_
  - [x] 5.4 Implement the constructor validation sequence
    - `CheckLambdaProps`, `CheckComprehendProps`, `CheckS3Props` per bucket, `CheckVpcProps`, then `ValidateVpcProps` last
    - All validation precedes all resource creation
    - _Requirements: 1.3, 14.8, 14.9, 16.1, 16.5, 16.6, 16.7_
  - [x] 5.5 Implement VPC creation and endpoints
    - Comprehend interface endpoint always; S3 gateway endpoint only when `ASYNC_BATCH` is selected
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_
  - [x] 5.6 Build the Lambda function
    - `buildLambdaFunction` with a 30 second default timeout that a Client-supplied timeout overrides; no Comprehend-calling handler code shipped
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8_
  - [x] 5.7 Call `ConfigureComprehendSupport` and wire the results
    - Apply the returned environment variables; assign the nine public properties
    - _Requirements: 6.5, 7.5, 7.6, 7.7, 8.5, 8.6, 8.7, 10.5, 13.1, 13.3, 13.5_
  - [x] 5.8 Merge `additionalPermissions` and attach the policy
    - Append after the generated actions in the same statement, de-duplicated; merge in `lib/index.ts` so the prop stays out of the core helper's interface
    - _Requirements: 4.9, 12.1, 12.2, 12.3, 12.4_
  - [x] 5.9 Emit the async-in-VPC warning
    - `printWarning` after the VPC block, only when a VPC and `ASYNC_BATCH` are both configured
    - _Requirements: 14.10_

- [x] 6. Unit tests
  - [x] 6.1 Default deployment and the fourteen-action policy
    - Assert the action list as a literal ordered array
    - _Requirements: 1.4, 2.1, 3.1, 4.1, 4.10, 4.11_
  - [x] 6.2 Use case and analysis type coverage
    - Each use case alone and every pairing; each analysis type alone; both gaps rejected; the gap-spanning selection accepted
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 6.3 Order independence
    - Two stacks with the same selections in different array orders synthesize identical policies
    - _Requirements: 4.8_
  - [x] 6.4 Asynchronous resource tests
    - Buckets, log buckets, data access role, trust policy conditions, `iam:PassRole` condition, no KMS grant, no S3 resources in synchronous mode
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.4, 7.8, 8.4, 8.8, 10.1, 10.2, 10.3, 10.4, 10.6, 10.7, 10.8, 10.9, 11.1, 11.2, 11.4_
  - [x] 6.5 Shared bucket, existing bucket, and logging tests
    - `useSameBucket` collapse and matching environment variables; grants emitted for Client-supplied existing buckets; per-bucket logging disabled; logging bucket props honoured
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 9.1, 9.2, 9.3, 9.4, 9.5, 11.3, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  - [x] 6.6 Environment variable and additional permission tests
    - All three name overrides; no variables set in synchronous mode; additional permissions appended and de-duplicated
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  - [x] 6.7 VPC and validation-error tests
    - `deployVpc`, `existingVpc`, `vpcProps`; endpoint presence with and without async; the warning; every rejected condition
    - No test asserts a Comprehend message and an S3 message in the same thrown error
    - _Requirements: 1.1, 1.2, 1.3, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10, 14.11, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_
  - [x] 6.8 Read the coverage report and confirm 95% of lines
    - _Requirements: 16.1_

- [x] 7. Integration tests
  - [x] 7.1 Default synchronous deployment
    - _Requirements: 1.4, 2.1, 3.1, 4.10_
  - [x] 7.2 Synchronous deployment with a narrowed analysis type selection
    - _Requirements: 3.2, 4.2, 4.4_
  - [x] 7.3 Asynchronous deployment with construct-created buckets
    - _Requirements: 6.1, 6.2, 7.4, 8.4, 10.1, 13.1, 13.3, 13.5_
  - [x] 7.4 Asynchronous deployment with `useSameBucket`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 7.5 Asynchronous deployment with Client-supplied existing buckets
    - _Requirements: 7.2, 7.8, 8.2, 8.8, 11.3_
  - [x] 7.6 Asynchronous deployment in a VPC
    - _Requirements: 14.1, 14.4, 14.5, 14.10_
  - [x] 7.7 Synchronous deployment in a VPC
    - _Requirements: 14.4, 14.6, 14.7_
  - [x] 7.8 Apply teardown and suppression conventions to all seven
    - `RemovalPolicy.DESTROY` and `autoDeleteObjects` on every bucket; `suppressCustomHandlerCfnNagWarnings` for each CDK-generated custom resource provider in play
    - _Requirements: 15.1, 15.3_

- [x] 8. Registration and documentation
  - [x] 8.1 Add the construct to `documentation/document-revisions.adoc`
    - _Requirements: 17.1_
  - [x] 8.2 Add the construct to `documentation/welcome.adoc`
    - _Requirements: 17.1_
  - [x] 8.3 Add the construct to `deployment/v2/refresh-multiple-tests.sh`
    - _Requirements: 17.1_
  - [x] 8.4 Generate and add the architecture diagram
    - _Requirements: 17.1_
  - [x] 8.5 Review the docs diff before publishing
    - The publish script diffs globally; restrict the reviewed diff to this construct's files
    - _Requirements: 17.1_

- [x] 9. Verify
  - [x] 9.1 Run `npm run blt` for core and the construct package
    - Build, lint, unit tests, and integration snapshot assertions must all pass
    - _Requirements: 16.1_
  - [x] 9.2 Confirm the enum fully-qualified names against the built `.jsii`
    - If the Python or Java import paths differ from what README.adoc documents, correct README.adoc — the design does not change
    - _Requirements: 17.5, 17.6, 17.7_
  - [x] 9.3 Run `cfn-guard validate` and confirm no new findings
    - _Requirements: 16.1_
