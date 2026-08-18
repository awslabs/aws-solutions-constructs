# Design Document

## Overview

The aws-lambda-comprehend construct deploys an AWS Lambda function with least-privilege IAM permissions to invoke Amazon Comprehend. The construct's distinguishing feature is that the granted permission set is derived from a **cross product** of two independent Client selections:

- `comprehendUseCases` — which processing modes the function uses (`SINGLE_DOCUMENT_SYNC`, `MULTI_DOCUMENT_SYNC`, `ASYNC_BATCH`)
- `analysisTypes` — which analysis families the function uses (`DOMINANT_LANGUAGE`, `ENTITIES`, `KEY_PHRASES`, `SENTIMENT`, `TARGETED_SENTIMENT`, `SYNTAX`, `PII`)

The cross product is **ragged**: Amazon Comprehend does not offer every mode for every family. There is no `BatchDetectPiiEntities` and no `StartSyntaxDetectionJob`. The construct models these gaps as data, silently skips them when a selection has other productive combinations, and raises an error only when a selected analysis type produces no action at all.

When `ASYNC_BATCH` is selected the construct additionally provisions the resources asynchronous jobs require: an input bucket, an output bucket (or one bucket serving both roles), and an IAM role Amazon Comprehend assumes to reach them.

The construct does not supply Lambda handler code. The Client writes the code that calls Comprehend; the construct supplies the permissions, the resources, and the environment variables that let the handler find them.

## Architecture

### Synchronous Mode (default)

```
┌──────────────────┐
│                  │
│  Lambda Function │
│                  │
└────────┬─────────┘
         │ comprehend:Detect*
         │ comprehend:BatchDetect*
         │ comprehend:ContainsPiiEntities
         ▼
┌──────────────────┐
│ Amazon Comprehend│
└──────────────────┘
```

**Resources:**

- Lambda function (X-Ray tracing enabled, 30 second default timeout)
- Lambda execution role with one inline statement granting the generated Comprehend actions

**Note:** No S3 buckets and no data access role are created in synchronous mode. Synchronous Comprehend APIs take the document text in the request and return the result in the response, so there is nothing to stage in S3.

### Asynchronous Mode

```
┌──────────────────┐        StartXDetectionJob        ┌──────────────────┐
│                  │  (DataAccessRoleArn, InputS3Uri, │                  │
│  Lambda Function ├─────────  OutputS3Uri) ─────────>│ Amazon Comprehend│
│                  │                                  │                  │
└───┬──────────┬───┘                                  └────┬────────┬────┘
    │          │                                           │        │
    │ write    │ read                              assumes │        │
    │          │                                           ▼        │
    │          │                                  ┌──────────────┐  │
    │          │                                  │ Data Access  │  │
    │          │                                  │     Role     │  │
    │          │                                  └───┬──────┬───┘  │
    ▼          ▼                                      │      │      │
┌────────┐  ┌────────────┐                     read   │      │ write│
│ Source │  │Destination │<───────────────────────────┴──────┴──────┘
│ Bucket │  │  Bucket    │
└────────┘  └────────────┘
    ▲                │
    └────────────────┘
     (one bucket when
      useSameBucket)
```

**Resources:**

- Lambda function, as in synchronous mode
- Source bucket (encrypted, versioned, SSL enforced, public access blocked, access logging enabled)
- Destination bucket, same defaults — omitted when `useSameBucket` is true
- Source and destination access log buckets, unless logging is disabled per bucket
- Data access role, trusted by `comprehend.amazonaws.com`, conditioned on `aws:SourceAccount`
- Lambda grants: read/write on source, read on destination, `iam:PassRole` on the data access role
- Three environment variables on the Lambda function: source bucket name, destination bucket name, data access role ARN

**Note:** The Lambda function starts and polls jobs; it never receives job results directly. Amazon Comprehend reads the input objects and writes the output archive under its own assumed role, on its own schedule. The construct grants the Lambda function read access to the destination bucket so the handler can retrieve output after a job reports `COMPLETED`.

### VPC Deployment

```
┌───────────────────────────────────────────────┐
│ VPC (isolated subnets)                        │
│                                               │
│  ┌──────────────────┐                         │
│  │  Lambda Function │                         │
│  └────────┬─────────┘                         │
│           │                                   │
│    ┌──────┴───────┐      ┌─────────────────┐  │
│    │  Comprehend  │      │   S3 Gateway    │  │
│    │  Interface   │      │    Endpoint     │  │
│    │   Endpoint   │      │  (async only)   │  │
│    └──────┬───────┘      └────────┬────────┘  │
└───────────┼───────────────────────┼───────────┘
            ▼                       ▼
   ┌──────────────────┐     ┌──────────────┐
   │ Amazon Comprehend│     │  Amazon S3   │
   └──────────────────┘     └──────────────┘
```

**Resources:**

- VPC with isolated subnets and no NAT gateways, or a Client-supplied VPC
- Comprehend Interface Endpoint, always created when a VPC is in use
- S3 Gateway Endpoint, created only when `ASYNC_BATCH` is selected
- Lambda function bound to the VPC's isolated subnets

**Note:** The VPC boundary applies to the Lambda function's calls to Comprehend, not to the execution of asynchronous jobs. Amazon Comprehend runs jobs in service-managed infrastructure and reaches S3 over its own network path. When both a VPC and `ASYNC_BATCH` are configured, the construct emits a warning making this explicit, so Clients do not assume network isolation extends to job execution. The construct deliberately exposes no props for job-level Comprehend VPC configuration; that setting belongs on the `Start*DetectionJob` request the Client's handler builds at runtime.

## Components and Interfaces

### Enumerations

Both enums are declared in `@aws-solutions-constructs/core` and re-exported from the construct's `lib/index.ts`, following the precedent set by aws-sqs-pipes-stepfunctions. Declaring them in core allows other constructs to consume them without depending on this construct; re-exporting them means TypeScript Clients need only one import.

- `ComprehendUseCase` — `SINGLE_DOCUMENT_SYNC`, `MULTI_DOCUMENT_SYNC`, `ASYNC_BATCH`
- `ComprehendAnalysisType` — `DOMINANT_LANGUAGE`, `ENTITIES`, `KEY_PHRASES`, `SENTIMENT`, `TARGETED_SENTIMENT`, `SYNTAX`, `PII`

A JSII re-export does not mint a new fully-qualified name. In Python, Java, and .NET the enums remain members of the core package, so documentation for those languages must show the core import path.

### Props Interface

`LambdaToComprehendProps` exposes, in order:

- **Lambda** — `existingLambdaObj`, `lambdaFunctionProps`
- **Comprehend selection** — `comprehendUseCases`, `analysisTypes`, `additionalPermissions`
- **Source bucket (async only)** — `existingSourceBucketObj`, `sourceBucketProps`, `logSourceS3AccessLogs`, `sourceLoggingBucketProps`
- **Destination bucket (async only)** — `existingDestinationBucketObj`, `destinationBucketProps`, `logDestinationS3AccessLogs`, `destinationLoggingBucketProps`, `useSameBucket`
- **Environment variable names (async only)** — `sourceBucketEnvironmentVariableName`, `destinationBucketEnvironmentVariableName`, `dataAccessRoleArnEnvironmentVariableName`
- **VPC** — `existingVpc`, `vpcProps`, `deployVpc`

Every prop is optional. `vpcProps` is typed `ec2.VpcProps | any` so that Clients may supply a partial set of VPC properties, matching the pattern used elsewhere in the library; the loosened type is compensated for by a runtime `ValidateVpcProps` check. Bucket props remain strictly typed as `s3.BucketProps` because `s3.BucketProps` has no required members.

The JSDoc comment on each prop must match the corresponding row in README.adoc verbatim.

### Construct Class

`LambdaToComprehend` exposes nine public properties:

| Property | Type | Present when |
|---|---|---|
| `lambdaFunction` | `lambda.Function` | always |
| `vpc` | `ec2.IVpc` | a VPC is in use |
| `sourceBucket` | `s3.Bucket` | async and the construct created the bucket |
| `sourceBucketInterface` | `s3.IBucket` | async |
| `sourceLoggingBucket` | `s3.Bucket` | async and source logging is enabled |
| `destinationBucket` | `s3.Bucket` | async and the construct created the bucket |
| `destinationBucketInterface` | `s3.IBucket` | async |
| `destinationLoggingBucket` | `s3.Bucket` | async and destination logging is enabled |
| `dataAccessRole` | `iam.Role` | async |

When `useSameBucket` is true, the destination properties reference the same bucket object as the source properties.

### Core Helper Functions Used

- `CheckLambdaProps`, `buildLambdaFunction` — Lambda creation and validation
- `CheckS3Props`, `buildS3Bucket` — bucket creation and validation
- `CheckVpcProps`, `buildVpc`, `AddAwsServiceEndpoint`, `ValidateVpcProps` — VPC creation, endpoints, and prop validation
- `DefaultIsolatedVpcProps` — VPC defaults
- `printWarning` — the async-in-VPC advisory
- `EnvironmentVariableDefinition` (from `polly-helper`) and `BucketDetails` (from `translate-helper`) — shared shapes reused in place rather than re-declared

Reusing those two types across helper files does not change any published API: core's exports are flat, so a type's JSII name is `@aws-solutions-constructs/core.<TypeName>` regardless of which file declares it. Relocating both to a neutral `utils.ts` is a worthwhile follow-up but is out of scope here.

### ConfigureComprehendSupport Helper Function

New file `core/lib/comprehend-helper.ts` provides:

- `ComprehendUseCase` and `ComprehendAnalysisType` enum declarations
- `CheckComprehendProps(props)` — accumulates every Comprehend-specific validation failure and throws once
- `ConfigureComprehendSupport(scope, props)` — creates buckets and the data access role, grants permissions, and returns the environment variable definitions and resource references the calling construct needs
- An internal action map and an internal `resolveComprehendSelection(props)` used by both the check and the configure function, so validation and configuration can never disagree about what was selected

## Data Models

### Action Map

The ragged cross product is expressed as one flat record keyed by analysis type. An absent field means "this mode does not exist for this family" — the map uses absence rather than an empty-array sentinel, so a gap cannot be confused with an intentionally empty list.

| Analysis type | Sync action(s) | Batch action | Async job family |
|---|---|---|---|
| `DOMINANT_LANGUAGE` | `DetectDominantLanguage` | `BatchDetectDominantLanguage` | `DominantLanguageDetectionJob` |
| `ENTITIES` | `DetectEntities` | `BatchDetectEntities` | `EntitiesDetectionJob` |
| `KEY_PHRASES` | `DetectKeyPhrases` | `BatchDetectKeyPhrases` | `KeyPhrasesDetectionJob` |
| `SENTIMENT` | `DetectSentiment` | `BatchDetectSentiment` | `SentimentDetectionJob` |
| `TARGETED_SENTIMENT` | `DetectTargetedSentiment` | `BatchDetectTargetedSentiment` | `TargetedSentimentDetectionJob` |
| `SYNTAX` | `DetectSyntax` | `BatchDetectSyntax` | *(none)* |
| `PII` | `DetectPiiEntities`, `ContainsPiiEntities` | *(none)* | `PiiEntitiesDetectionJob` |

Each async job family expands to four actions: `Start<Family>`, `Describe<Family>`, `List<Family>s`, `Stop<Family>`. Note the plural on the `List` form.

### Emission Order

Actions are emitted with the use case as the outer loop and the analysis type as the inner loop, both in enum declaration order, then de-duplicated preserving first-seen order. The resulting policy groups all synchronous actions together, then all batch actions, then all asynchronous actions — readable in the console and, more importantly, independent of the order in which the Client listed the array members. Two stacks configured with the same selections in different orders synthesize identical templates.

The default selection — both synchronous modes, all seven analysis types — produces exactly fourteen actions: seven `Detect*` plus `ContainsPiiEntities`, then six `BatchDetect*`. Adding `ASYNC_BATCH` across all seven types adds twenty-four more.

### IAM Policy Structure

All Comprehend actions occupy a single policy statement with `Resource: "*"`.

Fourteen of the modelled actions — the synchronous and batch ones — have no resource type in the Comprehend IAM reference and can only be authorized on `*`. The asynchronous `Start`/`Describe`/`Stop` actions do accept a job ARN of the form `arn:<partition>:comprehend:<region>:<account>:<jobtype>/*`, and the `List*Jobs` actions do not. Splitting the statement to scope the async subset would produce a wildcard-suffixed ARN that authorizes every job of that type in the account — the same effective grant as `*`, at the cost of a more complex policy and a second statement. The construct therefore uses one statement. Clients who need job-level scoping can attach a narrower policy themselves.

`additionalPermissions` entries are appended to that same statement, after the generated actions, de-duplicated against them.

`comprehend:TagResource` is not granted. Tagging a job is optional, and granting it by default would widen every deployment's permissions for a capability most Clients do not use. Clients who tag jobs add the action through `additionalPermissions`; README.adoc documents this.

When `ASYNC_BATCH` is selected, a second statement grants `iam:PassRole` on the data access role ARN, conditioned on `iam:PassedToService` equal to `comprehend.amazonaws.com`. Without the condition the grant would let the function pass the role to any service that trusts it.

### Data Access Role Trust Policy

The role trusts the `comprehend.amazonaws.com` service principal with an `aws:SourceAccount` condition matching the deploying account, guarding against the confused-deputy pattern in which another account's Comprehend job names this role.

The role receives S3 read on the source bucket and read/write on the destination bucket, collapsing to a single read/write grant when `useSameBucket` is true. It receives no KMS permissions: the construct's buckets use S3-managed encryption, which requires no key policy grant. Clients supplying a customer-managed key on an existing bucket grant the role key access themselves.

### Environment Variable Structure

| Default name | Overridable via | Value |
|---|---|---|
| `SOURCE_BUCKET_NAME` | `sourceBucketEnvironmentVariableName` | source bucket name |
| `DESTINATION_BUCKET_NAME` | `destinationBucketEnvironmentVariableName` | destination bucket name |
| `DATA_ACCESS_ROLE_ARN` | `dataAccessRoleArnEnvironmentVariableName` | data access role ARN |

None of the three is set in synchronous mode. When `useSameBucket` is true, the first two carry the same value — the handler need not know whether one bucket or two were provisioned.

## Implementation Details

### Constructor Flow

1. `CheckLambdaProps(props)`
2. `CheckComprehendProps(props)`
3. `CheckS3Props` for the source bucket, and for the destination bucket when applicable
4. `CheckVpcProps(props)` followed by `ValidateVpcProps(this, props.vpcProps)` — the loose-typed check runs last so that structural errors are reported only after the combination checks pass
5. Build the VPC if requested; add the Comprehend Interface Endpoint, and the S3 Gateway Endpoint when async
6. `buildLambdaFunction`
7. `ConfigureComprehendSupport` — buckets, data access role, grants, environment variable definitions
8. Apply the returned environment variables to the Lambda function
9. Merge `additionalPermissions` into the Comprehend policy statement and attach it
10. Assign the public properties
11. Emit the async-in-VPC warning when both conditions hold

Validation precedes all resource creation, so a rejected configuration produces no partial stack.

### Default Configurations

**Lambda function** — Node.js runtime with X-Ray tracing, a 30 second timeout, and the environment variables above. A Client-supplied timeout always wins.

**S3 buckets** — S3-managed encryption, versioning enabled, all public access blocked, SSL enforced, access logging to a companion log bucket. Log buckets carry a cfn-nag W35 suppression, since a log bucket has no access logging of its own.

**VPC** — isolated subnets, no NAT gateways, DNS hostnames and DNS support enabled.

**Endpoints** — the Comprehend Interface Endpoint requires a new `ServiceEndpointTypes.COMPREHEND` member in `core/lib/vpc-helper.ts` mapped to `ec2.InterfaceVpcEndpointAwsService.COMPREHEND`.

## Error Handling

### Validation Errors

`CheckComprehendProps` accumulates messages and throws once, so a Client with several Comprehend misconfigurations sees all of them in one run. The construct calls four separate validators in sequence, and each throws on its own failures, so a run reporting Comprehend errors may not also report S3 or VPC errors. This is the established behaviour of all twenty-three `Check*Props` functions in core and is accepted, not a defect specific to this construct.

Conditions rejected:

- Both `existingLambdaObj` and `lambdaFunctionProps`
- Both an `existing*BucketObj` and the matching `*BucketProps`
- Both `deployVpc` and `existingVpc`
- `vpcProps` containing keys that are not valid VPC properties
- An empty `comprehendUseCases` or `analysisTypes` array
- A selected analysis type that yields no action under any selected use case
- Any async-only prop supplied when `ASYNC_BATCH` is not selected
- A destination bucket prop supplied together with `useSameBucket`

Duplicate enum members in either array are de-duplicated silently — a duplicate is redundant, not wrong.

### Runtime Errors

Runtime Comprehend failures — throttling, unsupported language, oversized document, job failure — surface to the Client's handler code, which owns retry and error reporting. The construct adds no SNS topic, no S3 event notification, no dead-letter queue, and no CloudWatch alarms; a construct cannot know a Client's notification topology, and each of those would be an unrequested resource with its own cost and permission surface.

Clients should be aware that `Start*DetectionJob` is limited to one transaction per second and that limit is not adjustable, while the concurrent-job limit of ten is. README.adoc records both.

### CDK Synthesis Errors

Standard CDK synthesis errors apply. Because `vpcProps` is typed `| any`, a structurally invalid VPC prop object passes the compiler and is caught at synthesis by `ValidateVpcProps` with a message naming the offending keys.

## Observability

The Lambda function has X-Ray tracing enabled by default and logs to CloudWatch through its standard execution role. The construct adds no custom metrics, alarms, or dashboards: for asynchronous jobs the meaningful signals — job status, document counts, failure reasons — come from `Describe*DetectionJob` responses, which only the Client's handler observes.

## Testing Strategy

### Approach

Unit tests synthesize the construct and assert against the resulting CloudFormation template. Nothing is mocked — no stubbed CDK constructs, no fake Comprehend client. Assertions use `Match.*` helpers; `expect.objectContaining` does not work in the CDK assertion context.

### Unit Testing Focus

- Default deployment: fourteen Comprehend actions asserted as a literal array, in order
- Each of the three use cases in isolation, and every pairing
- Each of the seven analysis types in isolation
- The two documented gaps: batch-only + PII, and async-only + SYNTAX, both rejected
- A selection spanning both gaps that must be accepted
- Order independence: two stacks, same selections in different array orders, identical policies
- Async resource creation: buckets, log buckets, data access role, trust policy conditions, `iam:PassRole` condition
- `useSameBucket`: one bucket, collapsed grants, both environment variables carrying the same value
- Existing buckets supplied by the Client, verifying grants are emitted against the bucket interface
- Environment variable name overrides, all three
- Access logging disabled, per bucket
- VPC scenarios: `deployVpc`, `existingVpc`, `vpcProps`; endpoint presence with and without async
- Every rejected condition listed under Validation Errors

No single test asserts a Comprehend message and an S3 message in the same thrown error — the sequential-validator behaviour above makes that combination unreachable by design.

Coverage target is 95% of lines, verified by reading the coverage report rather than enforced by a `coverageThreshold` in package.json.

### Integration Testing

Seven integration tests, each a full deployment capturing a snapshot:

1. Default synchronous deployment
2. Synchronous deployment with a narrowed analysis type selection
3. Asynchronous deployment with construct-created buckets
4. Asynchronous deployment with `useSameBucket`
5. Asynchronous deployment with Client-supplied existing buckets
6. Asynchronous deployment in a VPC
7. Synchronous deployment in a VPC

Every test uses `generateIntegStackName(__filename)` and `SetConsistentFeatureFlags(stack)`. Every bucket in every test sets `removalPolicy: RemovalPolicy.DESTROY` and `autoDeleteObjects: true`, so that teardown leaves nothing behind. Tests that create auto-delete buckets or a VPC apply `suppressCustomHandlerCfnNagWarnings` for the corresponding CDK-generated custom resource provider.
