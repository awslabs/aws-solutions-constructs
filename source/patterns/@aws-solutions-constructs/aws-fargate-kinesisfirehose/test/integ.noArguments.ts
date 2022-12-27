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
import { Aws, App, Stack } from "aws-cdk-lib";
import { FargateToKinesisFirehose, FargateToKinesisFirehoseProps } from "../lib";
import { generateIntegStackName, suppressAutoDeleteHandlerWarnings } from '@aws-solutions-constructs/core';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { GetTestFirehoseDestination } from './test-helper';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});

const image = ecs.ContainerImage.fromRegistry('nginx');

const destination = GetTestFirehoseDestination(stack, 'destination-firehose');

const testProps: FargateToKinesisFirehoseProps = {
  publicApi: true,
  existingKinesisFirehose: destination.kinesisFirehose,
  containerDefinitionProps: {
    image
  }
};

new FargateToKinesisFirehose(stack, 'test-construct', testProps);

suppressAutoDeleteHandlerWarnings(stack);
app.synth();
