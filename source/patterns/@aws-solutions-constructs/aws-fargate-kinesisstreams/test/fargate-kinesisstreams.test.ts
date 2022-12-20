/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { FargateToKinesisStreams } from "../lib";
import * as cdk from "aws-cdk-lib";
import '@aws-cdk/assert/jest';

test('Default construct has all expected properties', () => {
  const stack = new cdk.Stack();

  const construct = new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {

  });

  expect(construct.kinesisStream).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
});