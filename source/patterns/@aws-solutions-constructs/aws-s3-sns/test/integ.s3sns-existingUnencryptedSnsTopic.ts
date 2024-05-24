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
import { S3ToSns } from "../lib";
import { SuppressCfnNagLambdaWarnings, addCfnSuppressRules, generateIntegStackName } from '@aws-solutions-constructs/core';
import * as sns from 'aws-cdk-lib/aws-sns';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const existingTopicObj = new sns.Topic(stack, 'Topic');
addCfnSuppressRules(existingTopicObj, [ { id: "W47", reason: "This test intentionally leaves the topic unencrypted" } ]);

new S3ToSns(stack, 'test-s3-sns', {
  existingTopicObj,
  bucketProps: {
    autoDeleteObjects: true,
    removalPolicy: RemovalPolicy.DESTROY
  },
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  },
});

SuppressCfnNagLambdaWarnings(stack);
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
