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

import { App, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { LambdaToPolly, LambdaToPollyProps } from '../lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import { generateIntegStackName, SetConsistentFeatureFlags, CreateScrapBucket } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);

// Create existing bucket and topic
const existingBucket = CreateScrapBucket(stack, 'existing-bucket', {
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true
});
const existingTopic = new sns.Topic(stack, 'ExistingTopic', {
  topicName: 'existing-polly-topic',
  masterKey: kms.Alias.fromAliasName(stack, 'SnsKey', 'alias/aws/sns')
});

const props: LambdaToPollyProps = {
  lambdaFunctionProps: {
    code: new lambda.InlineCode('exports.handler = async (event) => { console.log(event); return {\'statusCode\': 200, \'body\': \'\'}; }'),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  },
  asyncJobs: true,
  existingBucketObj: existingBucket,
  existingTopicObj: existingTopic
};

new LambdaToPolly(stack, 'test-lambda-polly-async-existing', props);

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
