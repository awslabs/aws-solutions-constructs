/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Stack, Duration, App} from '@aws-cdk/core';
import { LambdaToSagemakerEndpoint, LambdaToSagemakerEndpointProps } from '../lib';
import * as defaults from '@aws-solutions-constructs/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { getSagemakerModel } from './test-helper';

// Setup
const app = new App();
const stack = new Stack(app, 'test-lambda-sagemakerendpoint');
stack.templateOptions.description = 'Integration Test for aws-lambda-sagemakerendpoint';

// deploy lambda function
const fn = defaults.deployLambdaFunction(stack, {
  runtime: lambda.Runtime.PYTHON_3_8,
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  handler: 'index.handler',
  timeout: Duration.minutes(5),
  memorySize: 128,
});

const [containerMap, sourceBucket, modelDeployment] = getSagemakerModel(stack);

const constructProps: LambdaToSagemakerEndpointProps = {
  modelProps: {
    primaryContainer: {
      image: containerMap.findInMap(Stack.of(stack).region, "containerArn"),
      modelDataUrl: sourceBucket.s3UrlForObject("model.tar.gz"),
    },
  },
  existingLambdaObj: fn,
};

//   Fix names and construct IDs
const lambdaToSagemakerConstruct = new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', constructProps);

lambdaToSagemakerConstruct.node.addDependency(modelDeployment);

// Synth
app.synth();
