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

// Imports
import { KinesisStreamsToLambda, KinesisStreamsToLambdaProps } from '../lib';
import { Stack, App, Aws } from 'aws-cdk-lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { addCfnGuardSuppressRules, generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-kinesisstreams-lambda';

const lambdaRole = new iam.Role(stack, 'test-role', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  inlinePolicies: {
    LambdaFunctionServiceRolePolicy: new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resources: [`arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:/aws/lambda/*`]
      })]
    })
  }
});
addCfnGuardSuppressRules(lambdaRole, ["IAM_NO_INLINE_POLICY_CHECK"]);

const lambdaFn = new lambda.Function(stack, 'test-fn', {
  runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  role: lambdaRole,
});

const cfnLambdafunction: lambda.CfnFunction = lambdaFn.node.findChild('Resource') as lambda.CfnFunction;

cfnLambdafunction.cfnOptions.metadata = {
  cfn_nag: {
    rules_to_suppress: [{
      id: 'W89',
      reason: `This is not a rule for the general case, just for specific use cases/industries`
    },
    {
      id: 'W92',
      reason: `Impossible for us to define the correct concurrency for clients`
    }]
  }
};

const stream = new kinesis.Stream(stack, 'test-stream', {
  shardCount: 2,
  encryption: kinesis.StreamEncryption.MANAGED
});

// Definitions
const props: KinesisStreamsToLambdaProps = {
  existingStreamObj: stream,
  existingLambdaObj: lambdaFn,
  kinesisEventSourceProps: {
    startingPosition: lambda.StartingPosition.LATEST,
    batchSize: 1
  },
};

new KinesisStreamsToLambda(stack, 'test-ks-lambda', props);

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
