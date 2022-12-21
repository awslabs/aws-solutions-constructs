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

/// !cdk-integ *
import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { BucketEncryption } from "aws-cdk-lib/aws-s3";
import { S3ToStepfunctions } from "../lib";
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import { generateIntegStackName } from '@aws-solutions-constructs/core';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

const startState = new stepfunctions.Pass(stack, 'StartState');

new S3ToStepfunctions(stack, 'test-s3-stepfunctions', {
  stateMachineProps: {
    definition: startState
  },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    bucketName: 'custom-logging-bucket',
    encryption: BucketEncryption.S3_MANAGED,
    versioned: true
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY
  }
});

app.synth();
