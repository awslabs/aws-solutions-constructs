# AWS Solutions Constructs - Technical Implementation Guide

## Technology Stack

### Core Dependencies

- **AWS CDK** - Cloud Development Kit (aws-cdk-lib)
- **TypeScript** - Primary implementation language
- **JSII** - JavaScript Interoperability Interface for multi-language support
- **Jest** - Testing framework
- **ESLint** - Code linting and style enforcement

### Multi-Language Support

Constructs are published to multiple package managers via JSII:
- **TypeScript/JavaScript** - NPM (`@aws-solutions-constructs/*`)
- **Python** - PyPI (`aws-solutions-constructs.*`)
- **Java** - Maven (`software.amazon.awsconstructs.services.*`)
- **.NET** - NuGet (`Amazon.SolutionsConstructs.AWS.*`)

## Code Quality Standards

### ESLint Configuration

All code must comply with `eslintrc.config.mjs` rules:

**Key rules:**
- **Naming conventions:**
  - Classes: PascalCase
  - Variables/parameters: camelCase or UPPER_CASE
  - No leading/trailing underscores
  
- **TypeScript:**
  - No `require()` - use ES6 imports
  - No `var` - use `const` or `let`
  - Prefer arrow functions
  - Consistent type assertions
  
- **Code style:**
  - Max line length: 150 characters
  - Semicolons required
  - No console.log statements
  - No trailing spaces
  - Prefer `const` over `let`
  - No consecutive blank lines
  
- **License header:**
  - All files must include Apache 2.0 license header found in source/patterns/@aws-solutions-constructs/licence-header.js

### TypeScript Configuration

**Compiler options:**
- Target: ES2018
- Module: CommonJS
- Strict mode enabled
- Declaration files generated

## Build System

### NPM Scripts

Standard scripts in each construct's `package.json`:

```json
{
  "scripts": {
    "build": "tsc -b .",
    "lint": "eslint --config ../eslintrc.config.mjs --no-warn-ignored .",
    "lint-fix": "eslint --config ../eslintrc.config.mjs --ext=.js,.ts --fix .",
    "test": "jest --coverage",
    "clean": "tsc -b --clean",
    "watch": "tsc -b -w",
    "integ": "integ-runner --update-on-failed",
    "integ-assert": "integ-runner",
    "jsii": "jsii",
    "jsii-pacmak": "jsii-pacmak",
    "build+lint+test": "npm run jsii && npm run lint && npm test && npm run integ-assert"
  }
}
```

### JSII Configuration

Multi-language packaging configuration:

```json
{
  "jsii": {
    "outdir": "dist",
    "targets": {
      "java": {
        "package": "software.amazon.awsconstructs.services.{construct}",
        "maven": {
          "groupId": "software.amazon.awsconstructs",
          "artifactId": "{construct}"
        }
      },
      "dotnet": {
        "namespace": "Amazon.SolutionsConstructs.AWS.{Construct}",
        "packageId": "Amazon.SolutionsConstructs.AWS.{Construct}"
      },
      "python": {
        "distName": "aws-solutions-constructs.aws-{construct}",
        "module": "aws_solutions_constructs.aws_{construct}"
      }
    }
  }
}
```

## Implementation Patterns

### Resource Creation Pattern

Constructs delegate resource creation to core helpers:

```typescript
import * as defaults from '@aws-solutions-constructs/core';

// Validate props
defaults.CheckLambdaProps(props);
defaults.CheckDynamoDBProps(props);

// Create resources using helpers
this.lambdaFunction = defaults.buildLambdaFunction(this, {
  existingLambdaObj: props.existingLambdaObj,
  lambdaFunctionProps: props.lambdaFunctionProps
});

this.dynamoTable = defaults.buildDynamoDBTable(this, {
  existingTableObj: props.existingTableObj,
  dynamoTableProps: props.dynamoTableProps
});
```

### IAM Permission Pattern

Grant least-privilege permissions between resources:

```typescript
// Grant Lambda permissions to DynamoDB
const tablePermissions = props.tablePermissions || 'ReadWrite';

if (tablePermissions === 'All') {
  this.dynamoTable.grantFullAccess(this.lambdaFunction);
} else if (tablePermissions === 'Read') {
  this.dynamoTable.grantReadData(this.lambdaFunction);
} else if (tablePermissions === 'Write') {
  this.dynamoTable.grantWriteData(this.lambdaFunction);
} else {
  this.dynamoTable.grantReadWriteData(this.lambdaFunction);
}
```

### Environment Variable Pattern

Pass resource identifiers to compute resources:

```typescript
const envVarName = props.tableEnvironmentVariableName || 'DDB_TABLE_NAME';

this.lambdaFunction.addEnvironment(envVarName, this.dynamoTable.tableName);
```

### VPC Configuration Pattern

Optional VPC deployment for compute resources:

```typescript
import * as ec2 from 'aws-cdk-lib/aws-ec2';

// Validate VPC props
defaults.CheckVpcProps(props);

// Create or use existing VPC
if (props.deployVpc || props.existingVpc) {
  this.vpc = defaults.buildVpc(scope, {
    existingVpc: props.existingVpc,
    defaultVpcProps: defaults.DefaultVpcProps(),
    userVpcProps: props.vpcProps,
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true
    }
  });
  
  // Add VPC endpoints
  defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.DYNAMODB);
}
```

## Core Module Architecture

### Helper Function Naming

- `build{Service}()` - Create and configure a resource
- `Check{Service}Props()` - Validate prop combinations
- `add{Service}Permissions()` - Grant IAM permissions
- `Default{Service}Props()` - Return default properties

### Validation Functions

Core provides validation to prevent conflicting props:

```typescript
// Prevents both existingLambdaObj and lambdaFunctionProps
defaults.CheckLambdaProps(props);

// Prevents both existingVpc and deployVpc
defaults.CheckVpcProps(props);

// Validates list values
defaults.CheckListValues(
  ['All', 'Read', 'ReadWrite', 'Write'], 
  [props.tablePermissions], 
  'table permission'
);
```

## Development Workflow

### Adding a New Construct

1. **Create directory structure:**
   ```bash
   mkdir aws-{service1}-{service2}
   cd aws-{service1}-{service2}
   mkdir lib test
   ```

2. **Implement lib/index.ts:**
   - Add license header
   - Define props interface
   - Implement construct class
   - Use core helpers

3. **Add tests:**
   - Unit tests in `test/{construct}.test.ts`
   - Integration tests in `test/integ.*.ts`

4. **Configure package.json:**
   - Set name, description
   - Configure JSII targets
   - Add dependencies

5. **Run build pipeline:**
   ```bash
   npm run build+lint+test
   ```

### Linting Workflow

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint-fix
```

## Common Patterns

### Conditional Resource Creation

```typescript
let bucket: s3.Bucket;

if (props.existingBucketObj) {
  bucket = props.existingBucketObj;
} else {
  bucket = defaults.buildS3Bucket(this, {
    bucketProps: props.bucketProps
  }).bucket;
}
```

### Event Source Mapping

```typescript
// Lambda triggered by DynamoDB Stream
this.lambdaFunction.addEventSource(
  new DynamoEventSource(this.dynamoTable, {
    startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    batchSize: 1
  })
);
```

### CloudWatch Logs Configuration

```typescript
const logGroup = defaults.buildLogGroup(this, 'LogGroup', {
  logGroupProps: props.logGroupProps
});
```
