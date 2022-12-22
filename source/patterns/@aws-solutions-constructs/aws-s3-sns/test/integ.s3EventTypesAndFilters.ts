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
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as s3 from 'aws-cdk-lib/aws-s3';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

new S3ToSns(stack, 'test-s3-sns', {
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
  s3EventTypes: [
    s3.EventType.OBJECT_REMOVED
  ],
  s3EventFilters: [
    {
      prefix: 'the/place',
      suffix: '.png'
    }
  ],
});

app.synth();
