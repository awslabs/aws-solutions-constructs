# AWS Solutions Constructs Product Documentation

## Overview

AWS Solutions Constructs is an open-source library of CDK L3 Constructs that implement well-architected, multi-service patterns. Each construct combines two or more AWS services with best-practice configurations, least-privilege IAM permissions, and appropriate service integrations.

## What Makes Solutions Constructs Different

Solutions Constructs are **multi-service patterns** that go beyond single-resource abstractions:

- Each construct deploys **2+ AWS services** configured to work together
- Resources are deployed by helper functions in the `core` folder
- The construct code in `index.ts` focuses on **integration logic**:
  - Least privilege IAM permissions between services
  - Environment variables for compute resources to discover other resources
  - VPC configuration with appropriate endpoints when needed
  - Event source mappings and triggers

## Construct Implementation Pattern

### Props Interface

Each construct exposes a consistent props interface:

**Service-specific props:**
- `existing{Service}Obj?` - Use existing resource instance
- `{service}Props?` - Override default resource properties

For each major service in a construct, customers have three options:
1. **Use defaults** - Omit both props, construct creates resource with best-practice defaults
2. **Override defaults** - Provide some subset `{service}Props` to customize specific properties. Defining the type of this attribute with `| any` allows the client to supply any desired prop without supplying all required all props
3. **Use existing resource** - Provide `existing{Service}Obj` to integrate with pre-existing resource

**Common patterns:**
- VPC props (when applicable): `existingVpc?`, `vpcProps?`, `deployVpc?`
- Environment variable names for compute resources
- Permission configurations (e.g., `tablePermissions`)

**Consistency rule:** When a service appears in multiple constructs, the same prop names and types are used across all constructs. The comments in the interface definition in the typescript file must be the same in each code file and in each README.adoc file.

### Construct Class

**Public properties:**
- References to all deployed resources (e.g., `lambdaFunction`, `dynamoTable`)
- VPC reference if deployed

**Constructor pattern:**
1. Call validation functions from core (e.g., `CheckLambdaProps`, `CheckDynamoDBProps`)
2. Call helper functions to create resources (e.g., `buildLambdaFunction`, `buildDynamoDBTable`)
3. Configure integrations (IAM permissions, environment variables, event sources)
4. Set up VPC and endpoints if required

### Core Helper Functions

Located in `core/lib/`, organized by service:

**Naming patterns:**
- `*-helper.ts` - Functions to build and configure resources
- `*-defaults.ts` - Default property values following best practices. The Default{resource}Props() function may return a fixed set of props, or accept an argument that allows it to tailor the props for a particular scenario.

**Common helpers:**
- `build{Service}()` or `obtain{Service}()` - Create resource with defaults. Obtain is preferred when the existing resource prop is passed into the function, as in that case the function merely returns the exsiting resource (it doesn't actually "build" anything)
- `add{Service}Permissions()` - Grant least-privilege IAM
- `Check{Service}Props()` - Validate prop combinations

## Best Practices Implemented

### Security

1. **Least Privilege IAM** - Constructs grant only necessary permissions between services
2. **Encryption** - Resources use encryption at rest and in transit by default (preferrably encryption managed by AWS)
3. **Logging** - CloudWatch logging enabled where applicable
4. **VPC Isolation** - Optional VPC deployment with appropriate endpoints
5. **Traceability** - XRay is enabled whenever appropriate

### Configuration

1. **Well-Architected Defaults** - All resources use AWS best practices by default
2. **Override Capability** - Clients can override any default via props
3. **Existing Resource Support** - Can integrate with existing resources via `existing*Obj` props

### Integration
Includes, but is not limited to:
1. **Environment Variables** - Compute resources receive env vars for resource discovery
2. **Event Sources** - Automatic configuration of triggers and subscriptions
3. **VPC Endpoints** - Gateway/Interface endpoints created when VPC is used

## VPC Deployment Pattern

Constructs involving compute resources (Lambda, Fargate) support optional VPC deployment:

**When VPC is appropriate:**
- Lambda constructs - optional via `deployVpc` flag
- Fargate constructs - always deployed in VPC
- OpenSearch/Elasticsearch constructs - always require VPC

**VPC configuration:**
- `deployVpc: true` - Construct creates new VPC
- `existingVpc` - Use existing VPC
- `vpcProps` - Override default VPC properties
- Appropriate VPC endpoints created automatically (e.g., DynamoDB Gateway Endpoint)

## Documentation Pattern

### README.adoc Structure

1. **Header** - Stability badge, language packages
2. **Overview** - Pattern description with minimal example
3. **Pattern Construct Props** - Table of all props with types and descriptions
4. **Pattern Properties** - Public properties exposed by construct
5. **Default Settings** - What the construct configures by default
6. **Architecture** - Diagram and resource list
7. **Examples** - Additional usage examples in TypeScript, Python, Java

### Key Documentation Elements

- Links to AWS CDK API documentation for all types
- Code examples in multiple languages
- Clear indication of required vs optional props
- Default values explicitly stated
- Prop and Property descriptions are identical to comments found in the index.ts file

## Special Cases

### aws-constructs-factories

Exception to the two-service rule. Provides factory functions that expose core functionality for creating single, well-architected resources:

- `FactoryS3Bucket()` - Create S3 bucket with best practices
- `FactoryStateMachine()` - Create Step Functions state machine
- `FactoryVpc()` - Create VPC with standard configuration
- `FactorySqsQueue()` - Create SQS queue with DLQ

Allows clients to use Solutions Constructs patterns for individual resources when no multi-service pattern fits their needs.

### Multi-Stack Patterns

Some use cases (e.g., `aws-restaurant-management-demo`) implement complex architectures across multiple stacks, demonstrating how constructs compose for real-world applications.

## Development Workflow

### Adding a New Construct

1. Create directory: `aws-{service1}-{service2}`
2. Create `README.adoc` following existing patterns - ask for review from the Constructs team before building
3. Implement `lib/index.ts`:
   - Props interface
   - Construct class
   - Use core helpers
4. Add tests in `test/`
5. Generate architecture diagram
6. Update package.json with dependencies

### Using Core Functionality

- Import from `@aws-solutions-constructs/core`
- Use existing helpers for common services
- Add new helpers to core if creating reusable functionality
- Follow naming conventions: `build*`, `Check*`, `add*`

### Maintaining Consistency

- Same prop names for same services across constructs
- Consistent validation patterns
- Standard error messages
- Uniform documentation structure

## CDK Version Management

- Solutions Constructs releases are tied to specific CDK versions
- See CHANGELOG.md for version mappings
- Clients can use newer CDK versions than the construct was built against
- Upgrade constructs when new releases are available

## Key Principles

1. **Multi-Service Focus** - Each construct integrates 2+ services
2. **Best Practices by Default** - Well-architected configurations out of the box
3. **Override Everything** - Clients can customize any aspect
4. **Least Privilege** - Minimal IAM permissions granted
5. **Consistent Interface** - Same patterns across all constructs
6. **Comprehensive Testing** - Unit and integration tests for all patterns
7. **Clear Documentation** - Detailed README with examples in multiple languages
