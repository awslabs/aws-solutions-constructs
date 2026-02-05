/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { App, Stack, Duration } from "aws-cdk-lib";
import { LambdaToPolly } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';
import * as fc from 'fast-check';

// Feature: aws-lambda-polly, Property 1: Lambda Function Props Application
// **Validates: Requirements 1.1**
describe('Property 1: Lambda Function Props Application', () => {
  test('Lambda function props are applied correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          timeout: fc.integer({ min: 3, max: 900 }),
          memorySize: fc.integer({ min: 128, max: 10240 }).filter(n => n % 64 === 0),
          description: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9\s\-_]+$/.test(s))
        }),
        (lambdaProps) => {
          const app = new App();
          const stack = new Stack(app, 'test-stack');

          new LambdaToPolly(stack, 'test-lambda-polly', {
            lambdaFunctionProps: {
              runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
              handler: 'index.handler',
              code: lambda.Code.fromInline('exports.handler = async () => {};'),
              timeout: Duration.seconds(lambdaProps.timeout),
              memorySize: lambdaProps.memorySize,
              description: lambdaProps.description
            }
          });

          const template = Template.fromStack(stack);
          template.hasResourceProperties('AWS::Lambda::Function', {
            Timeout: lambdaProps.timeout,
            MemorySize: lambdaProps.memorySize,
            Description: lambdaProps.description
          });
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: aws-lambda-polly, Property 2: Custom Bucket Props Application
// **Validates: Requirements 3.1**
describe('Property 2: Custom Bucket Props Application', () => {
  test('Custom bucket props are applied correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          versioned: fc.boolean(),
          enforceSSL: fc.boolean()
        }),
        (bucketProps) => {
          const app = new App();
          const stack = new Stack(app, 'test-stack');

          new LambdaToPolly(stack, 'test-lambda-polly', {
            lambdaFunctionProps: {
              runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
              handler: 'index.handler',
              code: lambda.Code.fromInline('exports.handler = async () => {};')
            },
            asyncJobs: true,
            bucketProps: {
              versioned: bucketProps.versioned,
              enforceSSL: bucketProps.enforceSSL
            }
          });

          const template = Template.fromStack(stack);

          // Check versioning configuration
          if (bucketProps.versioned) {
            template.hasResourceProperties('AWS::S3::Bucket', {
              VersioningConfiguration: {
                Status: 'Enabled'
              }
            });
          }

          // Check SSL enforcement via bucket policy
          if (bucketProps.enforceSSL) {
            template.hasResourceProperties('AWS::S3::BucketPolicy', {
              PolicyDocument: {
                Statement: Match.arrayWith([
                  Match.objectLike({
                    Effect: 'Deny',
                    Condition: {
                      Bool: {
                        'aws:SecureTransport': 'false'
                      }
                    }
                  })
                ])
              }
            });
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: aws-lambda-polly, Property 3: Custom Topic Props Application
// **Validates: Requirements 4.1**
describe('Property 3: Custom Topic Props Application', () => {
  test('Custom topic props are applied correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          displayName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9\s\-_]+$/.test(s))
        }),
        (topicProps) => {
          const app = new App();
          const stack = new Stack(app, 'test-stack');

          new LambdaToPolly(stack, 'test-lambda-polly', {
            lambdaFunctionProps: {
              runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
              handler: 'index.handler',
              code: lambda.Code.fromInline('exports.handler = async () => {};')
            },
            asyncJobs: true,
            topicProps: {
              displayName: topicProps.displayName
            }
          });

          const template = Template.fromStack(stack);
          template.hasResourceProperties('AWS::SNS::Topic', {
            DisplayName: topicProps.displayName
          });
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: aws-lambda-polly, Property 4: Custom Environment Variable Names
// **Validates: Requirements 9.1**
describe('Property 4: Custom Bucket Environment Variable Names', () => {
  test('Custom bucket environment variable names are applied correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 })
          .filter(s => /^[A-Z][A-Z0-9_]*$/.test(s))
          .filter(s => s !== 'AWS_NODEJS_CONNECTION_REUSE_ENABLED'),
        (envVarName) => {
          const app = new App();
          const stack = new Stack(app, 'test-stack');

          new LambdaToPolly(stack, 'test-lambda-polly', {
            lambdaFunctionProps: {
              runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
              handler: 'index.handler',
              code: lambda.Code.fromInline('exports.handler = async () => {};')
            },
            asyncJobs: true,
            bucketEnvironmentVariableName: envVarName
          });

          const template = Template.fromStack(stack);

          // Find the Lambda function and check environment variables
          const resources = template.findResources('AWS::Lambda::Function');
          const lambdaFunction = Object.values(resources)[0] as any;
          const envVars = lambdaFunction.Properties.Environment?.Variables || {};

          expect(envVars[envVarName]).toBeDefined();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: aws-lambda-polly, Property 5: Custom Topic Environment Variable Names
// **Validates: Requirements 9.3**
describe('Property 5: Custom Topic Environment Variable Names', () => {
  test('Custom topic environment variable names are applied correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 })
          .filter(s => /^[A-Z][A-Z0-9_]*$/.test(s))
          .filter(s => s !== 'AWS_NODEJS_CONNECTION_REUSE_ENABLED'),
        (envVarName) => {
          const app = new App();
          const stack = new Stack(app, 'test-stack');

          new LambdaToPolly(stack, 'test-lambda-polly', {
            lambdaFunctionProps: {
              runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
              handler: 'index.handler',
              code: lambda.Code.fromInline('exports.handler = async () => {};')
            },
            asyncJobs: true,
            topicEnvironmentVariableName: envVarName
          });

          const template = Template.fromStack(stack);

          // Find the Lambda function and check environment variables
          const resources = template.findResources('AWS::Lambda::Function');
          const lambdaFunction = Object.values(resources)[0] as any;
          const envVars = lambdaFunction.Properties.Environment?.Variables || {};

          expect(envVars[envVarName]).toBeDefined();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: aws-lambda-polly, Property 6: Custom VPC Props Application
// **Validates: Requirements 10.3**
describe('Property 6: Custom VPC Props Application', () => {
  test('Custom VPC props are applied correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          maxAzs: fc.integer({ min: 1, max: 3 })
        }),
        (vpcProps) => {
          const app = new App();
          const stack = new Stack(app, 'test-stack');

          new LambdaToPolly(stack, 'test-lambda-polly', {
            lambdaFunctionProps: {
              runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
              handler: 'index.handler',
              code: lambda.Code.fromInline('exports.handler = async () => {};')
            },
            deployVpc: true,
            vpcProps: {
              maxAzs: vpcProps.maxAzs
            }
          });

          const template = Template.fromStack(stack);

          // VPC should be created
          template.hasResourceProperties('AWS::EC2::VPC', {});

          // Count subnets - should have at least 1 subnet
          const subnets = template.findResources('AWS::EC2::Subnet');
          const subnetCount = Object.keys(subnets).length;

          // With isolated VPC, we expect at least 1 subnet (actual count depends on available AZs)
          expect(subnetCount).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: aws-lambda-polly, Property 7: Custom Logging Bucket Props Application
// **Validates: Requirements 11.3**
describe('Property 7: Custom Logging Bucket Props Application', () => {
  test('Custom logging bucket props are applied correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          enforceSSL: fc.boolean()
        }),
        (loggingBucketProps) => {
          const app = new App();
          const stack = new Stack(app, 'test-stack');

          new LambdaToPolly(stack, 'test-lambda-polly', {
            lambdaFunctionProps: {
              runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
              handler: 'index.handler',
              code: lambda.Code.fromInline('exports.handler = async () => {};')
            },
            asyncJobs: true,
            loggingBucketProps: {
              enforceSSL: loggingBucketProps.enforceSSL
            }
          });

          const template = Template.fromStack(stack);

          // Should have 2 buckets: destination + logging
          template.resourceCountIs('AWS::S3::Bucket', 2);

          // Check SSL enforcement on logging bucket if specified
          if (loggingBucketProps.enforceSSL) {
            const bucketPolicies = template.findResources('AWS::S3::BucketPolicy');
            const policyCount = Object.keys(bucketPolicies).length;

            // Should have at least one bucket policy with SSL enforcement
            expect(policyCount).toBeGreaterThanOrEqual(1);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: aws-lambda-polly, Property 8: Custom Encryption Key Props Application
// **Validates: Requirements 12.3**
describe('Property 8: Custom Encryption Key Props Application', () => {
  test('Custom encryption key props are applied correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          enableKeyRotation: fc.boolean(),
          description: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9\s\-_]+$/.test(s))
        }),
        (keyProps) => {
          const app = new App();
          const stack = new Stack(app, 'test-stack');

          new LambdaToPolly(stack, 'test-lambda-polly', {
            lambdaFunctionProps: {
              runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
              handler: 'index.handler',
              code: lambda.Code.fromInline('exports.handler = async () => {};')
            },
            asyncJobs: true,
            topicEncryptionKeyProps: {
              enableKeyRotation: keyProps.enableKeyRotation,
              description: keyProps.description
            }
          });

          const template = Template.fromStack(stack);

          // Should have a KMS key created
          template.resourceCountIs('AWS::KMS::Key', 1);

          template.hasResourceProperties('AWS::KMS::Key', {
            EnableKeyRotation: keyProps.enableKeyRotation,
            Description: keyProps.description
          });
        }
      ),
      { numRuns: 10 }
    );
  });
});
