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
import { ComprehendAnalysisType, ComprehendUseCase, LambdaToComprehend } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

function deployTestConstruct(stack: Stack, props?: any): LambdaToComprehend {
  return new LambdaToComprehend(stack, 'test-lambda-comprehend', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    },
    ...props
  });
}

function createTestLambdaFunction(stack: Stack, id: string, props?: any): lambda.Function {
  return new lambda.Function(stack, id, {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromInline('exports.handler = async () => {};'),
    ...props
  });
}

/*
 *  Collect every Comprehend action granted anywhere in the synthesized template, in the order the
 *  construct emitted them. Returning the flat array lets a test assert the exact ordered list
 *  rather than merely asserting that particular actions are present somewhere.
 */
function comprehendActionsFrom(stack: Stack): string[] {
  const actions: string[] = [];
  Object.values(Template.fromStack(stack).findResources('AWS::IAM::Policy')).forEach((policy: any) => {
    policy.Properties.PolicyDocument.Statement.forEach((statement: any) => {
      const statementActions: any[] = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
      if (statementActions.some(action => typeof action === 'string' && action.startsWith('comprehend:'))) {
        actions.push(...statementActions);
      }
    });
  });
  return actions;
}

function allActionsFrom(stack: Stack): string[] {
  const actions: string[] = [];
  Object.values(Template.fromStack(stack).findResources('AWS::IAM::Policy')).forEach((policy: any) => {
    policy.Properties.PolicyDocument.Statement.forEach((statement: any) => {
      const statementActions: any[] = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
      statementActions.forEach(action => {
        if (typeof action === 'string') {
          actions.push(action);
        }
      });
    });
  });
  return actions;
}

function logicalIdOf(stack: Stack, resource: iam.IRole | s3.IBucket | lambda.Function): string {
  return stack.getLogicalId(resource.node.defaultChild as any);
}

function environmentVariablesOf(stack: Stack, functionResource: lambda.Function): any {
  const functions = Template.fromStack(stack).findResources('AWS::Lambda::Function');
  return functions[logicalIdOf(stack, functionResource)].Properties.Environment?.Variables ?? {};
}

const VPC_WARNING_FRAGMENT = 'asynchronous analysis jobs do not run inside your VPC';

function vpcWarningEmitted(consoleLogSpy: jest.SpyInstance): boolean {
  return consoleLogSpy.mock.calls.some(call => typeof call[0] === 'string' && call[0].includes(VPC_WARNING_FRAGMENT));
}

// The actions produced by each use case when every analysis type is selected. Each list is in the
// order the core helper emits it: analysis types walked in enum declaration order
const SINGLE_DOCUMENT_ACTIONS = [
  'comprehend:DetectDominantLanguage',
  'comprehend:DetectEntities',
  'comprehend:DetectKeyPhrases',
  'comprehend:DetectSentiment',
  'comprehend:DetectTargetedSentiment',
  'comprehend:DetectSyntax',
  'comprehend:DetectPiiEntities',
  'comprehend:ContainsPiiEntities'
];

// Amazon Comprehend offers no BatchDetectPiiEntities, so PII contributes nothing here
const MULTI_DOCUMENT_ACTIONS = [
  'comprehend:BatchDetectDominantLanguage',
  'comprehend:BatchDetectEntities',
  'comprehend:BatchDetectKeyPhrases',
  'comprehend:BatchDetectSentiment',
  'comprehend:BatchDetectTargetedSentiment',
  'comprehend:BatchDetectSyntax'
];

// Amazon Comprehend offers no syntax detection job, so SYNTAX contributes nothing here
const ASYNC_BATCH_ACTIONS = [
  'comprehend:StartDominantLanguageDetectionJob',
  'comprehend:DescribeDominantLanguageDetectionJob',
  'comprehend:ListDominantLanguageDetectionJobs',
  'comprehend:StopDominantLanguageDetectionJob',
  'comprehend:StartEntitiesDetectionJob',
  'comprehend:DescribeEntitiesDetectionJob',
  'comprehend:ListEntitiesDetectionJobs',
  'comprehend:StopEntitiesDetectionJob',
  'comprehend:StartKeyPhrasesDetectionJob',
  'comprehend:DescribeKeyPhrasesDetectionJob',
  'comprehend:ListKeyPhrasesDetectionJobs',
  'comprehend:StopKeyPhrasesDetectionJob',
  'comprehend:StartSentimentDetectionJob',
  'comprehend:DescribeSentimentDetectionJob',
  'comprehend:ListSentimentDetectionJobs',
  'comprehend:StopSentimentDetectionJob',
  'comprehend:StartTargetedSentimentDetectionJob',
  'comprehend:DescribeTargetedSentimentDetectionJob',
  'comprehend:ListTargetedSentimentDetectionJobs',
  'comprehend:StopTargetedSentimentDetectionJob',
  'comprehend:StartPiiEntitiesDetectionJob',
  'comprehend:DescribePiiEntitiesDetectionJob',
  'comprehend:ListPiiEntitiesDetectionJobs',
  'comprehend:StopPiiEntitiesDetectionJob'
];

// ---------------------------------------------------------------------------------------------
// Default deployment and the fourteen action policy
// ---------------------------------------------------------------------------------------------

test('Test the default synchronous deployment', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack);

  expect(construct.lambdaFunction).toBeDefined();
  // Nothing asynchronous is provisioned in the default configuration
  expect(construct.dataAccessRole).toBeUndefined();
  expect(construct.sourceBucket).toBeUndefined();
  expect(construct.sourceLoggingBucket).toBeUndefined();
  expect(construct.sourceBucketInterface).toBeUndefined();
  expect(construct.destinationBucket).toBeUndefined();
  expect(construct.destinationLoggingBucket).toBeUndefined();
  expect(construct.destinationBucketInterface).toBeUndefined();
  expect(construct.vpc).toBeUndefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Timeout: 30
  });
  template.resourceCountIs('AWS::S3::Bucket', 0);
  template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
  // The default is both synchronous use cases and no asynchronous one, in the order the core
  // helper emits them, granted against every resource
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: [...SINGLE_DOCUMENT_ACTIONS, ...MULTI_DOCUMENT_ACTIONS],
          Resource: '*'
        })
      ])
    },
    // The generated actions are granted to the Lambda function's own execution role
    Roles: [{ Ref: logicalIdOf(stack, construct.lambdaFunction.role!) }]
  });
});

test('Test the default deployment grants no S3 or PassRole permissions', () => {
  const stack = new Stack(new App(), 'test-stack');

  deployTestConstruct(stack);

  // The synchronous APIs carry the document in the request, so nothing is staged in S3 and
  // Comprehend has no role to assume
  const actions = allActionsFrom(stack);
  expect(actions.filter(action => action.startsWith('s3:'))).toEqual([]);
  expect(actions).not.toContain('iam:PassRole');
  Template.fromStack(stack).resourceCountIs('AWS::IAM::Role', 1);
});

test('Test a client supplied timeout overrides the thirty second default', () => {
  const stack = new Stack(new App(), 'test-stack');

  new LambdaToComprehend(stack, 'test-lambda-comprehend', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};'),
      timeout: Duration.seconds(90)
    }
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', { Timeout: 90 });
});

test('Test an existing Lambda function is used as supplied', () => {
  const stack = new Stack(new App(), 'test-stack');

  const existingFunction = createTestLambdaFunction(stack, 'existing-function', { functionName: 'existing-function-name' });

  const construct = new LambdaToComprehend(stack, 'test-lambda-comprehend', {
    existingLambdaObj: existingFunction
  });

  expect(construct.lambdaFunction).toBe(existingFunction);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 1);
  // The thirty second default is not applied to a function the construct did not create
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'existing-function-name',
    Timeout: Match.absent()
  });
  expect(comprehendActionsFrom(stack)).toEqual([...SINGLE_DOCUMENT_ACTIONS, ...MULTI_DOCUMENT_ACTIONS]);
});

// ---------------------------------------------------------------------------------------------
// Use case and analysis type coverage
// ---------------------------------------------------------------------------------------------

test('Test each use case in isolation', () => {
  const singleStack = new Stack(new App(), 'single-stack');
  deployTestConstruct(singleStack, { comprehendUseCases: [ComprehendUseCase.SINGLE_DOCUMENT_SYNC] });
  expect(comprehendActionsFrom(singleStack)).toEqual(SINGLE_DOCUMENT_ACTIONS);

  const multiStack = new Stack(new App(), 'multi-stack');
  deployTestConstruct(multiStack, { comprehendUseCases: [ComprehendUseCase.MULTI_DOCUMENT_SYNC] });
  expect(comprehendActionsFrom(multiStack)).toEqual(MULTI_DOCUMENT_ACTIONS);

  const asyncStack = new Stack(new App(), 'async-stack');
  deployTestConstruct(asyncStack, { comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH] });
  expect(comprehendActionsFrom(asyncStack)).toEqual(ASYNC_BATCH_ACTIONS);
});

test('Test every pairing of use cases', () => {
  const singleMultiStack = new Stack(new App(), 'single-multi-stack');
  deployTestConstruct(singleMultiStack, {
    comprehendUseCases: [ComprehendUseCase.SINGLE_DOCUMENT_SYNC, ComprehendUseCase.MULTI_DOCUMENT_SYNC]
  });
  expect(comprehendActionsFrom(singleMultiStack)).toEqual([...SINGLE_DOCUMENT_ACTIONS, ...MULTI_DOCUMENT_ACTIONS]);

  const singleAsyncStack = new Stack(new App(), 'single-async-stack');
  deployTestConstruct(singleAsyncStack, {
    comprehendUseCases: [ComprehendUseCase.SINGLE_DOCUMENT_SYNC, ComprehendUseCase.ASYNC_BATCH]
  });
  expect(comprehendActionsFrom(singleAsyncStack)).toEqual([...SINGLE_DOCUMENT_ACTIONS, ...ASYNC_BATCH_ACTIONS]);

  const multiAsyncStack = new Stack(new App(), 'multi-async-stack');
  deployTestConstruct(multiAsyncStack, {
    comprehendUseCases: [ComprehendUseCase.MULTI_DOCUMENT_SYNC, ComprehendUseCase.ASYNC_BATCH]
  });
  expect(comprehendActionsFrom(multiAsyncStack)).toEqual([...MULTI_DOCUMENT_ACTIONS, ...ASYNC_BATCH_ACTIONS]);
});

test('Test all three use cases together', () => {
  const stack = new Stack(new App(), 'test-stack');

  deployTestConstruct(stack, {
    comprehendUseCases: [
      ComprehendUseCase.SINGLE_DOCUMENT_SYNC,
      ComprehendUseCase.MULTI_DOCUMENT_SYNC,
      ComprehendUseCase.ASYNC_BATCH
    ]
  });

  expect(comprehendActionsFrom(stack)).toEqual([
    ...SINGLE_DOCUMENT_ACTIONS,
    ...MULTI_DOCUMENT_ACTIONS,
    ...ASYNC_BATCH_ACTIONS
  ]);
});

test('Test each analysis type in isolation under the default use cases', () => {
  const expectedActions: [ComprehendAnalysisType, string[]][] = [
    [ComprehendAnalysisType.DOMINANT_LANGUAGE, ['comprehend:DetectDominantLanguage', 'comprehend:BatchDetectDominantLanguage']],
    [ComprehendAnalysisType.ENTITIES, ['comprehend:DetectEntities', 'comprehend:BatchDetectEntities']],
    [ComprehendAnalysisType.KEY_PHRASES, ['comprehend:DetectKeyPhrases', 'comprehend:BatchDetectKeyPhrases']],
    [ComprehendAnalysisType.SENTIMENT, ['comprehend:DetectSentiment', 'comprehend:BatchDetectSentiment']],
    [ComprehendAnalysisType.TARGETED_SENTIMENT, ['comprehend:DetectTargetedSentiment', 'comprehend:BatchDetectTargetedSentiment']],
    [ComprehendAnalysisType.SYNTAX, ['comprehend:DetectSyntax', 'comprehend:BatchDetectSyntax']],
    // PII has no multi document action, but the selection is still productive under
    // SINGLE_DOCUMENT_SYNC so it is accepted
    [ComprehendAnalysisType.PII, ['comprehend:DetectPiiEntities', 'comprehend:ContainsPiiEntities']]
  ];

  expectedActions.forEach(([analysisType, actions], index) => {
    // A stack name cannot contain the underscores the enum values carry
    const stack = new Stack(new App(), `analysis-type-stack-${index}`);
    deployTestConstruct(stack, { analysisTypes: [analysisType] });
    expect(comprehendActionsFrom(stack)).toEqual(actions);
  });
});

test('Test the two service gaps are rejected when the client names them explicitly', () => {
  const multiPiiStack = new Stack(new App(), 'multi-pii-stack');
  expect(() => {
    deployTestConstruct(multiPiiStack, {
      comprehendUseCases: [ComprehendUseCase.MULTI_DOCUMENT_SYNC],
      analysisTypes: [ComprehendAnalysisType.PII]
    });
  }).toThrow('Error - the analysisTypes value PII produces no Amazon Comprehend actions for any of the selected '
    + 'comprehendUseCases. Remove it, or add a use case that supports it.\n');

  const asyncSyntaxStack = new Stack(new App(), 'async-syntax-stack');
  expect(() => {
    deployTestConstruct(asyncSyntaxStack, {
      comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
      analysisTypes: [ComprehendAnalysisType.SYNTAX]
    });
  }).toThrow('Error - the analysisTypes value SYNTAX produces no Amazon Comprehend actions for any of the selected '
    + 'comprehendUseCases. Remove it, or add a use case that supports it.\n');
});

test('Test a selection spanning both gaps is accepted', () => {
  const stack = new Stack(new App(), 'test-stack');

  // SYNTAX is productive under MULTI_DOCUMENT_SYNC and PII under ASYNC_BATCH, so neither gap
  // makes the selection unproductive
  deployTestConstruct(stack, {
    comprehendUseCases: [ComprehendUseCase.MULTI_DOCUMENT_SYNC, ComprehendUseCase.ASYNC_BATCH],
    analysisTypes: [ComprehendAnalysisType.SYNTAX, ComprehendAnalysisType.PII]
  });

  expect(comprehendActionsFrom(stack)).toEqual([
    'comprehend:BatchDetectSyntax',
    'comprehend:StartPiiEntitiesDetectionJob',
    'comprehend:DescribePiiEntitiesDetectionJob',
    'comprehend:ListPiiEntitiesDetectionJobs',
    'comprehend:StopPiiEntitiesDetectionJob'
  ]);
});

test('Test duplicate enum members are de-duplicated silently', () => {
  const stack = new Stack(new App(), 'test-stack');

  deployTestConstruct(stack, {
    comprehendUseCases: [ComprehendUseCase.SINGLE_DOCUMENT_SYNC, ComprehendUseCase.SINGLE_DOCUMENT_SYNC],
    analysisTypes: [ComprehendAnalysisType.SENTIMENT, ComprehendAnalysisType.SENTIMENT]
  });

  expect(comprehendActionsFrom(stack)).toEqual(['comprehend:DetectSentiment']);
});

// ---------------------------------------------------------------------------------------------
// Order independence
// ---------------------------------------------------------------------------------------------

test('Test the same selections in different array orders produce identical policies', () => {
  const firstStack = new Stack(new App(), 'test-stack');
  deployTestConstruct(firstStack, {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH, ComprehendUseCase.SINGLE_DOCUMENT_SYNC],
    analysisTypes: [ComprehendAnalysisType.PII, ComprehendAnalysisType.ENTITIES]
  });

  const secondStack = new Stack(new App(), 'test-stack');
  deployTestConstruct(secondStack, {
    comprehendUseCases: [ComprehendUseCase.SINGLE_DOCUMENT_SYNC, ComprehendUseCase.ASYNC_BATCH],
    analysisTypes: [ComprehendAnalysisType.ENTITIES, ComprehendAnalysisType.PII]
  });

  const expectedActions = [
    'comprehend:DetectEntities',
    'comprehend:DetectPiiEntities',
    'comprehend:ContainsPiiEntities',
    'comprehend:StartEntitiesDetectionJob',
    'comprehend:DescribeEntitiesDetectionJob',
    'comprehend:ListEntitiesDetectionJobs',
    'comprehend:StopEntitiesDetectionJob',
    'comprehend:StartPiiEntitiesDetectionJob',
    'comprehend:DescribePiiEntitiesDetectionJob',
    'comprehend:ListPiiEntitiesDetectionJobs',
    'comprehend:StopPiiEntitiesDetectionJob'
  ];

  expect(comprehendActionsFrom(firstStack)).toEqual(expectedActions);
  expect(comprehendActionsFrom(secondStack)).toEqual(expectedActions);
});

// ---------------------------------------------------------------------------------------------
// Asynchronous resources
// ---------------------------------------------------------------------------------------------

test('Test the asynchronous deployment assigns every public property', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    analysisTypes: [ComprehendAnalysisType.ENTITIES]
  });

  expect(construct.dataAccessRole).toBeDefined();
  expect(construct.sourceBucket).toBeDefined();
  expect(construct.sourceLoggingBucket).toBeDefined();
  expect(construct.sourceBucketInterface).toBeDefined();
  expect(construct.destinationBucket).toBeDefined();
  expect(construct.destinationLoggingBucket).toBeDefined();
  expect(construct.destinationBucketInterface).toBeDefined();

  const template = Template.fromStack(stack);
  // Two buckets and their two logging buckets
  template.resourceCountIs('AWS::S3::Bucket', 4);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        SOURCE_BUCKET_NAME: Match.anyValue(),
        DESTINATION_BUCKET_NAME: Match.anyValue(),
        DATA_ACCESS_ROLE_ARN: Match.anyValue()
      }
    }
  });
});

test('Test the asynchronous buckets use the well architected defaults', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, { comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH] });

  const buckets = Template.fromStack(stack).findResources('AWS::S3::Bucket');
  [construct.sourceBucket!, construct.destinationBucket!].forEach(bucket => {
    const properties = buckets[logicalIdOf(stack, bucket)].Properties;
    // Encryption managed by Amazon S3, so no customer managed key is created or granted
    expect(properties.BucketEncryption).toEqual({
      ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }]
    });
    expect(properties.PublicAccessBlockConfiguration).toEqual({
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    });
    expect(properties.VersioningConfiguration).toEqual({ Status: 'Enabled' });
    // Access logging is on by default, so each bucket points at its own logging bucket
    expect(properties.LoggingConfiguration).toBeDefined();
  });
  Template.fromStack(stack).resourceCountIs('AWS::KMS::Key', 0);
});

test('Test the data access role trusts Comprehend with a source account condition', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, { comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH] });

  const roles = Template.fromStack(stack).findResources('AWS::IAM::Role');
  const trustPolicy = roles[logicalIdOf(stack, construct.dataAccessRole!)].Properties.AssumeRolePolicyDocument;

  expect(trustPolicy.Statement).toEqual([{
    Action: 'sts:AssumeRole',
    Effect: 'Allow',
    Principal: { Service: 'comprehend.amazonaws.com' },
    // Guards against the confused deputy pattern
    Condition: { StringEquals: { 'aws:SourceAccount': { Ref: 'AWS::AccountId' } } }
  }]);
});

test('Test the data access role reads the source bucket and writes the destination bucket', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, { comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH] });

  const template = Template.fromStack(stack);
  const dataAccessRoleId = logicalIdOf(stack, construct.dataAccessRole!);

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        // Read on the source bucket
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith(['s3:GetObject*']),
          Resource: Match.arrayWith([{ 'Fn::GetAtt': [logicalIdOf(stack, construct.sourceBucket!), 'Arn'] }])
        }),
        // Read and write on the destination bucket
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith(['s3:PutObject']),
          Resource: Match.arrayWith([{ 'Fn::GetAtt': [logicalIdOf(stack, construct.destinationBucket!), 'Arn'] }])
        })
      ])
    },
    Roles: [{ Ref: dataAccessRoleId }]
  });

  // No KMS permission is granted, because the buckets use encryption managed by Amazon S3
  expect(allActionsFrom(stack).filter(action => action.startsWith('kms:'))).toEqual([]);
});

test('Test the Lambda function writes the source bucket, reads the destination bucket and can pass the role', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, { comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH] });

  const template = Template.fromStack(stack);
  const lambdaRoleId = logicalIdOf(stack, construct.lambdaFunction.role!);

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        // Read and write on the source bucket, so the function can stage documents
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith(['s3:PutObject']),
          Resource: Match.arrayWith([{ 'Fn::GetAtt': [logicalIdOf(stack, construct.sourceBucket!), 'Arn'] }])
        }),
        // Read on the destination bucket, so the function can collect results
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith(['s3:GetObject*']),
          Resource: Match.arrayWith([{ 'Fn::GetAtt': [logicalIdOf(stack, construct.destinationBucket!), 'Arn'] }])
        }),
        // Starting a job requires passing the data access role, restricted to Comprehend
        Match.objectLike({
          Effect: 'Allow',
          Action: 'iam:PassRole',
          Resource: { 'Fn::GetAtt': [logicalIdOf(stack, construct.dataAccessRole!), 'Arn'] },
          Condition: { StringEquals: { 'iam:PassedToService': 'comprehend.amazonaws.com' } }
        })
      ])
    },
    Roles: [{ Ref: lambdaRoleId }]
  });
});

// ---------------------------------------------------------------------------------------------
// Shared bucket, existing buckets and access logging
// ---------------------------------------------------------------------------------------------

test('Test useSameBucket collapses the two buckets into one', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    useSameBucket: true
  });

  expect(construct.destinationBucket).toBe(construct.sourceBucket);
  expect(construct.destinationBucketInterface).toBe(construct.sourceBucketInterface);
  expect(construct.destinationLoggingBucket).toBe(construct.sourceLoggingBucket);

  const template = Template.fromStack(stack);
  // One bucket and its logging bucket
  template.resourceCountIs('AWS::S3::Bucket', 2);

  // Both environment variables carry the same bucket name
  const variables = environmentVariablesOf(stack, construct.lambdaFunction);
  expect(variables.SOURCE_BUCKET_NAME).toEqual(variables.DESTINATION_BUCKET_NAME);
  expect(variables.SOURCE_BUCKET_NAME).toEqual({ Ref: logicalIdOf(stack, construct.sourceBucket!) });

  // The shared bucket receives a single read and write grant for each of the two principals
  const bucketArn = { 'Fn::GetAtt': [logicalIdOf(stack, construct.sourceBucket!), 'Arn'] };
  [construct.dataAccessRole!, construct.lambdaFunction.role!].forEach(role => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith(['s3:GetObject*', 's3:PutObject']),
            Resource: Match.arrayWith([bucketArn])
          })
        ])
      },
      Roles: [{ Ref: logicalIdOf(stack, role) }]
    });
  });
});

test('Test client supplied existing buckets receive the grants', () => {
  const stack = new Stack(new App(), 'test-stack');

  const existingSourceBucket = defaults.CreateScrapBucket(stack, 'existing-source');
  const existingDestinationBucket = defaults.CreateScrapBucket(stack, 'existing-destination');

  const construct = deployTestConstruct(stack, {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    existingSourceBucketObj: existingSourceBucket,
    existingDestinationBucketObj: existingDestinationBucket
  });

  // The construct created no buckets, so only the interfaces are set
  expect(construct.sourceBucket).toBeUndefined();
  expect(construct.sourceLoggingBucket).toBeUndefined();
  expect(construct.destinationBucket).toBeUndefined();
  expect(construct.destinationLoggingBucket).toBeUndefined();
  expect(construct.sourceBucketInterface).toBe(existingSourceBucket);
  expect(construct.destinationBucketInterface).toBe(existingDestinationBucket);

  const template = Template.fromStack(stack);
  // The two scrap buckets and their two logging buckets, all created by the test
  template.resourceCountIs('AWS::S3::Bucket', 4);

  // Grants are applied to the bucket interface, so existing buckets are covered too
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: Match.arrayWith(['s3:GetObject*']),
          Resource: Match.arrayWith([{ 'Fn::GetAtt': [logicalIdOf(stack, existingSourceBucket), 'Arn'] }])
        }),
        Match.objectLike({
          Action: Match.arrayWith(['s3:PutObject']),
          Resource: Match.arrayWith([{ 'Fn::GetAtt': [logicalIdOf(stack, existingDestinationBucket), 'Arn'] }])
        })
      ])
    },
    Roles: [{ Ref: logicalIdOf(stack, construct.dataAccessRole!) }]
  });

  const variables = environmentVariablesOf(stack, construct.lambdaFunction);
  expect(variables.SOURCE_BUCKET_NAME).toEqual({ Ref: logicalIdOf(stack, existingSourceBucket) });
  expect(variables.DESTINATION_BUCKET_NAME).toEqual({ Ref: logicalIdOf(stack, existingDestinationBucket) });
});

test('Test access logging can be disabled for the source bucket alone', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    logSourceS3AccessLogs: false
  });

  expect(construct.sourceLoggingBucket).toBeUndefined();
  expect(construct.destinationLoggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  // Source, destination and the destination's logging bucket
  template.resourceCountIs('AWS::S3::Bucket', 3);
  const buckets = template.findResources('AWS::S3::Bucket');
  expect(buckets[logicalIdOf(stack, construct.sourceBucket!)].Properties.LoggingConfiguration).toBeUndefined();
  expect(buckets[logicalIdOf(stack, construct.destinationBucket!)].Properties.LoggingConfiguration).toBeDefined();
});

test('Test access logging can be disabled for the destination bucket alone', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    logDestinationS3AccessLogs: false
  });

  expect(construct.sourceLoggingBucket).toBeDefined();
  expect(construct.destinationLoggingBucket).toBeUndefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::S3::Bucket', 3);
  const buckets = template.findResources('AWS::S3::Bucket');
  expect(buckets[logicalIdOf(stack, construct.sourceBucket!)].Properties.LoggingConfiguration).toBeDefined();
  expect(buckets[logicalIdOf(stack, construct.destinationBucket!)].Properties.LoggingConfiguration).toBeUndefined();
});

test('Test bucket and logging bucket props are honoured', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    sourceBucketProps: { versioned: false },
    sourceLoggingBucketProps: { bucketName: 'client-source-log-bucket' },
    destinationBucketProps: { versioned: false },
    destinationLoggingBucketProps: { bucketName: 'client-destination-log-bucket' }
  });

  const buckets = Template.fromStack(stack).findResources('AWS::S3::Bucket');
  expect(buckets[logicalIdOf(stack, construct.sourceBucket!)].Properties.VersioningConfiguration).toBeUndefined();
  expect(buckets[logicalIdOf(stack, construct.destinationBucket!)].Properties.VersioningConfiguration).toBeUndefined();
  expect(buckets[logicalIdOf(stack, construct.sourceLoggingBucket!)].Properties.BucketName).toEqual('client-source-log-bucket');
  expect(buckets[logicalIdOf(stack, construct.destinationLoggingBucket!)].Properties.BucketName)
    .toEqual('client-destination-log-bucket');
});

// ---------------------------------------------------------------------------------------------
// Environment variables and additional permissions
// ---------------------------------------------------------------------------------------------

test('Test the default environment variable names', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, { comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH] });

  const variables = environmentVariablesOf(stack, construct.lambdaFunction);
  expect(variables.SOURCE_BUCKET_NAME).toEqual({ Ref: logicalIdOf(stack, construct.sourceBucket!) });
  expect(variables.DESTINATION_BUCKET_NAME).toEqual({ Ref: logicalIdOf(stack, construct.destinationBucket!) });
  expect(variables.DATA_ACCESS_ROLE_ARN).toEqual({ 'Fn::GetAtt': [logicalIdOf(stack, construct.dataAccessRole!), 'Arn'] });
});

test('Test all three environment variable names can be overridden', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    sourceBucketEnvironmentVariableName: 'CLIENT_SOURCE_BUCKET',
    destinationBucketEnvironmentVariableName: 'CLIENT_DESTINATION_BUCKET',
    dataAccessRoleArnEnvironmentVariableName: 'CLIENT_DATA_ACCESS_ROLE'
  });

  const variables = environmentVariablesOf(stack, construct.lambdaFunction);
  expect(variables.CLIENT_SOURCE_BUCKET).toEqual({ Ref: logicalIdOf(stack, construct.sourceBucket!) });
  expect(variables.CLIENT_DESTINATION_BUCKET).toEqual({ Ref: logicalIdOf(stack, construct.destinationBucket!) });
  expect(variables.CLIENT_DATA_ACCESS_ROLE).toEqual({ 'Fn::GetAtt': [logicalIdOf(stack, construct.dataAccessRole!), 'Arn'] });
  expect(variables.SOURCE_BUCKET_NAME).toBeUndefined();
  expect(variables.DESTINATION_BUCKET_NAME).toBeUndefined();
  expect(variables.DATA_ACCESS_ROLE_ARN).toBeUndefined();
});

test('Test no Comprehend environment variables are set in synchronous mode', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack);

  const variables = environmentVariablesOf(stack, construct.lambdaFunction);
  expect(variables.SOURCE_BUCKET_NAME).toBeUndefined();
  expect(variables.DESTINATION_BUCKET_NAME).toBeUndefined();
  expect(variables.DATA_ACCESS_ROLE_ARN).toBeUndefined();
});

test('Test additionalPermissions are appended to the generated actions and de-duplicated', () => {
  const stack = new Stack(new App(), 'test-stack');

  deployTestConstruct(stack, {
    comprehendUseCases: [ComprehendUseCase.SINGLE_DOCUMENT_SYNC],
    analysisTypes: [ComprehendAnalysisType.SENTIMENT],
    // This narrow selection generates comprehend:DetectSentiment alone, so the second entry
    // collides with a generated action and the third repeats an earlier additional permission
    additionalPermissions: ['comprehend:TagResource', 'comprehend:DetectSentiment', 'comprehend:TagResource']
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          // The additional permission follows the generated action, and both duplicates are dropped
          Action: ['comprehend:DetectSentiment', 'comprehend:TagResource'],
          Resource: '*'
        })
      ])
    }
  });
});

// ---------------------------------------------------------------------------------------------
// VPC scenarios
// ---------------------------------------------------------------------------------------------

test('Test deployVpc creates a Comprehend interface endpoint and no S3 endpoint when synchronous', () => {
  const stack = new Stack(new App(), 'test-stack');

  const construct = deployTestConstruct(stack, { deployVpc: true });

  expect(construct.vpc).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: {
      'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.comprehend']]
    }
  });
  template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
  // The function runs in the VPC, so it has ENIs in the isolated subnets
  template.hasResourceProperties('AWS::Lambda::Function', {
    VpcConfig: {
      SubnetIds: Match.anyValue(),
      SecurityGroupIds: Match.anyValue()
    }
  });
});

test('Test deployVpc adds the S3 gateway endpoint when ASYNC_BATCH is selected', () => {
  const stack = new Stack(new App(), 'test-stack');

  deployTestConstruct(stack, {
    deployVpc: true,
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    analysisTypes: [ComprehendAnalysisType.PII]
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::EC2::VPCEndpoint', 2);
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: {
      'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.s3']]
    }
  });
});

test('Test an existing VPC is used and receives the Comprehend endpoint', () => {
  const stack = new Stack(new App(), 'test-stack');

  const existingVpc = defaults.getTestVpc(stack);
  const construct = deployTestConstruct(stack, { existingVpc });

  expect(construct.vpc).toBe(existingVpc);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    ServiceName: {
      'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.comprehend']]
    }
  });
});

test('Test vpcProps are honoured when deployVpc is true', () => {
  const stack = new Stack(new App(), 'test-stack');

  deployTestConstruct(stack, {
    deployVpc: true,
    vpcProps: {
      ipAddresses: ec2.IpAddresses.cidr('172.168.0.0/16')
    }
  });

  Template.fromStack(stack).hasResourceProperties('AWS::EC2::VPC', {
    CidrBlock: '172.168.0.0/16'
  });
});

test('Test the asynchronous jobs in a VPC warning', () => {
  const consoleLogSpy = jest.spyOn(console, 'log');

  const asyncStack = new Stack(new App(), 'async-stack');
  deployTestConstruct(asyncStack, { deployVpc: true, comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH] });
  expect(vpcWarningEmitted(consoleLogSpy)).toBe(true);

  consoleLogSpy.mockClear();

  // A synchronous deployment in a VPC stages nothing in S3, so the warning does not apply
  const syncStack = new Stack(new App(), 'sync-stack');
  deployTestConstruct(syncStack, { deployVpc: true });
  expect(vpcWarningEmitted(consoleLogSpy)).toBe(false);

  consoleLogSpy.mockClear();

  // Neither does an asynchronous deployment outside a VPC
  const noVpcStack = new Stack(new App(), 'no-vpc-stack');
  deployTestConstruct(noVpcStack, { comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH] });
  expect(vpcWarningEmitted(consoleLogSpy)).toBe(false);

  consoleLogSpy.mockRestore();
});

// ---------------------------------------------------------------------------------------------
// Validation errors
//
// A construct that throws has already claimed its id in the tree, because super() runs before the
// validators, so each failing instantiation needs its own stack rather than sharing one
// ---------------------------------------------------------------------------------------------

test('Test the construct calls CheckLambdaProps', () => {
  const stack = new Stack(new App(), 'test-stack');

  const app = () => {
    deployTestConstruct(stack, { existingLambdaObj: createTestLambdaFunction(stack, 'existing-function') });
  };

  expect(app).toThrow('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});

test('Test an existing Lambda function cannot be added to a VPC', () => {
  const stack = new Stack(new App(), 'test-stack');

  const app = () => {
    new LambdaToComprehend(stack, 'test-lambda-comprehend', {
      existingLambdaObj: createTestLambdaFunction(stack, 'existing-function'),
      deployVpc: true
    });
  };

  expect(app).toThrow('A Lambda function must be bound to a VPC upon creation, it cannot be added to a VPC in a '
    + 'subsequent construct');
});

test('Test the construct calls CheckComprehendProps', () => {
  const stack = new Stack(new App(), 'test-stack');

  const app = () => {
    deployTestConstruct(stack, { comprehendUseCases: [] });
  };

  expect(app).toThrow('Error - comprehendUseCases cannot be an empty array. Omit the property to accept the default, '
    + 'or supply at least one ComprehendUseCase.\n');
});

test('Test an empty analysisTypes array is rejected', () => {
  const stack = new Stack(new App(), 'test-stack');

  const app = () => {
    deployTestConstruct(stack, { analysisTypes: [] });
  };

  expect(app).toThrow('Error - analysisTypes cannot be an empty array. Omit the property to accept the default, '
    + 'or supply at least one ComprehendAnalysisType.\n');
});

test('Test every Comprehend error is reported in a single throw', () => {
  const stack = new Stack(new App(), 'test-stack');

  const app = () => {
    deployTestConstruct(stack, { comprehendUseCases: [], analysisTypes: [] });
  };

  expect(app).toThrow('Error - comprehendUseCases cannot be an empty array. Omit the property to accept the default, '
    + 'or supply at least one ComprehendUseCase.\n'
    + 'Error - analysisTypes cannot be an empty array. Omit the property to accept the default, '
    + 'or supply at least one ComprehendAnalysisType.\n');
});

test('Test asynchronous only properties are rejected without ASYNC_BATCH', () => {
  const asyncOnlyProps = [
    { sourceBucketProps: { versioned: false } },
    { logSourceS3AccessLogs: false },
    { destinationBucketProps: { versioned: false } },
    { logDestinationS3AccessLogs: false },
    { useSameBucket: true },
    { sourceBucketEnvironmentVariableName: 'CLIENT_SOURCE_BUCKET' },
    { destinationBucketEnvironmentVariableName: 'CLIENT_DESTINATION_BUCKET' },
    { dataAccessRoleArnEnvironmentVariableName: 'CLIENT_DATA_ACCESS_ROLE' }
  ];

  asyncOnlyProps.forEach((props, index) => {
    const stack = new Stack(new App(), `async-only-stack-${index}`);
    expect(() => {
      deployTestConstruct(stack, props);
    }).toThrow('Error - bucket and environment variable name properties can only be provided when comprehendUseCases '
      + 'includes ComprehendUseCase.ASYNC_BATCH.\n');
  });
});

test('Test destination bucket properties are rejected with useSameBucket', () => {
  const stack = new Stack(new App(), 'test-stack');

  const app = () => {
    deployTestConstruct(stack, {
      comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
      useSameBucket: true,
      destinationBucketProps: { versioned: false }
    });
  };

  expect(app).toThrow('Error - destination bucket properties cannot be provided when useSameBucket is true.\n');
});

test('Test the construct calls CheckS3Props for the source bucket', () => {
  const stack = new Stack(new App(), 'test-stack');

  const app = () => {
    deployTestConstruct(stack, {
      comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
      analysisTypes: [ComprehendAnalysisType.ENTITIES],
      existingSourceBucketObj: defaults.CreateScrapBucket(stack, 'existing-source'),
      sourceBucketProps: { versioned: false }
    });
  };

  expect(app).toThrow('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});

test('Test the construct calls CheckS3Props for the destination bucket', () => {
  const stack = new Stack(new App(), 'test-stack');

  const app = () => {
    deployTestConstruct(stack, {
      comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
      analysisTypes: [ComprehendAnalysisType.ENTITIES],
      existingDestinationBucketObj: defaults.CreateScrapBucket(stack, 'existing-destination'),
      destinationBucketProps: { versioned: false }
    });
  };

  expect(app).toThrow('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});

test('Test the construct calls CheckVpcProps', () => {
  const stack = new Stack(new App(), 'test-stack');

  const app = () => {
    deployTestConstruct(stack, { deployVpc: true, existingVpc: defaults.getTestVpc(stack) });
  };

  expect(app).toThrow('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Test the construct calls ValidateVpcProps', () => {
  const stack = new Stack(new App(), 'test-stack');

  const app = () => {
    deployTestConstruct(stack, { deployVpc: true, vpcProps: { invalidProperty: true } });
  };

  expect(app).toThrow(/ERROR - invalidProperty is not a valid property of VpcProps/);
});
