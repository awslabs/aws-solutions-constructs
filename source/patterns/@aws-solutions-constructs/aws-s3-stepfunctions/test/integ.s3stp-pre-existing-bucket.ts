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
import { S3ToStepfunctions, S3ToStepfunctionsProps } from "../lib";
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as defaults from '@aws-solutions-constructs/core';

const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename));
stack.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

const existingBucket = defaults.CreateScrapBucket(stack, {
  eventBridgeEnabled: true
});

const startState = new stepfunctions.Pass(stack, 'StartState');

const props: S3ToStepfunctionsProps = {
  existingBucketObj: existingBucket,
  stateMachineProps: {
    definition: startState
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
  logS3AccessLogs: false
};

new S3ToStepfunctions(stack, 'test-s3-stepfunctions-pre-existing-bucket-construct', props);

defaults.addCfnNagS3BucketNotificationRulesToSuppress(stack, 'BucketNotificationsHandler050a0587b7544547bf325f094a3db834');
defaults.suppressAutoDeleteHandlerWarnings(stack);

app.synth();
