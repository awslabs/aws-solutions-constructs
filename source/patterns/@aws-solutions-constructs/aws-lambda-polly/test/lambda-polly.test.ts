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

import { App, Stack } from "aws-cdk-lib";
import { LambdaToPolly, LambdaToPollyProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

function deployTestConstructStructure(stack: Stack, props?: any) {
  return new LambdaToPolly(stack, 'test-lambda-polly', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    },
    ...props
  });
}

// Sub-task 8.1: Test default synchronous mode
describe('Test default synchronous mode', () => {
  test('Verify Lambda function created', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack);

    expect(construct.lambdaFunction).toBeDefined();

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING
    });
  });

  test('Verify only sync Polly permissions granted', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    deployTestConstructStructure(stack);

    const template = Template.fromStack(stack);

    // Check that only synchronous Polly permission is granted
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: 'polly:SynthesizeSpeech',
            Resource: '*'
          })
        ])
      }
    });
  });

  test('Verify no bucket or topic created', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack);

    expect(construct.destinationBucket).not.toBeDefined();
    expect(construct.loggingBucket).not.toBeDefined();
    expect(construct.destinationBucketInterface).not.toBeDefined();
    expect(construct.snsNotificationTopic).not.toBeDefined();
    expect(construct.notificationTopicEncryptionKey).not.toBeDefined();

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 0);
    template.resourceCountIs('AWS::SNS::Topic', 0);
  });

  test('Verify no environment variables set', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    deployTestConstructStructure(stack);

    const template = Template.fromStack(stack);

    // Lambda should not have OUTPUT_BUCKET_NAME or SNS_TOPIC_ARN environment variables
    // Note: AWS_NODEJS_CONNECTION_REUSE_ENABLED is set by default by CDK
    const resources = template.findResources('AWS::Lambda::Function');
    const lambdaFunction = Object.values(resources)[0] as any;
    const envVars = lambdaFunction.Properties.Environment?.Variables || {};

    expect(envVars.OUTPUT_BUCKET_NAME).toBeUndefined();
    expect(envVars.SNS_TOPIC_ARN).toBeUndefined();
  });
});

// Sub-task 8.2: Test asynchronous mode with defaults
describe('Test asynchronous mode with defaults', () => {
  test('Verify Lambda function created', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack, { asyncJobs: true });

    expect(construct.lambdaFunction).toBeDefined();

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING
    });
  });

  test('Verify bucket created with encryption, versioning, logging', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack, { asyncJobs: true });

    expect(construct.destinationBucket).toBeDefined();
    expect(construct.loggingBucket).toBeDefined();
    expect(construct.destinationBucketInterface).toBeDefined();

    const template = Template.fromStack(stack);

    // Should have 2 buckets: destination + logging
    template.resourceCountIs('AWS::S3::Bucket', 2);

    // Check destination bucket has encryption
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            }
          }
        ]
      }
    });

    // Check versioning is enabled
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled'
      }
    });

    // Check logging is configured
    template.hasResourceProperties('AWS::S3::Bucket', {
      LoggingConfiguration: Match.objectLike({
        DestinationBucketName: Match.anyValue()
      })
    });
  });

  test('Verify topic created with encryption', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack, { asyncJobs: true });

    expect(construct.snsNotificationTopic).toBeDefined();

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SNS::Topic', 1);

    // Check topic has encryption (AWS-managed by default)
    template.hasResourceProperties('AWS::SNS::Topic', {
      KmsMasterKeyId: {
        "Fn::Join": [
          "",
          [
            "arn:",
            {
              Ref: "AWS::Partition"
            },
            ":kms:",
            {
              Ref: "AWS::Region"
            },
            ":",
            {
              Ref: "AWS::AccountId"
            },
            ":alias/aws/sns"
          ]
        ]
      }
    });
  });

  test('Verify sync and async Polly permissions granted', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    deployTestConstructStructure(stack, { asyncJobs: true });

    const template = Template.fromStack(stack);

    // Check that both sync and async Polly permissions are granted
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: Match.stringLikeRegexp("testlambdapollyLambdaFunctionServiceRoleDefaultPolicy*"),
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: [
              'polly:SynthesizeSpeech',
              'polly:StartSpeechSynthesisTask',
              'polly:GetSpeechSynthesisTask',
              'polly:ListSpeechSynthesisTasks'
            ],
            Resource: '*'
          })
        ])
      }
    });
  });

  test('Verify S3 read/write permissions granted', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    deployTestConstructStructure(stack, { asyncJobs: true });

    const template = Template.fromStack(stack);

    // Check for S3 read/write permissions in a single statement
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: Match.stringLikeRegexp("testlambdapollyLambdaFunctionServiceRoleDefaultPolicy*"),
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: [
              's3:GetObject*',
              's3:GetBucket*',
              's3:List*',
              's3:DeleteObject*',
              's3:PutObject',
              's3:PutObjectLegalHold',
              's3:PutObjectRetention',
              's3:PutObjectTagging',
              's3:PutObjectVersionTagging',
              's3:Abort*'
            ]
          })
        ])
      }
    });
  });

  test('Verify SNS publish permissions granted', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    deployTestConstructStructure(stack, { asyncJobs: true });

    const template = Template.fromStack(stack);

    // Check SNS publish permission is granted
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: Match.stringLikeRegexp("testlambdapollyLambdaFunctionServiceRoleDefaultPolicy*"),
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: 'sns:Publish'
          })
        ])
      }
    });
  });

  test('Verify default environment variables set', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    deployTestConstructStructure(stack, { asyncJobs: true });

    const template = Template.fromStack(stack);

    // Check default environment variable names
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          OUTPUT_BUCKET_NAME: Match.anyValue(),
          SNS_TOPIC_ARN: Match.anyValue()
        })
      }
    });
  });
});

// Sub-task 8.3: Test with existing Lambda function
describe('Test with existing Lambda function', () => {
  test('Verify existing Lambda used', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const existingLambda = new lambda.Function(stack, 'existing-lambda', {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    const construct = new LambdaToPolly(stack, 'test-lambda-polly', {
      existingLambdaObj: existingLambda
    });

    expect(construct.lambdaFunction).toBe(existingLambda);

    const template = Template.fromStack(stack);
    // Should only have 1 Lambda function (the existing one)
    template.resourceCountIs('AWS::Lambda::Function', 1);
  });
});

// Sub-task 8.4: Test with existing bucket and topic (async mode)
describe('Test with existing bucket and topic', () => {
  test('Verify existing bucket used', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const existingBucket = defaults.CreateScrapBucket(stack, 'existing-bucket');

    const construct = deployTestConstructStructure(stack, {
      asyncJobs: true,
      existingBucketObj: existingBucket
    });

    expect(construct.destinationBucket).not.toBeDefined();
    expect(construct.destinationBucketInterface).toBe(existingBucket);

    const template = Template.fromStack(stack);
    // Should have 2 buckets: existing bucket + logging bucket
    template.resourceCountIs('AWS::S3::Bucket', 2);
  });

  test('Verify existing topic used', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const existingTopic = defaults.buildTopic(stack, 'existing-topic', {
      topicProps: {
        topicName: 'pre-existing-polly-topic'
      }
    }).topic;

    const construct = deployTestConstructStructure(stack, {
      asyncJobs: true,
      existingTopicObj: existingTopic
    });

    expect(construct.snsNotificationTopic).toBe(existingTopic);

    const template = Template.fromStack(stack);
    // Should only have 1 topic (the existing one)
    template.resourceCountIs('AWS::SNS::Topic', 1);
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'pre-existing-polly-topic'
    });
  });

  test('Verify bucket interface property set', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const existingBucket = defaults.CreateScrapBucket(stack, 'existing-bucket');

    const construct = deployTestConstructStructure(stack, {
      asyncJobs: true,
      existingBucketObj: existingBucket
    });

    expect(construct.destinationBucketInterface).toBeDefined();
    expect(construct.destinationBucketInterface).toBe(existingBucket);
  });
});

// Sub-task 8.5: Test custom environment variable names
describe('Test custom environment variable names', () => {
  test('Verify custom bucket env var name used', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    deployTestConstructStructure(stack, {
      asyncJobs: true,
      bucketEnvironmentVariableName: 'CUSTOM_BUCKET'
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          CUSTOM_BUCKET: Match.anyValue()
        })
      }
    });
  });

  test('Verify custom topic env var name used', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    deployTestConstructStructure(stack, {
      asyncJobs: true,
      topicEnvironmentVariableName: 'CUSTOM_TOPIC'
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          CUSTOM_TOPIC: Match.anyValue()
        })
      }
    });
  });
});

// Sub-task 8.6: Test VPC deployment
describe('Test VPC deployment', () => {
  test('Verify VPC created when deployVpc true', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack, { deployVpc: true });

    expect(construct.vpc).toBeDefined();

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::EC2::VPC', {});
  });

  test('Verify existing VPC used when provided', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const existingVpc = defaults.getTestVpc(stack);

    const construct = deployTestConstructStructure(stack, {
      existingVpc
    });

    expect(construct.vpc).toBe(existingVpc);
  });

  test('Verify Polly interface endpoint created', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    deployTestConstructStructure(stack, { deployVpc: true });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        "Fn::Join": [
          "",
          [
            "com.amazonaws.",
            {
              Ref: "AWS::Region"
            },
            ".polly"
          ]
        ]
      }
    });
  });

  test('Verify S3 gateway endpoint created when asyncJobs', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    deployTestConstructStructure(stack, {
      deployVpc: true,
      asyncJobs: true
    });

    const template = Template.fromStack(stack);

    // Should have 2 endpoints: Polly interface + S3 gateway
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 2);

    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        "Fn::Join": [
          "",
          [
            "com.amazonaws.",
            {
              Ref: "AWS::Region"
            },
            ".s3"
          ]
        ]
      }
    });
  });
});

// Sub-task 8.7: Test logging configuration
describe('Test logging configuration', () => {
  test('Verify access logging enabled by default', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack, { asyncJobs: true });

    expect(construct.loggingBucket).toBeDefined();

    const template = Template.fromStack(stack);

    // Check logging is configured on destination bucket
    template.hasResourceProperties('AWS::S3::Bucket', {
      LoggingConfiguration: Match.objectLike({
        DestinationBucketName: {
          Ref: Match.stringLikeRegexp("testlambdapollytestlambdapollyoutputbucketS3LoggingBucket*")
        }
      })
    });
  });

  test('Verify access logging can be disabled', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack, {
      asyncJobs: true,
      logS3AccessLogs: false
    });

    expect(construct.loggingBucket).not.toBeDefined();

    const template = Template.fromStack(stack);

    // Should only have 1 bucket (destination, no logging bucket)
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  test('Verify logging bucket created', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack, { asyncJobs: true });

    expect(construct.loggingBucket).toBeDefined();

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 2);
  });
});

// Sub-task 8.8: Test encryption configuration
describe('Test encryption configuration', () => {
  test('Verify AWS-managed encryption by default', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack, { asyncJobs: true });

    // With AWS-managed encryption, the key is exposed (it's the AWS-managed key alias)
    expect(construct.notificationTopicEncryptionKey).toBeDefined();

    const template = Template.fromStack(stack);

    // Topic should have encryption
    template.hasResourceProperties('AWS::SNS::Topic', {
      KmsMasterKeyId: Match.anyValue()
    });

    // No custom KMS key resource should be created
    template.resourceCountIs('AWS::KMS::Key', 0);
  });

  test('Verify customer-managed key when specified', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack, {
      asyncJobs: true,
      enableTopicEncryptionWithCustomerManagedKey: true
    });

    expect(construct.notificationTopicEncryptionKey).toBeDefined();

    const template = Template.fromStack(stack);

    // Should have a KMS key created
    template.resourceCountIs('AWS::KMS::Key', 1);

    // Topic should reference the custom key
    template.hasResourceProperties('AWS::SNS::Topic', {
      KmsMasterKeyId: {
        "Fn::GetAtt": [
          Match.stringLikeRegexp("testlambdapollytestlambdapollyKey*"),
          "Arn"
        ]
      }
    });
  });

  test('Verify encryption key property exposed', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const construct = deployTestConstructStructure(stack, {
      asyncJobs: true,
      enableTopicEncryptionWithCustomerManagedKey: true
    });

    expect(construct.notificationTopicEncryptionKey).toBeDefined();
  });
});

// Sub-task 8.9: Test validation errors
describe('Test validation errors', () => {
  test('Verify error for conflicting Lambda props', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const existingLambda = new lambda.Function(stack, 'existing-lambda', {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    expect(() => {
      new LambdaToPolly(stack, 'test-lambda-polly', {
        existingLambdaObj: existingLambda,
        lambdaFunctionProps: {
          runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
          handler: 'index.handler',
          code: lambda.Code.fromInline('exports.handler = async () => {};')
        }
      });
    }).toThrow('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.');
  });

  test('Verify error for conflicting VPC props', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    const existingVpc = defaults.getTestVpc(stack);

    expect(() => {
      deployTestConstructStructure(stack, {
        existingVpc,
        deployVpc: true
      });
    }).toThrow('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.');
  });

  test('Verify error for bucket props without asyncJobs', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    expect(() => {
      deployTestConstructStructure(stack, {
        bucketProps: {}
      });
    }).toThrow('Error - Bucket properties can only be provided when asyncJobs is true.');
  });

  test('Verify error for topic props without asyncJobs', () => {
    const app = new App();
    const stack = new Stack(app, "test-stack");

    expect(() => {
      deployTestConstructStructure(stack, {
        topicProps: {}
      });
    }).toThrow('Error - Topic properties can only be provided when asyncJobs is true.');
  });
});

test('Test that ValidateTopicProps() is being called', () => {
  const stack = new Stack();
  const props: LambdaToPollyProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    topicProps: {
      invalidProperty: true
    }
  };

  const app = () => {
    new LambdaToPolly(stack, 'test-construct', props);
  };

  expect(app).toThrowError();
});

test('Test that ValidateKeyProps() is being called', () => {
  const stack = new Stack();
  const props: LambdaToPollyProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    topicEncryptionKeyProps: {
      invalidProperty: true
    }
  };

  const app = () => {
    new LambdaToPolly(stack, 'test-construct', props);
  };

  expect(app).toThrowError();
});

test('Test that ValidateVpcProps() is being called', () => {
  const stack = new Stack();
  const props: LambdaToPollyProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    deployVpc: true,
    vpcProps: {
      invalidProperty: true
    }
  };

  const app = () => {
    new LambdaToPolly(stack, 'test-construct', props);
  };

  expect(app).toThrowError();
});
