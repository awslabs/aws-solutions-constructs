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

/// !cdk-integ *
import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { S3ToSns } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as sns from 'aws-cdk-lib/aws-sns';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const existingTopicObj = new sns.Topic(stack, 'Topic');

new S3ToSns(stack, 'test-s3-sns', {
  existingTopicObj,
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY
  }
});

app.synth();