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

import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { ConstructsFactories } from "../../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as kms from 'aws-cdk-lib/aws-kms';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

const existingKey = new kms.Key(stack, 'test-key', {
  removalPolicy: RemovalPolicy.DESTROY,
  enableKeyRotation: true
});
const factories = new ConstructsFactories(stack, 'target');

factories.sqsQueueFactory('testQueue', {
  encryptionKey: existingKey,
});

new IntegTest(stack, 'Integ', {
  testCases: [
    stack
  ]
});
