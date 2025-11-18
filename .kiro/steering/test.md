# AWS Solutions Constructs - Testing Guide

## Testing Framework

### Overview

Tests use Jest with CDK-specific extensions to verify constructs:
- **Unit tests** - Verify synthesized CloudFormation templates
- **Integration tests** - Deploy to AWS and capture snapshots

## Unit Testing with Jest (`test.*.test.ts`)
   - Instantiate construct with various prop combinations
   - Use CDK assertions to verify template resources
   - Check IAM policies, environment variables, configurations
   - Test coverage (with meaningful validation) of 95% of LOC or greater is required

## Testing Existing Resources
When writing a test that sends existing resources to a construct, use these methods to create the following types of resources:
* S3 Bucket - use defaults.CreateScrapBucket()
* VPC - use defaults.getTestVpc()
* Step Functions State Machine - use defaults.CreateTestStateMachine()
* Step Functions Definition Bocy - use defaults.CreateTestStateMachineDefinitionBody()
* Elasticache memcached - use defaults.CreateTestCache()
* API Gateway - use defaults.CreateTestApi()


### Basic Test Structure

Tests instantiate constructs and verify the synthesized CloudFormation template:

```typescript
import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { LambdaToDynamoDB } from '../lib';

test('check lambda function properties', () => {
  const stack = new Stack();
  
  new LambdaToDynamoDB(stack, 'test', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: "index.handler",
    Runtime: "nodejs20.x"
  });
});
```

## CDK Assertion Patterns

### Using Match Functions

**Use Match functions for wildcards:**
```typescript
import { Match } from 'aws-cdk-lib/assertions';

// For string patterns with hashes
template.hasResourceProperties('AWS::IAM::Role', {
  RoleName: Match.stringLikeRegexp('MyRole-.*')
});

// For array matching
template.hasResourceProperties('AWS::Lambda::Function', {
  Environment: {
    Variables: Match.objectLike({
      TABLE_NAME: Match.anyValue()
    })
  }
});

// For array contents
template.hasResourceProperties('AWS::IAM::Policy', {
  PolicyDocument: {
    Statement: Match.arrayWith([
      Match.objectLike({
        Effect: 'Allow',
        Action: 's3:GetObject'
      })
    ])
  }
});
```

**Important:** Use `Match.arrayWith()` and `Match.objectLike()` instead of `expect.objectContaining()` - the expect functions don't work in CDK assertion context.

### IAM Policy Testing

When testing IAM policies, verify both the policy statements AND that the policy is attached to the correct principal:

```typescript
// Check the policy has correct statements
template.hasResourceProperties('AWS::IAM::Policy', {
  PolicyDocument: {
    Statement: Match.arrayWith([
      Match.objectLike({
        Effect: 'Allow',
        Action: 'dynamodb:PutItem',
        Resource: { 'Fn::GetAtt': ['MyTable', 'Arn'] }
      })
    ])
  },
  // Verify it's attached to the correct role
  Roles: [{
    Ref: 'MyLambdaFunctionServiceRole'
  }]
});
```

## Integration Testing

### Overview

Integration tests use the CDK `integ-runner` tool to verify constructs work correctly when deployed to AWS. There should be a test that validates default functionality and variations that test major architectural variations (examples - with and without a vpc; with existing resource or newly deployed resource - existing means not created by the construct, it is still created in the test and passed into the construct). There are no code coverage requirements for integration tests.

**Test files:** `test/integ.*.ts`
   - Deploy actual resources to AWS
   - Verify end-to-end functionality
   - Controlled by `integ.config.json`

Each integration test:
1. Defines a full deployment of the construct in a specific scenario
2. Actually deploys the construct to AWS to capture a snapshot
3. Stores the snapshot in `test/integ.*.js.snapshot/` directory
4. On subsequent runs, synthesizes the test and compares output to the snapshot

### Integration Test Structure

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { LambdaToDynamoDB } from '../lib';
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);

new LambdaToDynamoDB(stack, 'test', {
  lambdaFunctionProps: {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'index.handler'
  }
});

new IntegTest(app, 'IntegTest', { 
  testCases: [stack] 
});
```

### Integration Test Workflow

**1. Initial snapshot creation:**
```bash
npm run integ
```
- Deploys construct to AWS
- Captures CloudFormation template as snapshot
- Stores in `test/integ.{test-name}.js.snapshot/`

**2. Verification on code changes:**
```bash
npm run integ-assert
```
- Synthesizes the `integ.*.ts` file
- Compares synthesized template to stored snapshot
- Fails if templates don't match

**3. Update snapshots after intentional changes:**
```bash
npm run integ
```
- Re-deploys and updates snapshots

### Integration Test Commands

- `npm run integ` - Run tests and update snapshots on failure
- `npm run integ-no-clean` - Run without cleaning up resources
- `npm run integ-assert` - Assert against existing snapshots (no deployment)

### Snapshot Structure

```
test/integ.{test-name}.js.snapshot/
├── asset.*/                       # Asset files
├── cdk.out                        # CDK output
├── integ.json                     # Integration test metadata
├── manifest.json                  # Asset manifest
├── tree.json                      # Construct tree
└── {stack-name}.template.json     # CloudFormation template
```

## Testing Workflow

### Running Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Update snapshots
npm test -- -u

# Run integration tests
npm run integ

# Assert integration tests
npm run integ-assert
```

## Debugging Tips

### Template Inspection

```typescript
// Print synthesized template
const template = Template.fromStack(stack);
console.log(JSON.stringify(template.toJSON(), null, 2));
```

### Resource Counting

```typescript
// Count specific resources
template.resourceCountIs('AWS::Lambda::Function', 1);
template.resourceCountIs('AWS::DynamoDB::Table', 1);
```

### Property Debugging

```typescript
// Find all resources of a type
const resources = template.findResources('AWS::IAM::Role');
console.log(JSON.stringify(resources, null, 2));
```
