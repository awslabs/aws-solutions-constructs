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
import { LambdaToTranslate } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

function deployTestConstructStructure(stack: Stack, props?: any) {
  return new LambdaToTranslate(stack, 'test-lambda-translate', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_20_X,
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
  expect(construct.sourceBucket).not.toBeDefined();
  expect(construct.destinationBucket).not.toBeDefined();
  expect(construct.sourceBucketInterface).not.toBeDefined();
  expect(construct.destinationBucketInterface).not.toBeDefined();
  expect(construct.vpc).not.toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'nodejs20.x'
  });

  // Check default Translate permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: ['translate:TranslateText', 'translate:TranslateDocument']
        })
      ])
    }
  });

  // Ensure we didn't create the async jobs infrastructure
  template.resourceCountIs("AWS::IAM::Role", 1);
  template.resourceCountIs('AWS::S3::Bucket', 0);
  template.resourcePropertiesCountIs("AWS::Lambda::Function", {
    Environment: Match.objectLike({
      Variables: {
        "SOURCE_BUCKET_NAME": Match.anyValue()
      }
    }),
  }, 0);
});

test('Test deployment with asyncJobs enabled', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const construct = deployTestConstructStructure(stack, { asyncJobs: true });

  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.sourceBucket).toBeDefined();
  expect(construct.destinationBucket).toBeDefined();
  expect(construct.sourceBucketInterface).toBeDefined();
  expect(construct.destinationBucketInterface).toBeDefined();
  expect(construct.sourceLoggingBucket).toBeDefined();
  expect(construct.destinationLoggingBucket).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 4); // 2 main buckets + 2 logging buckets

  // Check lambda functon permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            "translate:TranslateText",
            "translate:TranslateDocument",
            "iam:PassRole",
            "translate:DescribeTextTranslationJob",
            "translate:ListTextTranslationJobs",
            "translate:StartTextTranslationJob",
            "translate:StopTextTranslationJob"
          ])
        })
      ])
    }
  });

  // Check translate service permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            "s3:GetObject*",
            "s3:GetBucket*",
            "s3:List*",
            "s3:DeleteObject*",
            "s3:PutObject",
            "s3:PutObjectLegalHold",
            "s3:PutObjectRetention",
            "s3:PutObjectTagging",
            "s3:PutObjectVersionTagging",
            "s3:Abort*"
          ])
        })
      ])
    }
  });

  // Check that there are 2 separate policies
  template.resourceCountIs("AWS::IAM::Policy", 2);
  // TODO - we really need to link the policies above to a the proper roles
  // Check environment variables
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: Match.objectLike({
        SOURCE_BUCKET_NAME: Match.anyValue(),
        DESTINATION_BUCKET_NAME: Match.anyValue(),
        DATA_ACCESS_ROLE_ARN: Match.anyValue(),
      })
    }
  });
});

test('Test deployment with asyncJobs and useSameBucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const construct = deployTestConstructStructure(stack, {
    asyncJobs: true,
    useSameBucket: true
  });

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
          ".translate"
        ]
      ]
    }
  });
});

test('Test deployment with VPC and asyncJobs', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const construct = deployTestConstructStructure(stack, {
    deployVpc: true,
    asyncJobs: true
  });

  expect(construct.vpc).toBeDefined();

  const template = Template.fromStack(stack);

  // Should have both Translate and S3 endpoints
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".translate"
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
          ".s3"
        ]
      ]
    }
  });
});

test('Test deployment with additionalPermissions', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  deployTestConstructStructure(stack, {
    additionalPermissions: ['translate:CreateParallelData', 'translate:DeleteParallelData']
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            'translate:TranslateText',
            'translate:TranslateDocument',
            'translate:CreateParallelData',
            'translate:DeleteParallelData'
          ])
        })
      ])
    }
  });
});

test('Test custom environment variable names', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  deployTestConstructStructure(stack, {
    asyncJobs: true,
    sourceBucketEnvironmentVariableName: 'CUSTOM_SOURCE',
    destinationBucketEnvironmentVariableName: 'CUSTOM_DEST',
    dataAccessRoleArnEnvironmentVariableName: 'CUSTOM_ARN'
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: Match.objectLike({
        CUSTOM_SOURCE: Match.anyValue(),
        CUSTOM_DEST: Match.anyValue(),
        CUSTOM_ARN: Match.anyValue()
      })
    }
  });
});

test('Test deployment with existing VPC', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingVpc = defaults.getTestVpc(stack);

  const construct = deployTestConstructStructure(stack, {
    existingVpc
  });

  expect(construct.vpc).toBe(existingVpc);

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
          ".translate"
        ]
      ]
    }
  });
});

test('Test deployment with existing S3 buckets', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const sourceBucket = defaults.CreateScrapBucket(stack, 'existing-source');
  const destinationBucket = defaults.CreateScrapBucket(stack, 'existing-destination');

  const construct = deployTestConstructStructure(stack, {
    asyncJobs: true,
    existingSourceBucketObj: sourceBucket,
    existingDestinationBucketObj: destinationBucket
  });

  expect(construct.sourceBucket).not.toBeDefined();
  expect(construct.destinationBucket).not.toBeDefined();
  expect(construct.sourceBucketInterface).toBe(sourceBucket);
  expect(construct.destinationBucketInterface).toBe(destinationBucket);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::S3::Bucket', 4);
});

test('Test error when S3 props provided without asyncJobs', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  expect(() => {
    deployTestConstructStructure(stack, {
      sourceBucketProps: {}
    });
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test('Test error when destination props provided with useSameBucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  expect(() => {
    deployTestConstructStructure(stack, {
      asyncJobs: true,
      useSameBucket: true,
      destinationBucketProps: {}
    });
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

// TODO: Check new Translate role
