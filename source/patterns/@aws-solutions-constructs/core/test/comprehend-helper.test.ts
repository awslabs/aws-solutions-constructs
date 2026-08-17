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

import * as defaults from "../index";
import { CreateScrapBucket } from "./test-helper";
import { App, CfnElement, Stack } from "aws-cdk-lib";
import { IConstruct } from "constructs";
import * as iam from 'aws-cdk-lib/aws-iam';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ComprehendAnalysisType, ComprehendUseCase } from "../lib/comprehend-helper";

// The helper grants permissions to a grantee rather than creating one, so the tests supply a role
function createGrantee(stack: Stack, id: string): iam.Role {
  return new iam.Role(stack, id, {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
  });
}

// Resolves a construct's CloudFormation logical id so assertions can name the exact resource
// rather than matching a pattern that a second resource could also satisfy
function logicalIdOf(stack: Stack, resource: IConstruct): string {
  return stack.resolve((resource.node.defaultChild as CfnElement).logicalId);
}

const DEFAULT_ACTIONS = [
  'comprehend:DetectDominantLanguage',
  'comprehend:DetectEntities',
  'comprehend:DetectKeyPhrases',
  'comprehend:DetectSentiment',
  'comprehend:DetectTargetedSentiment',
  'comprehend:DetectSyntax',
  'comprehend:DetectPiiEntities',
  'comprehend:ContainsPiiEntities',
  'comprehend:BatchDetectDominantLanguage',
  'comprehend:BatchDetectEntities',
  'comprehend:BatchDetectKeyPhrases',
  'comprehend:BatchDetectSentiment',
  'comprehend:BatchDetectTargetedSentiment',
  'comprehend:BatchDetectSyntax'
];

// ---------------------------
// Action generation
// ---------------------------
test('Test default selection generates exactly the fourteen synchronous actions in order', () => {
  const stack = new Stack();

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {}, createGrantee(stack, 'grantee'));

  expect(configuration.lambdaIamActionsRequired).toEqual(DEFAULT_ACTIONS);
  expect(configuration.lambdaIamActionsRequired).toHaveLength(14);
  expect(configuration.environmentVariables).toHaveLength(0);
  expect(configuration.dataAccessRole).toBeUndefined();
  expect(configuration.sourceBucket).toBeUndefined();
  expect(configuration.destinationBucket).toBeUndefined();

  // No S3 bucket and no data access role in synchronous mode
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::S3::Bucket', 0);
  template.resourceCountIs('AWS::IAM::Role', 1);
});

test('Test SINGLE_DOCUMENT_SYNC alone generates the eight Detect actions', () => {
  const stack = new Stack();

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.SINGLE_DOCUMENT_SYNC]
  }, createGrantee(stack, 'grantee'));

  expect(configuration.lambdaIamActionsRequired).toEqual([
    'comprehend:DetectDominantLanguage',
    'comprehend:DetectEntities',
    'comprehend:DetectKeyPhrases',
    'comprehend:DetectSentiment',
    'comprehend:DetectTargetedSentiment',
    'comprehend:DetectSyntax',
    'comprehend:DetectPiiEntities',
    'comprehend:ContainsPiiEntities'
  ]);
});

test('Test MULTI_DOCUMENT_SYNC alone generates six BatchDetect actions - there is no batch PII action', () => {
  const stack = new Stack();

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.MULTI_DOCUMENT_SYNC]
  }, createGrantee(stack, 'grantee'));

  expect(configuration.lambdaIamActionsRequired).toEqual([
    'comprehend:BatchDetectDominantLanguage',
    'comprehend:BatchDetectEntities',
    'comprehend:BatchDetectKeyPhrases',
    'comprehend:BatchDetectSentiment',
    'comprehend:BatchDetectTargetedSentiment',
    'comprehend:BatchDetectSyntax'
  ]);
});

test('Test ASYNC_BATCH alone generates four actions for each of six job families - there is no syntax job', () => {
  const stack = new Stack();

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH]
  }, createGrantee(stack, 'grantee'));

  expect(configuration.lambdaIamActionsRequired).toEqual([
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
  ]);
  expect(configuration.lambdaIamActionsRequired).toHaveLength(24);
});

test('Test all three use cases and all analysis types generate thirty-eight actions', () => {
  const stack = new Stack();

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [
      ComprehendUseCase.SINGLE_DOCUMENT_SYNC,
      ComprehendUseCase.MULTI_DOCUMENT_SYNC,
      ComprehendUseCase.ASYNC_BATCH
    ]
  }, createGrantee(stack, 'grantee'));

  expect(configuration.lambdaIamActionsRequired).toHaveLength(38);
  // Synchronous actions come first, then batch, then asynchronous
  expect(configuration.lambdaIamActionsRequired.slice(0, 14)).toEqual(DEFAULT_ACTIONS);
  expect(configuration.lambdaIamActionsRequired).not.toContain('comprehend:TagResource');
});

test('Test each analysis type in isolation', () => {
  const testCases = [
    { analysisType: ComprehendAnalysisType.DOMINANT_LANGUAGE, expected: ['comprehend:DetectDominantLanguage', 'comprehend:BatchDetectDominantLanguage'] },
    { analysisType: ComprehendAnalysisType.ENTITIES, expected: ['comprehend:DetectEntities', 'comprehend:BatchDetectEntities'] },
    { analysisType: ComprehendAnalysisType.KEY_PHRASES, expected: ['comprehend:DetectKeyPhrases', 'comprehend:BatchDetectKeyPhrases'] },
    { analysisType: ComprehendAnalysisType.SENTIMENT, expected: ['comprehend:DetectSentiment', 'comprehend:BatchDetectSentiment'] },
    { analysisType: ComprehendAnalysisType.TARGETED_SENTIMENT, expected: ['comprehend:DetectTargetedSentiment', 'comprehend:BatchDetectTargetedSentiment'] },
    { analysisType: ComprehendAnalysisType.SYNTAX, expected: ['comprehend:DetectSyntax', 'comprehend:BatchDetectSyntax'] },
    { analysisType: ComprehendAnalysisType.PII, expected: ['comprehend:DetectPiiEntities', 'comprehend:ContainsPiiEntities'] }
  ];

  testCases.forEach((testCase, index) => {
    const stack = new Stack();
    const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
      analysisTypes: [testCase.analysisType]
    }, createGrantee(stack, `grantee${index}`));

    expect(configuration.lambdaIamActionsRequired).toEqual(testCase.expected);
  });
});

test('Test action list is independent of the order of the client supplied arrays', () => {
  const firstStack = new Stack();
  const secondStack = new Stack();

  const firstConfiguration = defaults.ConfigureComprehendSupport(firstStack, 'test', {
    comprehendUseCases: [ComprehendUseCase.MULTI_DOCUMENT_SYNC, ComprehendUseCase.SINGLE_DOCUMENT_SYNC],
    analysisTypes: [ComprehendAnalysisType.PII, ComprehendAnalysisType.ENTITIES, ComprehendAnalysisType.SYNTAX]
  }, createGrantee(firstStack, 'grantee'));

  const secondConfiguration = defaults.ConfigureComprehendSupport(secondStack, 'test', {
    comprehendUseCases: [ComprehendUseCase.SINGLE_DOCUMENT_SYNC, ComprehendUseCase.MULTI_DOCUMENT_SYNC],
    analysisTypes: [ComprehendAnalysisType.SYNTAX, ComprehendAnalysisType.ENTITIES, ComprehendAnalysisType.PII]
  }, createGrantee(secondStack, 'grantee'));

  expect(firstConfiguration.lambdaIamActionsRequired).toEqual(secondConfiguration.lambdaIamActionsRequired);
  expect(firstConfiguration.lambdaIamActionsRequired).toEqual([
    'comprehend:DetectEntities',
    'comprehend:DetectSyntax',
    'comprehend:DetectPiiEntities',
    'comprehend:ContainsPiiEntities',
    'comprehend:BatchDetectEntities',
    'comprehend:BatchDetectSyntax'
  ]);
});

test('Test duplicate members are de-duplicated without an error', () => {
  const stack = new Stack();

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.SINGLE_DOCUMENT_SYNC, ComprehendUseCase.SINGLE_DOCUMENT_SYNC],
    analysisTypes: [ComprehendAnalysisType.SENTIMENT, ComprehendAnalysisType.SENTIMENT]
  }, createGrantee(stack, 'grantee'));

  expect(configuration.lambdaIamActionsRequired).toEqual(['comprehend:DetectSentiment']);
});

// ---------------------------
// Selection resolution
// ---------------------------
test('Test resolveComprehendSelection applies the documented defaults', () => {
  const selection = defaults.resolveComprehendSelection({});

  expect(selection.useCases).toEqual([
    ComprehendUseCase.SINGLE_DOCUMENT_SYNC,
    ComprehendUseCase.MULTI_DOCUMENT_SYNC
  ]);
  expect(selection.analysisTypes).toEqual([
    ComprehendAnalysisType.DOMINANT_LANGUAGE,
    ComprehendAnalysisType.ENTITIES,
    ComprehendAnalysisType.KEY_PHRASES,
    ComprehendAnalysisType.SENTIMENT,
    ComprehendAnalysisType.TARGETED_SENTIMENT,
    ComprehendAnalysisType.SYNTAX,
    ComprehendAnalysisType.PII
  ]);
});

test('Test resolveComprehendSelection de-duplicates preserving first seen order', () => {
  const selection = defaults.resolveComprehendSelection({
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH, ComprehendUseCase.SINGLE_DOCUMENT_SYNC, ComprehendUseCase.ASYNC_BATCH],
    analysisTypes: [ComprehendAnalysisType.PII, ComprehendAnalysisType.PII, ComprehendAnalysisType.ENTITIES]
  });

  expect(selection.useCases).toEqual([ComprehendUseCase.ASYNC_BATCH, ComprehendUseCase.SINGLE_DOCUMENT_SYNC]);
  expect(selection.analysisTypes).toEqual([ComprehendAnalysisType.PII, ComprehendAnalysisType.ENTITIES]);
});

// ---------------------------
// Asynchronous resources
// ---------------------------
test('Test ASYNC_BATCH creates two buckets, two logging buckets and a data access role', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH]
  }, createGrantee(stack, 'grantee'));

  expect(configuration.sourceBucket?.bucket).toBeDefined();
  expect(configuration.sourceBucket?.bucketInterface).toBeDefined();
  expect(configuration.sourceBucket?.loggingBucket).toBeDefined();
  expect(configuration.destinationBucket?.bucket).toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBeDefined();
  expect(configuration.destinationBucket?.loggingBucket).toBeDefined();
  expect(configuration.dataAccessRole).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::S3::Bucket', 4); // 2 main buckets + 2 logging buckets

  // The data access role trusts Comprehend, conditioned on the deploying account
  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: 'sts:AssumeRole',
          Principal: {
            Service: 'comprehend.amazonaws.com'
          },
          Condition: {
            StringEquals: {
              'aws:SourceAccount': {
                Ref: 'AWS::AccountId'
              }
            }
          }
        })
      ])
    }
  });

  // No KMS permission is granted to the data access role
  const policies = template.findResources('AWS::IAM::Policy');
  Object.keys(policies).forEach(policyKey => {
    expect(JSON.stringify(policies[policyKey])).not.toContain('kms:');
  });
});

test('Test ASYNC_BATCH grants the data access role read on source and read/write on destination', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH]
  }, createGrantee(stack, 'grantee'));

  const sourceBucketId = logicalIdOf(stack, configuration.sourceBucket!.bucket!);
  const destinationBucketId = logicalIdOf(stack, configuration.destinationBucket!.bucket!);

  // The policy carrying the S3 grants must be the one attached to the data access role. Each
  // statement is pinned to its own bucket so that granting the two buckets the wrong way round
  // fails here rather than only in the construct's own tests
  Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        // Read on the source bucket
        Match.objectLike({
          Effect: 'Allow',
          Action: [
            's3:GetObject*',
            's3:GetBucket*',
            's3:List*'
          ],
          Resource: Match.arrayWith([{ 'Fn::GetAtt': [sourceBucketId, 'Arn'] }])
        }),
        // Read and write on the destination bucket
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            's3:DeleteObject*',
            's3:PutObject',
            's3:Abort*'
          ]),
          Resource: Match.arrayWith([{ 'Fn::GetAtt': [destinationBucketId, 'Arn'] }])
        })
      ])
    },
    Roles: [{
      Ref: logicalIdOf(stack, configuration.dataAccessRole!)
    }]
  });
});

test('Test ASYNC_BATCH grants the grantee read/write on source and read on destination', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const grantee = createGrantee(stack, 'grantee');

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH]
  }, grantee);

  const sourceBucketId = logicalIdOf(stack, configuration.sourceBucket!.bucket!);
  const destinationBucketId = logicalIdOf(stack, configuration.destinationBucket!.bucket!);

  // The grantee's grants are the mirror image of the data access role's: the client writes the
  // input documents and reads the results, while Comprehend reads the input and writes the
  // results. Each statement is pinned to its own bucket so the mirror cannot be inverted
  Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        // Read and write on the source bucket
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            's3:DeleteObject*',
            's3:PutObject',
            's3:Abort*'
          ]),
          Resource: Match.arrayWith([{ 'Fn::GetAtt': [sourceBucketId, 'Arn'] }])
        }),
        // Read on the destination bucket
        Match.objectLike({
          Effect: 'Allow',
          Action: [
            's3:GetObject*',
            's3:GetBucket*',
            's3:List*'
          ],
          Resource: Match.arrayWith([{ 'Fn::GetAtt': [destinationBucketId, 'Arn'] }])
        })
      ])
    },
    Roles: [{ Ref: logicalIdOf(stack, grantee) }]
  });
});

test('Test ASYNC_BATCH grants the grantee iam:PassRole conditioned on iam:PassedToService', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH]
  }, createGrantee(stack, 'grantee'));

  Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: 'iam:PassRole',
          Condition: {
            StringEquals: {
              'iam:PassedToService': 'comprehend.amazonaws.com'
            }
          }
        })
      ])
    }
  });
});

test('Test ASYNC_BATCH returns the three environment variable definitions', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH]
  }, createGrantee(stack, 'grantee'));

  expect(configuration.environmentVariables).toHaveLength(3);
  expect(configuration.environmentVariables[0].defaultName).toEqual('SOURCE_BUCKET_NAME');
  expect(configuration.environmentVariables[0].clientNameOverride).toBeUndefined();
  expect(configuration.environmentVariables[1].defaultName).toEqual('DESTINATION_BUCKET_NAME');
  expect(configuration.environmentVariables[1].clientNameOverride).toBeUndefined();
  expect(configuration.environmentVariables[2].defaultName).toEqual('DATA_ACCESS_ROLE_ARN');
  expect(configuration.environmentVariables[2].clientNameOverride).toBeUndefined();
  expect(configuration.environmentVariables[2].value).toEqual(configuration.dataAccessRole?.roleArn);
});

test('Test environment variable name overrides are carried through', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    sourceBucketEnvironmentVariableName: 'MY_SOURCE',
    destinationBucketEnvironmentVariableName: 'MY_DESTINATION',
    dataAccessRoleArnEnvironmentVariableName: 'MY_ROLE'
  }, createGrantee(stack, 'grantee'));

  expect(configuration.environmentVariables[0].clientNameOverride).toEqual('MY_SOURCE');
  expect(configuration.environmentVariables[1].clientNameOverride).toEqual('MY_DESTINATION');
  expect(configuration.environmentVariables[2].clientNameOverride).toEqual('MY_ROLE');
});

test('Test useSameBucket collapses to a single bucket serving both roles', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const grantee = createGrantee(stack, 'grantee');

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    useSameBucket: true
  }, grantee);

  expect(configuration.destinationBucket?.bucket).toBe(configuration.sourceBucket?.bucket);
  expect(configuration.destinationBucket?.bucketInterface).toBe(configuration.sourceBucket?.bucketInterface);
  expect(configuration.environmentVariables[0].value).toEqual(configuration.environmentVariables[1].value);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::S3::Bucket', 2); // 1 main bucket + 1 logging bucket

  // Both principals need read and write on the single bucket, because it carries the job input
  // and receives the job output. The read-only grants of the two bucket path would break here
  const bucketArn = { 'Fn::GetAtt': [logicalIdOf(stack, configuration.sourceBucket!.bucket!), 'Arn'] };
  [configuration.dataAccessRole!, grantee].forEach(principal => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith([
              's3:GetObject*',
              's3:DeleteObject*',
              's3:PutObject',
              's3:Abort*'
            ]),
            Resource: Match.arrayWith([bucketArn])
          })
        ])
      },
      Roles: [{ Ref: logicalIdOf(stack, principal) }]
    });
  });
});

test('Test useSameBucket with an existing source bucket reuses that bucket as the destination', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const existingSourceBucket = CreateScrapBucket(stack, 'existing-source');

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    existingSourceBucketObj: existingSourceBucket,
    useSameBucket: true
  }, createGrantee(stack, 'grantee'));

  // The client's bucket serves both roles, so the helper creates no bucket of its own and both
  // bucket environment variables resolve to the same name
  expect(configuration.sourceBucket?.bucketInterface).toBe(existingSourceBucket);
  expect(configuration.destinationBucket?.bucketInterface).toBe(existingSourceBucket);
  expect(configuration.sourceBucket?.bucket).toBeUndefined();
  expect(configuration.destinationBucket?.bucket).toBeUndefined();
  expect(configuration.environmentVariables[0].value).toEqual(configuration.environmentVariables[1].value);

  const template = Template.fromStack(stack);
  // Only the scrap bucket and its own log bucket - the helper created neither a second main
  // bucket nor a logging bucket, because it does not own the bucket it was handed
  template.resourceCountIs('AWS::S3::Bucket', 2);

  // The single bucket is granted read *and* write to the data access role. The read-only source
  // grant of the two bucket case would leave Comprehend unable to write its job output here
  const existingBucketArn = { 'Fn::GetAtt': [logicalIdOf(stack, existingSourceBucket), 'Arn'] };
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            's3:GetObject*',
            's3:DeleteObject*',
            's3:PutObject',
            's3:Abort*'
          ]),
          Resource: Match.arrayWith([existingBucketArn])
        })
      ])
    },
    Roles: [{
      Ref: logicalIdOf(stack, configuration.dataAccessRole!)
    }]
  });
});

test('Test existing buckets are used and receive grants against the bucket interface', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const existingSourceBucket = CreateScrapBucket(stack, 'existing-source');
  const existingDestinationBucket = CreateScrapBucket(stack, 'existing-destination');

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    existingSourceBucketObj: existingSourceBucket,
    existingDestinationBucketObj: existingDestinationBucket
  }, createGrantee(stack, 'grantee'));

  expect(configuration.sourceBucket?.bucket).toBeUndefined();
  expect(configuration.sourceBucket?.bucketInterface).toBe(existingSourceBucket);
  expect(configuration.sourceBucket?.loggingBucket).toBeUndefined();
  expect(configuration.destinationBucket?.bucket).toBeUndefined();
  expect(configuration.destinationBucket?.bucketInterface).toBe(existingDestinationBucket);
  expect(configuration.destinationBucket?.loggingBucket).toBeUndefined();

  const template = Template.fromStack(stack);
  // Only the two scrap buckets and their log buckets - the helper created none
  template.resourceCountIs('AWS::S3::Bucket', 4);

  // The grantee received a policy naming the existing source bucket
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Resource: Match.arrayWith([
            Match.objectLike({
              'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('existingsource.*')])
            })
          ])
        })
      ])
    }
  });
});

test('Test access logging can be disabled per bucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    logSourceS3AccessLogs: false,
    logDestinationS3AccessLogs: true
  }, createGrantee(stack, 'grantee'));

  expect(configuration.sourceBucket?.loggingBucket).toBeUndefined();
  expect(configuration.destinationBucket?.loggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::S3::Bucket', 3); // 2 main buckets + 1 logging bucket
});

test('Test logging bucket props are honoured', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    sourceLoggingBucketProps: { bucketName: 'my-source-log-bucket' },
    destinationLoggingBucketProps: { bucketName: 'my-destination-log-bucket' }
  }, createGrantee(stack, 'grantee'));

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: 'my-source-log-bucket'
  });
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: 'my-destination-log-bucket'
  });
});

test('Test bucket props are honoured', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  defaults.ConfigureComprehendSupport(stack, 'test', {
    comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
    sourceBucketProps: { bucketName: 'my-source-bucket' },
    destinationBucketProps: { bucketName: 'my-destination-bucket' }
  }, createGrantee(stack, 'grantee'));

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: 'my-source-bucket'
  });
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: 'my-destination-bucket'
  });
});

// ---------------------------
// Prop Tests
// ---------------------------
test('Test no error is thrown for the default props', () => {
  const app = () => {
    defaults.CheckComprehendProps({});
  };

  expect(app).not.toThrow();
});

test('Test fail Comprehend check with an empty comprehendUseCases array', () => {
  const app = () => {
    defaults.CheckComprehendProps({ comprehendUseCases: [] });
  };

  expect(app).toThrow('Error - comprehendUseCases cannot be an empty array. Omit the property to accept the default, '
    + 'or supply at least one ComprehendUseCase.\n');
});

test('Test fail Comprehend check with an empty analysisTypes array', () => {
  const app = () => {
    defaults.CheckComprehendProps({ analysisTypes: [] });
  };

  expect(app).toThrow('Error - analysisTypes cannot be an empty array. Omit the property to accept the default, '
    + 'or supply at least one ComprehendAnalysisType.\n');
});

test('Test fail Comprehend check with MULTI_DOCUMENT_SYNC and PII - there is no batch PII action', () => {
  const app = () => {
    defaults.CheckComprehendProps({
      comprehendUseCases: [ComprehendUseCase.MULTI_DOCUMENT_SYNC],
      analysisTypes: [ComprehendAnalysisType.PII]
    });
  };

  expect(app).toThrow('Error - the analysisTypes value PII produces no Amazon Comprehend actions for any of the '
    + 'selected comprehendUseCases. Remove it, or add a use case that supports it.\n');
});

test('Test fail Comprehend check with ASYNC_BATCH and SYNTAX - there is no syntax detection job', () => {
  const app = () => {
    defaults.CheckComprehendProps({
      comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
      analysisTypes: [ComprehendAnalysisType.SYNTAX]
    });
  };

  expect(app).toThrow('Error - the analysisTypes value SYNTAX produces no Amazon Comprehend actions for any of the '
    + 'selected comprehendUseCases. Remove it, or add a use case that supports it.\n');
});

test('Test a selection spanning both gaps is accepted', () => {
  const app = () => {
    defaults.CheckComprehendProps({
      comprehendUseCases: [ComprehendUseCase.MULTI_DOCUMENT_SYNC, ComprehendUseCase.ASYNC_BATCH],
      analysisTypes: [ComprehendAnalysisType.SYNTAX, ComprehendAnalysisType.PII]
    });
  };

  expect(app).not.toThrow();
});

test('Test every Comprehend error is reported in a single thrown error', () => {
  const app = () => {
    defaults.CheckComprehendProps({
      comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
      analysisTypes: [ComprehendAnalysisType.SYNTAX],
      useSameBucket: true,
      destinationBucketProps: { bucketName: 'my-destination-bucket' }
    });
  };

  expect(app).toThrow('Error - the analysisTypes value SYNTAX produces no Amazon Comprehend actions for any of the '
    + 'selected comprehendUseCases. Remove it, or add a use case that supports it.\n'
    + 'Error - destination bucket properties cannot be provided when useSameBucket is true.\n');
});

test('Test fail Comprehend check with async only props and no ASYNC_BATCH', () => {
  const asyncOnlyProps: defaults.ComprehendProps[] = [
    { sourceBucketProps: { bucketName: 'my-bucket' } },
    { sourceLoggingBucketProps: { bucketName: 'my-bucket' } },
    { logSourceS3AccessLogs: false },
    { destinationBucketProps: { bucketName: 'my-bucket' } },
    { destinationLoggingBucketProps: { bucketName: 'my-bucket' } },
    { logDestinationS3AccessLogs: false },
    { useSameBucket: true },
    { sourceBucketEnvironmentVariableName: 'MY_SOURCE' },
    { destinationBucketEnvironmentVariableName: 'MY_DESTINATION' },
    { dataAccessRoleArnEnvironmentVariableName: 'MY_ROLE' }
  ];

  asyncOnlyProps.forEach(props => {
    const app = () => {
      defaults.CheckComprehendProps(props);
    };

    expect(app).toThrow('Error - bucket and environment variable name properties can only be provided when '
      + 'comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.\n');
  });
});

test('Test fail Comprehend check with an existing bucket and no ASYNC_BATCH', () => {
  const stack = new Stack();

  const app = () => {
    defaults.CheckComprehendProps({
      existingSourceBucketObj: CreateScrapBucket(stack, 'existing-source')
    });
  };

  expect(app).toThrow('Error - bucket and environment variable name properties can only be provided when '
    + 'comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.\n');
});

test('Test fail Comprehend check with an existing destination bucket and no ASYNC_BATCH', () => {
  const stack = new Stack();

  const app = () => {
    defaults.CheckComprehendProps({
      existingDestinationBucketObj: CreateScrapBucket(stack, 'existing-destination')
    });
  };

  expect(app).toThrow('Error - bucket and environment variable name properties can only be provided when '
    + 'comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.\n');
});

test('Test fail Comprehend check with destination props and useSameBucket', () => {
  const stack = new Stack();

  const destinationProps: defaults.ComprehendProps[] = [
    { destinationBucketProps: { bucketName: 'my-bucket' } },
    { destinationLoggingBucketProps: { bucketName: 'my-bucket' } },
    { logDestinationS3AccessLogs: false },
    { existingDestinationBucketObj: CreateScrapBucket(stack, 'existing-destination') }
  ];

  destinationProps.forEach(props => {
    const app = () => {
      defaults.CheckComprehendProps({
        comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
        useSameBucket: true,
        ...props
      });
    };

    expect(app).toThrow('Error - destination bucket properties cannot be provided when useSameBucket is true.\n');
  });
});

test('Test ASYNC_BATCH alone is accepted with the default analysis types, whose SYNTAX gap is skipped', () => {
  const app = () => {
    defaults.CheckComprehendProps({ comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH] });
  };

  expect(app).not.toThrow();
});

test('Test MULTI_DOCUMENT_SYNC alone is accepted with the default analysis types, whose PII gap is skipped', () => {
  const app = () => {
    defaults.CheckComprehendProps({ comprehendUseCases: [ComprehendUseCase.MULTI_DOCUMENT_SYNC] });
  };

  expect(app).not.toThrow();
});

test('Test an existing source bucket is accepted with useSameBucket - only destination props conflict', () => {
  const app = () => {
    defaults.CheckComprehendProps({
      comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
      existingSourceBucketObj: CreateScrapBucket(new Stack(new App(), 'test-stack'), 'existing-source'),
      useSameBucket: true
    });
  };

  expect(app).not.toThrow();
});

test('Test async props are accepted when ASYNC_BATCH is selected', () => {
  const app = () => {
    defaults.CheckComprehendProps({
      comprehendUseCases: [ComprehendUseCase.ASYNC_BATCH],
      analysisTypes: [ComprehendAnalysisType.ENTITIES],
      sourceBucketProps: { bucketName: 'my-source-bucket' },
      destinationBucketProps: { bucketName: 'my-destination-bucket' },
      logSourceS3AccessLogs: false,
      logDestinationS3AccessLogs: false,
      sourceBucketEnvironmentVariableName: 'MY_SOURCE',
      destinationBucketEnvironmentVariableName: 'MY_DESTINATION',
      dataAccessRoleArnEnvironmentVariableName: 'MY_ROLE'
    });
  };

  expect(app).not.toThrow();
});
