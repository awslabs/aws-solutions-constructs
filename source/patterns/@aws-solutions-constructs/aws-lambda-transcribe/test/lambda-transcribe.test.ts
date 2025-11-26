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
import { LambdaToTranscribe } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

function deployTestConstructStructure(stack: Stack, props?: any) {
  return new LambdaToTranscribe(stack, 'test-lambda-transcribe', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    },
    ...props
  });
}

test('Test deployment with no optional parameters', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const construct = deployTestConstructStructure(stack);

  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.sourceBucket).toBeDefined();
  expect(construct.destinationBucket).toBeDefined();
  expect(construct.sourceBucketInterface).toBeDefined();
  expect(construct.destinationBucketInterface).toBeDefined();
  expect(construct.sourceLoggingBucket).toBeDefined();
  expect(construct.destinationLoggingBucket).toBeDefined();
  expect(construct.vpc).not.toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
  });
  template.resourceCountIs('AWS::S3::Bucket', 4); // 2 main buckets + 2 logging buckets
});

test('Test deployment with useSameBucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const construct = deployTestConstructStructure(stack, { useSameBucket: true });

  expect(construct.sourceBucketInterface).toBe(construct.destinationBucketInterface);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::S3::Bucket', 2); // 1 main bucket + 1 logging bucket
});

test('Test deployment with VPC', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const construct = deployTestConstructStructure(stack, { deployVpc: true });

  expect(construct.vpc).toBeDefined();

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::EC2::VPC', {});
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
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".transcribe"
        ]
      ]
    }
  });
});

test('Test deployment with existing VPC', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingVpc = defaults.getTestVpc(stack);
  const construct = deployTestConstructStructure(stack, { existingVpc });

  expect(construct.vpc).toBe(existingVpc);
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::EC2::VPC', 1);

});

test('Test deployment with existing Lambda function', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingLambda = defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline('def handler(): pass')
    }
  }, 'existing-lambda');

  const construct = new LambdaToTranscribe(stack, 'test-lambda-transcribe', {
    existingLambdaObj: existingLambda
  });

  expect(construct.lambdaFunction).toBe(existingLambda);
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 1);
});

test('Test deployment with existing source bucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingBucket = defaults.CreateScrapBucket(stack, 'existing-source-bucket');

  const construct = deployTestConstructStructure(stack, {
    existingSourceBucketObj: existingBucket
  });

  expect(construct.sourceBucketInterface).toBe(existingBucket);
  expect(construct.sourceBucket).toBeUndefined();
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::S3::Bucket', 4);
});

test('Test deployment with existing destination bucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingBucket = defaults.CreateScrapBucket(stack, 'existing-dest-bucket');

  const construct = deployTestConstructStructure(stack, {
    existingDestinationBucketObj: existingBucket
  });

  expect(construct.destinationBucketInterface).toBe(existingBucket);
  expect(construct.destinationBucket).toBeUndefined();
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::S3::Bucket', 4);
});

test('Test custom environment variable names', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  deployTestConstructStructure(stack, {
    sourceBucketEnvironmentVariableName: 'CUSTOM_SOURCE_BUCKET',
    destinationBucketEnvironmentVariableName: 'CUSTOM_DEST_BUCKET'
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        CUSTOM_SOURCE_BUCKET: {
          Ref: Match.stringLikeRegexp(`testlambdatranscribetestlambdatranscribesourcebucketS3Bucket.*`)
        },
        CUSTOM_DEST_BUCKET: {
          Ref: Match.stringLikeRegexp(`testlambdatranscribetestlambdatranscribedestinationbucketS3Bucket.*`)
        }
      }
    }
  });
});

test('Test Lambda has Transcribe permissions', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  deployTestConstructStructure(stack);

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: [
            'transcribe:StartTranscriptionJob',
            'transcribe:GetTranscriptionJob',
            'transcribe:ListTranscriptionJobs'
          ],
          Effect: 'Allow',
          Resource: '*'
        })
      ])
    },
    Roles: [
      {
        Ref: Match.stringLikeRegexp(`testlambdatranscribeLambdaFunctionServiceRole.*`)
      }]
  });
});

test('Test S3 bucket permissions', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  deployTestConstructStructure(stack);

  const template = Template.fromStack(stack);

  // Check Lambda has write permissions to source bucket
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: Match.objectLike({
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: Match.arrayWith(["s3:DeleteObject*",
            "s3:PutObject",
            "s3:PutObjectLegalHold",
            "s3:PutObjectRetention",
            "s3:PutObjectTagging",
            "s3:PutObjectVersionTagging",
            "s3:Abort*"]),
          Effect: 'Allow',
          Resource: [
            {
              "Fn::GetAtt": [
                "testlambdatranscribetestlambdatranscribedestinationbucketS3BucketB2D0CD56",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "testlambdatranscribetestlambdatranscribedestinationbucketS3BucketB2D0CD56",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        })
      ])
    },
    ),
    Roles: [
      {
        Ref: Match.stringLikeRegexp(`testlambdatranscribeLambdaFunctionServiceRole.*`)
      }]
  });
});

test('Test custom source bucket props', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  deployTestConstructStructure(stack, {
    sourceBucketProps: {
      objectLockEnabled: true,
    },
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    ObjectLockEnabled: true,
    // Check that this is the correct bucket
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: Match.stringLikeRegexp("testlambdatranscribetestlambdatranscribesourcebucketS3LoggingBucket.*")
      }
    },
  });
});

test('Test custom destination bucket props', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  deployTestConstructStructure(stack, {
    destinationBucketProps: {
      objectLockEnabled: true,
    },
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    ObjectLockEnabled: true,
    // Check that this is the correct bucket
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: Match.stringLikeRegexp("testlambdatranscribetestlambdatranscribedestinationbucketS3LoggingBucket.*")
      }
    },
  });
});

test('Test custom source logging bucket props', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  deployTestConstructStructure(stack, {
    sourceLoggingBucketProps: {
      objectLockEnabled: true,
    },
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    ObjectLockEnabled: true,
    // Check that this is the correct bucket
    LoggingConfiguration: Match.absent(),
  });
});

test('Test custom destination logging bucket props', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  deployTestConstructStructure(stack, {
    destinationLoggingBucketProps: {
      objectLockEnabled: true,
    },
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    ObjectLockEnabled: true,
    // Check that this is the correct bucket
    LoggingConfiguration: Match.absent(),
  });
});

test('Test logging bucket configuration', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const construct = deployTestConstructStructure(stack, {
    logSourceS3AccessLogs: false,
    logDestinationS3AccessLogs: false
  });

  expect(construct.sourceLoggingBucket).not.toBeDefined();
  expect(construct.destinationLoggingBucket).not.toBeDefined();
});

test('Test error on both existing bucket and bucket props', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingBucket = defaults.CreateScrapBucket(stack, 'existing-bucket');

  expect(() => {
    deployTestConstructStructure(stack, {
      existingSourceBucketObj: existingBucket,
      sourceBucketProps: { versioned: false }
    });
  }).toThrow('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});

test('Test error on both existing Lambda and Lambda props', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingLambda = new lambda.Function(stack, 'existing-lambda', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromInline('exports.handler = async () => {};')
  });

  expect(() => {
    new LambdaToTranscribe(stack, 'test-lambda-transcribe', {
      existingLambdaObj: existingLambda,
      lambdaFunctionProps: {
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'index.handler',
        code: lambda.Code.fromInline('def handler(): pass')
      }
    });
  }).toThrow('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
