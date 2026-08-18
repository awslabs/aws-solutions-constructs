# AWS Solutions Constructs - Repository Structure

## Top-Level Organization

```
source/patterns/@aws-solutions-constructs/
├── core/                          # Shared helper functions and defaults
├── resources/                     # Shared resource utilities (CDK custom resources, etc.)
├── aws-constructs-factories/      # Factory functions for single resources
├── aws-{service1}-{service2}/     # Individual construct patterns
├── eslintrc.config.mjs            # Shared ESLint configuration
├── tslint.yaml                    # Shared TSLint configuration
├── integ.config.json              # Integration test configuration
└── license-header.js              # License header template
```

## Construct Pattern Directory Structure

Each construct follows this standard structure:

```
aws-{service1}-{service2}/
├── lib/
│   └── index.ts                   # Main construct implementation
├── test/
│   ├── integ.*.test.ts           # Integration test files
│   ├── integ.*.js.snapshot/      # Integration test snapshots
│   ├── test.*.test.ts            # Unit test files
│   └── {service}/                # Test fixtures (Lambda code, etc.)
├── README.adoc                    # Full documentation
├── README.md                      # Brief description
├── package.json                   # NPM package definition
├── integ.config.json              # Integration test config
├── .npmignore                     # NPM ignore patterns
├── .gitignore                     # Git ignore patterns
└── {construct-name}.png          # Architecture diagram
```

## Core Module Structure

The `core/` directory contains shared functionality:

```
core/
├── lib/
│   ├── {service}-helper.ts       # Resource creation and configuration
│   ├── {service}-defaults.ts     # Default property values
│   ├── utils.ts                  # Utility functions
│   ├── vpc-helper.ts             # VPC creation and configuration
│   ├── security-group-helper.ts  # Security group utilities
│   └── override-warning-service.ts # Property override warnings
├── test/                          # Core functionality tests
├── index.ts                       # Public API exports
├── package.json                   # Core package definition
└── README.md                      # Core module documentation
```

### Core Helper File Patterns

**Helper files** (`*-helper.ts`):
- `build{Service}()` - Create resource with defaults, sometimes 1 function for all deployments, sometimes multiple functions for different scenarios (example - cloudfront-helper.ts)
- `add{Service}Permissions()` - Grant IAM permissions
- Service-specific configuration functions

**Default files** (`*-defaults.ts`):
- `Default{Service}Props()` - Return default properties
- Well-architected configuration values
- Security best practices

## Construct Implementation File (lib/index.ts)

Standard structure for two-service construct:

```typescript
// 1. License header
// 2. Imports
import * as service1 from 'aws-cdk-lib/aws-{service1}';
import * as service2 from 'aws-cdk-lib/aws-{service2}';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from 'constructs';

// 3. Props Interface
export interface {Service1}To{Service2}Props {
  readonly existing{Service1}Obj?: service1.Resource;
  readonly {service1}Props?: service1.ResourceProps;
  readonly existing{Service2}Obj?: service2.Resource;
  readonly {service2}Props?: service2.ResourceProps;
  // VPC props if applicable
  readonly existingVpc?: ec2.IVpc;
  readonly vpcProps?: ec2.VpcProps;
  readonly deployVpc?: boolean;
}

// 4. Construct Class
export class {Service1}To{Service2} extends Construct {
  // Public properties
  public readonly {service1}Resource: service1.Resource;
  public readonly {service2}Resource: service2.Resource;
  public readonly vpc?: ec2.IVpc;

  constructor(scope: Construct, id: string, props: {Service1}To{Service2}Props) {
    super(scope, id);
    // Validation
    // Resource creation
    // Integration configuration
  }
}
```

Standard structure for three-service construct:

```typescript
// 1. License header
// 2. Imports
import * as service1 from 'aws-cdk-lib/aws-{service1}';
import * as service2 from 'aws-cdk-lib/aws-{service2}';
import * as service3 from 'aws-cdk-lib/aws-{service3}';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from 'constructs';

// 3. Props Interface
export interface {Service1}To{Service2}To{Service3}Props {
  readonly existing{Service1}Obj?: service1.Resource;
  readonly {service1}Props?: service1.ResourceProps;
  readonly existing{Service2}Obj?: service2.Resource;
  readonly {service2}Props?: service2.ResourceProps;
  readonly existing{Service3}Obj?: service3.Resource;
  readonly {service3}Props?: service3.ResourceProps;
  // VPC props if applicable
  // Construct specific props if applicable
}

// 4. Construct Class
export class {Service1}To{Service2}To{Service3} extends Construct {
  // Public properties
  public readonly {service1}Resource: service1.Resource;
  public readonly {service2}Resource: service2.Resource;
  public readonly {service3}Resource: service3.Resource;
  public readonly vpc?: ec2.IVpc;

  constructor(scope: Construct, id: string, props: {Service1}To{Service2}To{Service3}Props) {
    super(scope, id);
    // Validation
    // Resource creation
    // Integration configuration
  }
}
```

## Test Structure

### Unit Tests (test.*.test.ts)

```typescript
import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { {ConstructClass} } from '../lib';

describe('Test {ConstructClass}', () => {
  test('Test default properties', () => {
    const stack = new Stack();
    new {ConstructClass}(stack, 'test', {...});
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::{Service}::{Resource}', {...});
  });
});
```

### Integration Tests (integ.*.test.ts)

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { {ConstructClass} } from '../lib';

const app = new App();
const stack = new Stack(app, 'integ-stack');
new {ConstructClass}(stack, 'test', {...});
new IntegTest(app, 'IntegTest', { testCases: [stack] });
```

## Package.json Structure

Each construct package includes:

```json
{
  "name": "@aws-solutions-constructs/aws-{service1}-{service2}",
  "version": "0.0.0",
  "description": "CDK Constructs for {Service1} to {Service2} integration",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "scripts": {
    "build": "tsc -b .",
    "lint": "eslint --config ../eslintrc.config.mjs --no-warn-ignored .",
    "test": "jest --coverage",
    "integ": "integ-runner --update-on-failed",
    "integ-assert": "integ-runner",
    "jsii": "jsii",
    "jsii-pacmak": "jsii-pacmak"
  },
  "jsii": {
    "outdir": "dist",
    "targets": {
      "java": {...},
      "dotnet": {...},
      "python": {...}
    }
  },
  "dependencies": {
    "@aws-solutions-constructs/core": "0.0.0",
    "constructs": "^10.0.0"
  },
  "peerDependencies": {
    "@aws-solutions-constructs/core": "0.0.0",
    "constructs": "^10.0.0",
    "aws-cdk-lib": "^0.0.0"
  }
}
```

## Documentation Structure (README.adoc)

```asciidoc
= aws-{service1}-{service2}

[Stability badge]

== Overview
[Minimal example in TypeScript, Python, Java]

== Pattern Construct Props
[Table of all props with types and descriptions]

== Pattern Properties
[Table of public properties]

== Default Settings
[List of default configurations]

== Architecture
[Diagram and resource list]

== Example Lambda Function Implementation
[For constructs launching a Lambda function, a link to an example in github of code accessing the second resource]

== Additional Examples
[More complex usage examples]
```

## Naming Conventions

### Construct Names
- Pattern: `aws-{service1}-{service2}[-{service3}]`
- Two-service class: `{Service1}To{Service2}` (PascalCase)
- Three-service class: `{Service1}To{Service2}To{Service3}` (PascalCase)
- Props: `{Service1}To{Service2}Props` or `{Service1}To{Service2}To{Service3}Props`

### File Names
- Main implementation: `index.ts`
- Unit tests: `{construct-name}.test.ts`
- Integration tests: `integ.{test-name}.ts`
- Snapshots: `integ.{test-name}.js.snapshot/`

### Property Names
- Existing resource: `existing{Service}Obj`
- Override props: `{service}Props`
- Environment variables: `{RESOURCE}_NAME` (uppercase)
- VPC props: `existingVpc`, `vpcProps`, `deployVpc`

## Build Artifacts

Generated during build (not in source control):

```
aws-{service1}-{service2}/
├── lib/
│   ├── index.js                   # Compiled JavaScript
│   ├── index.d.ts                 # TypeScript definitions
│   └── index.js.map               # Source maps
├── dist/                          # JSII output for other languages
│   ├── java/
│   ├── python/
│   └── dotnet/
├── coverage/                      # Test coverage reports
└── node_modules/                  # Dependencies
```

## Special Directories

### aws-constructs-factories
Exception to the two-service pattern:
```
aws-constructs-factories/
├── lib/
│   ├── s3-bucket-factory.ts
│   ├── state-machine-factory.ts
│   ├── vpc-factory.ts
│   └── sqs-queue-factory.ts
└── test/
```

### resources
Shared resource utilities:
```
resources/
├── lib/
│   ├── custom-resource-helper.ts
│   └── cfn-nag-suppressions.ts
└── test/
```
