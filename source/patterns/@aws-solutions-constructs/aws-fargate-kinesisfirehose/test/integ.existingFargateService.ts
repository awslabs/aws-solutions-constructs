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
import { FargateToKinesisFirehose } from "../lib";
import { CreateFargateService, generateIntegStackName, getTestVpc, suppressAutoDeleteHandlerWarnings } from '@aws-solutions-constructs/core';
import { KinesisFirehoseToS3 } from '@aws-solutions-constructs/aws-kinesisfirehose-s3';
import * as ecs from 'aws-cdk-lib/aws-ecs';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const existingVpc = getTestVpc(stack);

const image = ecs.ContainerImage.fromRegistry('nginx');

const destination = new KinesisFirehoseToS3(stack, 'destination-firehose', {
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  },
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  }
});

const [existingFargateServiceObject, existingContainerDefinitionObject] = CreateFargateService(stack,
  'test',
  existingVpc,
  undefined,
  undefined,
  undefined,
  undefined,
  { image },
);

new FargateToKinesisFirehose(stack, 'test-fargate-kinesisstreams', {
  publicApi: true,
  existingVpc,
  existingFargateServiceObject,
  existingContainerDefinitionObject,
  existingKinesisFirehose: destination.kinesisFirehose
});

suppressAutoDeleteHandlerWarnings(stack);
app.synth();