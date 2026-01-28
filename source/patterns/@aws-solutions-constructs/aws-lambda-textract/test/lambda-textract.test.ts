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

import { App, Duration, Stack } from "aws-cdk-lib";
import { LambdaToTextract } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

function deployTestConstructStructure(stack: Stack, props?: any) {
  return new LambdaToTextract(stack, 'test-lambda-textract', {
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
  expect(construct.sourceBucket).not.toBeDefined();
  expect(construct.destinationBucket).not.toBeDefined();
  expect(construct.sourceBucketInterface).not.toBeDefined();
  expect(construct.destinationBucketInterface).not.toBeDefined();
  expect(construct.snsNotificationTopic).not.toBeDefined();
  expect(construct.vpc).not.toBeDefined();

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING
  });

  // Check default Textract permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: ['textract:DetectDocumentText', 'textract:AnalyzeDocument', 'textract:AnalyzeExpense', 'textract:AnalyzeID']
        })
      ])
    }
  });

  template.resourceCountIs('AWS::SNS::Topic', 0);

  // Ensure we didn't create the async jobs infrastructure
  template.resourceCountIs("AWS::IAM::Role", 1);
  template.resourceCountIs('AWS::S3::Bucket', 0);
  template.resourcePropertiesCountIs("AWS::Lambda::Function", {
    timeout: 30,
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
  expect(construct.snsNotificationTopic).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 4); // 2 main buckets + 2 logging buckets
  template.resourceCountIs('AWS::SNS::Topic', 1);

  // Check lambda function permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            'textract:DetectDocumentText',
            'textract:AnalyzeDocument',
            'textract:AnalyzeExpense',
            'textract:AnalyzeID',
            'textract:StartDocumentTextDetection',
            'textract:GetDocumentTextDetection',
            'textract:StartDocumentAnalysis',
            'textract:GetDocumentAnalysis',
            'textract:StartExpenseAnalysis',
            'textract:GetExpenseAnalysis',
            'textract:StartLendingAnalysis',
            'textract:GetLendingAnalysis'
          ]),
          Resource: '*'
        }),
        Match.objectLike({
          Effect: 'Allow',
          Action: ["iam:PassRole", "iam:GetRole"],
          Resource: {
            "Fn::GetAtt": [
              Match.stringLikeRegexp("testlambdatextracttestlambdatextracttextractservicerole.*"),
              "Arn"
            ]
          }
        })
      ])
    },
    Roles: [
      {
        Ref: Match.stringLikeRegexp("testlambdatextractLambdaFunctionServiceRole.*")
      }
    ]
  });

  // Check textract service permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Effect: 'Allow',
          Action: "sns:Publish",
          Resource: {
            Ref: Match.stringLikeRegexp("SnsTopic")
          }
        }
      ]
    },
    Roles: [
      {
        Ref: Match.stringLikeRegexp("testlambdatextracttestlambdatextracttextractservicerole.*")
      }]
  });

  // Check that there are 2 separate policies
  template.resourceCountIs("AWS::IAM::Policy", 2);

  // Check environment variables
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: Match.objectLike({
        SOURCE_BUCKET_NAME: Match.anyValue(),
        DESTINATION_BUCKET_NAME: Match.anyValue(),
        SNS_ROLE_ARN: Match.anyValue(),
        SNS_TOPIC_ARN: Match.anyValue()
      })
    }
  });
});

test('Test deployment with AWS managed destination bucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const construct = deployTestConstructStructure(stack, {
    asyncJobs: true,
    createCustomerManagedOutputBucket: false,
  });

  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.sourceBucket).toBeDefined();
  expect(construct.sourceBucketInterface).toBeDefined();
  expect(construct.sourceLoggingBucket).toBeDefined();
  expect(construct.snsNotificationTopic).toBeDefined();
  expect(construct.destinationBucket).not.toBeDefined();
  expect(construct.destinationBucketInterface).not.toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 2); // 1 source buckets + 1 logging bucket
  template.resourceCountIs('AWS::SNS::Topic', 1);

  // Check lambda function permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            'textract:DetectDocumentText',
            'textract:AnalyzeDocument',
            'textract:AnalyzeExpense',
            'textract:AnalyzeID',
            'textract:StartDocumentTextDetection',
            'textract:GetDocumentTextDetection',
            'textract:StartDocumentAnalysis',
            'textract:GetDocumentAnalysis',
            'textract:StartExpenseAnalysis',
            'textract:GetExpenseAnalysis',
            'textract:StartLendingAnalysis',
            'textract:GetLendingAnalysis'
          ]),
          Resource: '*'
        }),
        Match.objectLike({
          Effect: 'Allow',
          Action: ["iam:PassRole", "iam:GetRole"],
          Resource: {
            "Fn::GetAtt": [
              Match.stringLikeRegexp("testlambdatextracttestlambdatextracttextractservicerole.*"),
              "Arn"
            ]
          }
        })
      ])
    },
    Roles: [
      {
        Ref: Match.stringLikeRegexp("testlambdatextractLambdaFunctionServiceRole.*")
      }
    ]
  });

  // Check textract service permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Effect: 'Allow',
          Action: "sns:Publish",
          Resource: {
            Ref: Match.stringLikeRegexp("SnsTopic")
          }
        }
      ]
    },
    Roles: [
      {
        Ref: Match.stringLikeRegexp("testlambdatextracttestlambdatextracttextractservicerole.*")
      }]
  });

  // Check that there are 2 separate policies
  template.resourceCountIs("AWS::IAM::Policy", 2);

  // Check environment variables
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: Match.objectLike({
        SOURCE_BUCKET_NAME: Match.anyValue(),
        SNS_ROLE_ARN: Match.anyValue(),
        SNS_TOPIC_ARN: Match.anyValue()
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
  template.resourceCountIs('AWS::SNS::Topic', 1);
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
          ".textract"
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
  template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
  // Should have Textract, S3, and SNS endpoints
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".textract"
        ]
      ]
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
    dataAccessRoleArnEnvironmentVariableName: 'CUSTOM_ARN',
    snsNotificationTopicArnEnvironmentVariableName: 'CUSTOM_SNS'
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: Match.objectLike({
        CUSTOM_SOURCE: Match.anyValue(),
        CUSTOM_DEST: Match.anyValue(),
        CUSTOM_ARN: Match.anyValue(),
        CUSTOM_SNS: Match.anyValue()
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
          ".textract"
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

test('Ensure existingTopicObj is used', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  // Create an existing SNS topic
  const existingTopic = defaults.buildTopic(stack, 'existing-topic', {
    topicProps: {
      topicName: 'pre-existing-textract-topic',
      displayName: 'Pre-existing Textract Topic'
    }
  }).topic;

  const construct = deployTestConstructStructure(stack, {
    asyncJobs: true,
    existingNotificationTopicObj: existingTopic
  });

  // Verify the existing topic is used
  expect(construct.snsNotificationTopic).toBeDefined();
  expect(construct.snsNotificationTopic).toBe(existingTopic);

  const template = Template.fromStack(stack);

  // Verify exactly 1 SNS topic exists (the pre-existing one, no new topic created)
  template.resourceCountIs('AWS::SNS::Topic', 1);

  // Verify it's the pre-existing topic with the correct properties
  template.hasResourceProperties('AWS::SNS::Topic', {
    TopicName: 'pre-existing-textract-topic',
    DisplayName: 'Pre-existing Textract Topic'
  });
});

test('Ensure topicProps are used', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const construct = deployTestConstructStructure(stack, {
    asyncJobs: true,
    notificationTopicProps: {
      displayName: 'Custom Textract Notifications'
    }
  });

  // Verify SNS topic was created
  expect(construct.snsNotificationTopic).toBeDefined();

  const template = Template.fromStack(stack);

  // Verify exactly 1 SNS topic was created
  template.resourceCountIs('AWS::SNS::Topic', 1);

  // Verify the topic has the custom displayName
  template.hasResourceProperties('AWS::SNS::Topic', {
    DisplayName: 'Custom Textract Notifications'
  });
});

test('Ensure topic encryption key is exposed', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const construct = deployTestConstructStructure(stack, {
    asyncJobs: true,
    enableNotificationTopicEncryptionWithCustomerManagedKey: true,
  });

  // Verify SNS topic was created
  expect(construct.snsNotificationTopic).toBeDefined();
  expect(construct.notificationTopicEncryptionKey).toBeDefined();

  const template = Template.fromStack(stack);

  // Verify exactly 1 SNS topic was created
  template.resourceCountIs('AWS::SNS::Topic', 1);
  template.resourceCountIs('AWS::KMS::Key', 1);
});

test('Test default timeout can be overridden', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

new LambdaToTextract(stack, 'test-lambda-textract', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};'),
      timeout: Duration.minutes(5)
    },
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Timeout: 300
  });

});

test('Test default timeout is 30', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  deployTestConstructStructure(stack);

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Timeout: 30
  });

});
