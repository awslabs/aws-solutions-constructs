# Design Document: aws-lambda-polly

## Overview

The aws-lambda-polly construct implements a well-architected pattern for integrating AWS Lambda with Amazon Polly text-to-speech service. The construct supports both synchronous and asynchronous Polly operations:

- **Synchronous mode** (default): Lambda function can call `SynthesizeSpeech` API for immediate text-to-speech conversion (up to 3000 characters)
- **Asynchronous mode** (when `asyncJobs: true`): Lambda function can start long-running synthesis tasks via `StartSpeechSynthesisTask`, with results stored in S3 and completion notifications sent to SNS

The construct follows Solutions Constructs patterns by:
- Delegating resource creation to core helper functions
- Granting least-privilege IAM permissions between services
- Providing environment variables for resource discovery
- Supporting VPC deployment with appropriate endpoints
- Allowing clients to use existing resources or override defaults

## Architecture

### Synchronous Mode Architecture (asyncJobs: false or undefined)

```
┌─────────────────┐
│  Lambda         │
│  Function       │──────> Amazon Polly
│                 │        (SynthesizeSpeech)
└─────────────────┘
```

**Resources:**
- Lambda Function with IAM permissions for `polly:SynthesizeSpeech`

### Asynchronous Mode Architecture (asyncJobs: true)

```
┌─────────────────┐
│  Lambda         │──────> Amazon Polly
│  Function       │        (StartSpeechSynthesisTask,
│                 │         GetSpeechSynthesisTask,
└─────────────────┘         ListSpeechSynthesisTasks)
         │                           │
         │                           │ Polly writes audio
         │                           ▼
         │                  ┌─────────────────┐
         │ has permissions  │  S3 Bucket      │
         │ to access        │  (Output)       │
         └─────────────────>└─────────────────┘
                                     │
                                     │ logs access
                                     ▼
                            ┌─────────────────┐
                            │  S3 Bucket      │
                            │  (Logging)      │
                            └─────────────────┘

         ┌─────────────────┐
         │  Lambda has     │
         │  permissions to │
         │  publish        │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  SNS Topic      │<──── Polly sends
         │  (Notifications)│      completion
         └─────────────────┘      notifications
```

**Resources:**
- Lambda Function with IAM permissions for Polly sync and async APIs, S3 read/write, SNS publish
- S3 Bucket for audio output (with encryption, versioning, access logging)
- S3 Bucket for access logs (optional, controlled by `logS3AccessLogs`)
- SNS Topic for completion notifications (with encryption, configured by construct)
- Environment variables on Lambda: `OUTPUT_BUCKET_NAME`, `SNS_TOPIC_ARN`

**Note:** The Lambda function receives the bucket name and SNS topic ARN via environment variables and passes them to Polly when starting synthesis tasks. Polly writes audio files directly to the S3 bucket and sends completion notifications directly to the SNS topic. The Lambda function has S3 read/write permissions to optionally retrieve or process the generated audio files, and SNS publish permissions to pass the topic ARN to Polly.
### VPC Deployment (Optional)

When `deployVpc: true` or `existingVpc` is provided:

```
┌──────────────────────────────────────────┐
│  VPC                                     │
│                                          │
│  ┌─────────────────┐                    │
│  │  Lambda         │                    │
│  │  Function       │                    │
│  └─────────────────┘                    │
│           │                              │
│           │                              │
│           ▼                              │
│  ┌─────────────────┐                    │
│  │  Polly Interface│                    │
│  │  Endpoint       │                    │
│  └─────────────────┘                    │
│           │                              │
│           │ (asyncJobs: true)            │
│           ▼                              │
│  ┌─────────────────┐                    │
│  │  S3 Gateway     │                    │
│  │  Endpoint       │                    │
│  └─────────────────┘                    │
│                                          │
└──────────────────────────────────────────┘
         │
         └────────> Amazon Polly (via Interface Endpoint)
         └────────> S3 (via Gateway Endpoint, asyncJobs only)
         └────────> SNS (via AWS network)
```

## Components and Interfaces

### Props Interface

```typescript
export interface LambdaToPollyProps {
  // Lambda configuration
  readonly existingLambdaObj?: lambda.Function;
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  
  // Async job support
  readonly asyncJobs?: boolean;
  
  // S3 bucket configuration (async only)
  readonly existingBucketObj?: s3.IBucket;
  readonly bucketProps?: s3.BucketProps;
  readonly bucketEnvironmentVariableName?: string;
  
  // S3 access logging (async only)
  readonly logS3AccessLogs?: boolean;
  readonly loggingBucketProps?: s3.BucketProps;
  
  // SNS topic configuration (async only)
  readonly existingTopicObj?: sns.Topic;
  readonly topicProps?: sns.TopicProps;
  readonly topicEnvironmentVariableName?: string;
  
  // SNS topic encryption (async only)
  readonly existingTopicEncryptionKey?: kms.Key;
  readonly topicEncryptionKey?: kms.Key;
  readonly topicEncryptionKeyProps?: kms.KeyProps;
  readonly enableTopicEncryptionWithCustomerManagedKey?: boolean;
  
  // VPC configuration
  readonly existingVpc?: ec2.IVpc;
  readonly vpcProps?: ec2.VpcProps;
  readonly deployVpc?: boolean;
}
```

### Construct Class

```typescript
export class LambdaToPolly extends Construct {
  // Always exposed
  public readonly lambdaFunction: lambda.Function;
  public readonly vpc?: ec2.IVpc;
  
  // Exposed when asyncJobs is true and construct creates the bucket
  public readonly destinationBucket?: s3.Bucket;
  public readonly loggingBucket?: s3.Bucket;
  
  // Exposed when asyncJobs is true (always set, even with existing bucket)
  public readonly destinationBucketInterface?: s3.IBucket;
  
  // Exposed when asyncJobs is true and construct creates the topic
  public readonly snsNotificationTopic?: sns.Topic;
  
  // Exposed when asyncJobs is true and customer-managed key is used
  public readonly notificationTopicEncryptionKey?: kms.IKey;
  
  constructor(scope: Construct, id: string, props: LambdaToPollyProps);
}
```

### Core Helper Functions Used

**Validation:**
- `defaults.CheckLambdaProps(props)` - Validates Lambda prop combinations
- `defaults.CheckVpcProps(props)` - Validates VPC prop combinations
- `defaults.CheckPollyProps(props)` - Validates Polly-specific prop combinations (custom validation for asyncJobs)

**Resource Creation:**
- `defaults.buildLambdaFunction()` - Creates or uses existing Lambda function
- `defaults.ConfigurePollySupport()` - Configures S3 bucket, SNS topic, and IAM permissions for Polly
- `defaults.buildVpc()` - Creates or uses existing VPC

**VPC Configuration:**
- `defaults.AddAwsServiceEndpoint()` - Adds Polly Interface Endpoint and S3 Gateway Endpoint when VPC is used

### ConfigurePollySupport Helper Function

The `ConfigurePollySupport()` function in `core/lib/polly-helper.ts` encapsulates all Polly-specific configuration logic:

**Input:** Construct scope, id, and LambdaToPollyProps

**Output:** PollyConfiguration object containing:
```typescript
interface PollyConfiguration {
  // S3 bucket configuration (only if asyncJobs: true)
  destinationBucket?: {
    bucket?: s3.Bucket;
    loggingBucket?: s3.Bucket;
    bucketInterface: s3.IBucket;
  };
  
  // SNS topic configuration (only if asyncJobs: true)
  snsNotificationTopic?: sns.Topic;
  notificationTopicEncryptionKey?: kms.IKey;
  
  // IAM actions required for Lambda
  lambdaIamActionsRequired: string[];  // ['polly:SynthesizeSpeech'] or includes async APIs
  
  // Environment variables to set on Lambda
  environmentVariables: EnvironmentVariableDefinition[];
}

interface EnvironmentVariableDefinition {
  readonly defaultName: string;
  readonly clientNameOverride?: string;
  readonly value: string;
}
```

**Behavior:**
- When `asyncJobs` is false/undefined: Returns only sync Polly permissions
- When `asyncJobs` is true: Creates/uses bucket and topic, returns async permissions and environment variables
- Validates that bucket/topic props are only provided when `asyncJobs` is true
- Validates conflicting prop combinations (existing vs new resources)

## Data Models

### Environment Variable Structure

When `asyncJobs: true`, the Lambda function receives:

```typescript
interface EnvironmentVariables {
  [bucketEnvironmentVariableName || "OUTPUT_BUCKET_NAME"]: string;  // Bucket name
  [topicEnvironmentVariableName || "SNS_TOPIC_ARN"]: string;        // Topic ARN
}
```

### IAM Policy Structure

**Synchronous Mode (asyncJobs: false or undefined):**

```typescript
{
  Effect: "Allow",
  Action: ["polly:SynthesizeSpeech"],
  Resource: "*"
}
```

**Asynchronous Mode (asyncJobs: true):**

```typescript
// Polly permissions
{
  Effect: "Allow",
  Action: [
    "polly:SynthesizeSpeech",
    "polly:StartSpeechSynthesisTask",
    "polly:GetSpeechSynthesisTask",
    "polly:ListSpeechSynthesisTasks"
  ],
  Resource: "*"
}

// S3 permissions (granted via bucket.grantReadWrite())
{
  Effect: "Allow",
  Action: [
    "s3:GetObject*",
    "s3:GetBucket*",
    "s3:List*",
    "s3:PutObject*",
    "s3:Abort*"
  ],
  Resource: [
    "arn:aws:s3:::bucket-name",
    "arn:aws:s3:::bucket-name/*"
  ]
}

// SNS permissions (granted via topic.grantPublish())
{
  Effect: "Allow",
  Action: ["sns:Publish"],
  Resource: "arn:aws:sns:region:account:topic-name"
}
```

## Implementation Details

### Constructor Flow

1. **Set CDK Context**
   ```typescript
   this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);
   ```

2. **Validate Props**
   ```typescript
   defaults.CheckLambdaProps(props);
   defaults.CheckVpcProps(props);
   defaults.CheckPollyProps(props);  // Validates asyncJobs-related props
   ```

3. **Configure VPC (if requested)**
   ```typescript
   if (props.deployVpc || props.existingVpc) {
     this.vpc = defaults.buildVpc(scope, {
       defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
       existingVpc: props.existingVpc,
       userVpcProps: props.vpcProps,
       constructVpcProps: {
         enableDnsHostnames: true,
         enableDnsSupport: true,
       },
     });
     
     // Add Polly interface endpoint for Lambda to call Polly
     defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.POLLY);
   }
   ```

4. **Configure Polly Support (if asyncJobs: true)**
   ```typescript
   const pollyConfiguration = defaults.ConfigurePollySupport(this, id, props);
   
   // Extract configured resources
   if (pollyConfiguration.destinationBucket) {
     this.destinationBucket = pollyConfiguration.destinationBucket.bucket;
     this.loggingBucket = pollyConfiguration.destinationBucket.loggingBucket;
     this.destinationBucketInterface = pollyConfiguration.destinationBucket.bucketInterface;
   }
   
   this.snsNotificationTopic = pollyConfiguration.snsNotificationTopic;
   this.notificationTopicEncryptionKey = pollyConfiguration.notificationTopicEncryptionKey;
   
   // Get environment variables to set on Lambda
   const lambdaEnvironmentVariables = pollyConfiguration.environmentVariables;
   ```

5. **Create Lambda Function**
   ```typescript
   this.lambdaFunction = defaults.buildLambdaFunction(this, {
     existingLambdaObj: props.existingLambdaObj,
     lambdaFunctionProps: props.lambdaFunctionProps,
     vpc: this.vpc,
   });
   ```

6. **Grant IAM Permissions**
   ```typescript
   // Add Polly permissions (sync and async based on configuration)
   pollyConfiguration.lambdaIamActionsRequired.forEach((action: string) => {
     this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
       effect: iam.Effect.ALLOW,
       actions: [action],
       resources: ['*']
     }));
   });
   
   // Grant S3 and SNS permissions if asyncJobs
   if (pollyConfiguration.destinationBucket) {
     pollyConfiguration.destinationBucket.bucketInterface.grantReadWrite(this.lambdaFunction);
   }
   
   if (pollyConfiguration.snsNotificationTopic) {
     pollyConfiguration.snsNotificationTopic.grantPublish(this.lambdaFunction);
   }
   ```

7. **Set Environment Variables**
   ```typescript
   lambdaEnvironmentVariables.forEach(variable => {
     const varName = variable.clientNameOverride || variable.defaultName;
     this.lambdaFunction.addEnvironment(varName, variable.value);
   });
   ```

8. **Add VPC Endpoints (if VPC)**
   ```typescript
   if (this.vpc) {
     // S3 Gateway Endpoint (only if asyncJobs)
     if (props.asyncJobs) {
       defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.S3);
     }
   }
   ```

### Default Configurations

**Lambda Function Defaults:**
- Runtime: As specified by client (required in lambdaFunctionProps)
- Timeout: 30 seconds (override of CDK default to accommodate Polly API calls)
- Memory: 128 MB (CDK default)
- Environment variables: Set automatically for bucket and topic when asyncJobs is true

**S3 Bucket Defaults (asyncJobs: true):**
- Encryption: AWS-managed (S3-managed keys)
- Versioning: Enabled
- Access logging: Enabled (unless `logS3AccessLogs: false`)
- Block public access: All settings enabled
- Auto-delete objects: Disabled (production-safe)

**SNS Topic Defaults (asyncJobs: true):**
- Encryption: AWS-managed (unless customer-managed key specified)
- Display name: Generated by CDK

**VPC Defaults (when deployVpc: true):**
- Type: Isolated VPC (no NAT gateways)
- CIDR: 10.0.0.0/16
- Subnets: Isolated subnets only
- DNS hostnames: Enabled
- DNS support: Enabled
- S3 Gateway Endpoint: Created automatically when asyncJobs is true


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Lambda Function Props Application

*For any* valid Lambda function properties provided via `lambdaFunctionProps`, the synthesized CloudFormation template should contain a Lambda function resource with those properties applied.

**Validates: Requirements 1.1**

### Property 2: Custom Bucket Props Application

*For any* valid S3 bucket properties provided via `bucketProps` when `asyncJobs` is true, the synthesized CloudFormation template should contain an S3 bucket resource with those properties applied.

**Validates: Requirements 3.1**

### Property 3: Custom Topic Props Application

*For any* valid SNS topic properties provided via `topicProps` when `asyncJobs` is true, the synthesized CloudFormation template should contain an SNS topic resource with those properties applied.

**Validates: Requirements 4.1**

### Property 4: Custom Environment Variable Names

*For any* valid environment variable name provided via `bucketEnvironmentVariableName` when `asyncJobs` is true, the Lambda function should have an environment variable with that name set to the bucket name.

**Validates: Requirements 9.1**

### Property 5: Custom Topic Environment Variable Names

*For any* valid environment variable name provided via `topicEnvironmentVariableName` when `asyncJobs` is true, the Lambda function should have an environment variable with that name set to the topic ARN.

**Validates: Requirements 9.3**

### Property 6: Custom VPC Props Application

*For any* valid VPC properties provided via `vpcProps` when `deployVpc` is true, the synthesized CloudFormation template should contain a VPC with those properties applied.

**Validates: Requirements 10.3**

### Property 7: Custom Logging Bucket Props Application

*For any* valid S3 bucket properties provided via `loggingBucketProps` when `asyncJobs` is true and `logS3AccessLogs` is true, the synthesized CloudFormation template should contain a logging bucket with those properties applied.

**Validates: Requirements 11.3**

### Property 8: Custom Encryption Key Props Application

*For any* valid KMS key properties provided via `topicEncryptionKeyProps` when `asyncJobs` is true, the synthesized CloudFormation template should contain a KMS key with those properties applied for topic encryption.

**Validates: Requirements 12.3**

## Error Handling

### Validation Errors

The construct performs validation during instantiation and throws errors for invalid configurations:

1. **Conflicting Lambda Props**
   - Error: "Cannot provide both existingLambdaObj and lambdaFunctionProps"
   - Thrown when: Both `existingLambdaObj` and `lambdaFunctionProps` are provided
   - Handled by: `defaults.CheckLambdaProps()`

2. **Conflicting VPC Props**
   - Error: "Cannot provide both deployVpc and existingVpc"
   - Thrown when: Both `deployVpc` and `existingVpc` are provided
   - Handled by: `defaults.CheckVpcProps()`

3. **Conflicting Bucket Props**
   - Error: "Cannot provide both existingBucketObj and bucketProps"
   - Thrown when: `asyncJobs` is true and both bucket props are provided
   - Handled by: Custom validation function

4. **Conflicting Topic Props**
   - Error: "Cannot provide both existingTopicObj and topicProps"
   - Thrown when: `asyncJobs` is true and both topic props are provided
   - Handled by: Custom validation function

5. **Bucket Props Without AsyncJobs**
   - Error: "Bucket-related props can only be provided when asyncJobs is true"
   - Thrown when: Any bucket-related prop is provided but `asyncJobs` is false or undefined
   - Handled by: Custom validation function

6. **Topic Props Without AsyncJobs**
   - Error: "Topic-related props can only be provided when asyncJobs is true"
   - Thrown when: Any topic-related prop is provided but `asyncJobs` is false or undefined
   - Handled by: Custom validation function

### Runtime Errors

The construct does not handle runtime errors from AWS services. Lambda function code must handle:

- Polly API errors (throttling, invalid parameters, service errors)
- S3 access errors (permissions, bucket not found)
- SNS publish errors (permissions, topic not found)

### CDK Synthesis Errors

Standard CDK validation applies:
- Invalid IAM policy statements
- Invalid resource configurations
- Circular dependencies
- Resource limit violations

## Testing Strategy

### Dual Testing Approach

The construct requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests:**
- Verify specific examples and edge cases
- Test integration points between components
- Validate error conditions and validation logic
- Check CloudFormation template structure

**Property Tests:**
- Verify universal properties across all inputs
- Test with randomized valid configurations
- Ensure properties hold for 100+ iterations
- Validate that custom props are correctly applied

### Unit Testing Focus

Unit tests should cover:

1. **Default Behavior**
   - Synchronous mode creates only Lambda with sync permissions
   - Asynchronous mode creates Lambda, S3 bucket, and SNS topic
   - Default environment variable names are set correctly
   - Default encryption and logging configurations

2. **Resource Configuration**
   - Existing Lambda function is used when provided
   - Existing bucket is used when provided (async mode)
   - Existing topic is used when provided (async mode)
   - Custom environment variable names are applied

3. **IAM Permissions**
   - Sync mode grants only `polly:SynthesizeSpeech`
   - Async mode grants sync + async Polly APIs
   - Async mode grants S3 read/write permissions
   - Async mode grants SNS publish permissions
   - No `iam:PassRole` permission is granted

4. **VPC Configuration**
   - VPC is created when `deployVpc: true`
   - Existing VPC is used when provided
   - S3 Gateway Endpoint is created when VPC + asyncJobs
   - Lambda is deployed in VPC when VPC is configured

5. **Encryption Configuration**
   - Default AWS-managed encryption for topic
   - Customer-managed key when specified
   - Custom key props are applied

6. **Logging Configuration**
   - Access logging enabled by default (async mode)
   - Access logging can be disabled
   - Logging bucket is created with defaults
   - Custom logging bucket props are applied

7. **Validation**
   - Error thrown for conflicting Lambda props
   - Error thrown for conflicting bucket props (async mode)
   - Error thrown for conflicting topic props (async mode)
   - Error thrown for conflicting VPC props
   - Error thrown for bucket props without asyncJobs
   - Error thrown for topic props without asyncJobs

8. **Public Properties**
   - Lambda function is exposed
   - Bucket is exposed when created (async mode)
   - Bucket interface is exposed (async mode)
   - Logging bucket is exposed when created (async mode)
   - Topic is exposed (async mode)
   - Encryption key is exposed when customer-managed (async mode)
   - VPC is exposed when configured

### Property-Based Testing Configuration

Each property test must:
- Run minimum 100 iterations
- Use a property-based testing library (e.g., fast-check for TypeScript)
- Reference the design document property in a comment
- Tag format: `// Feature: aws-lambda-polly, Property {number}: {property_text}`

Example property test structure:

```typescript
import * as fc from 'fast-check';

// Feature: aws-lambda-polly, Property 1: Lambda Function Props Application
test('Lambda function props are applied correctly', () => {
  fc.assert(
    fc.property(
      fc.record({
        runtime: fc.constantFrom(lambda.Runtime.NODEJS_18_X, lambda.Runtime.PYTHON_3_11),
        timeout: fc.integer({ min: 3, max: 900 }),
        memorySize: fc.integer({ min: 128, max: 10240 })
      }),
      (lambdaProps) => {
        const stack = new Stack();
        new LambdaToPolly(stack, 'test', {
          lambdaFunctionProps: {
            code: lambda.Code.fromInline('exports.handler = async () => {}'),
            handler: 'index.handler',
            ...lambdaProps
          }
        });
        
        const template = Template.fromStack(stack);
        template.hasResourceProperties('AWS::Lambda::Function', {
          Runtime: lambdaProps.runtime.name,
          Timeout: lambdaProps.timeout,
          MemorySize: lambdaProps.memorySize
        });
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests should:
- Deploy the construct to an AWS account
- Verify resources are created correctly
- Test both synchronous and asynchronous modes
- Test with VPC deployment
- Capture CloudFormation template snapshots
- Use `integ-runner` for snapshot management

Integration test scenarios:
1. Default synchronous mode
2. Asynchronous mode with default settings
3. Asynchronous mode with existing bucket and topic
4. VPC deployment with asyncJobs enabled
5. VPC deployment with asyncJobs disabled (synchronous mode)
6. Custom encryption configuration
7. Custom logging configuration

### Test Coverage Requirements

- Unit test coverage: 95% or greater of lines of code
- All acceptance criteria must be covered by tests
- All correctness properties must have property-based tests
- All validation errors must be tested
- All public properties must be verified in tests
