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

/// !cdk-integ *
import { App, RemovalPolicy, Stack } from "@aws-cdk/core";
import { IotToS3, IotToS3Props } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const props: IotToS3Props = {
  iotTopicRuleProps: {
    topicRulePayload: {
      ruleDisabled: false,
      description: "process solutions constructs messages",
      sql: "SELECT * FROM 'solutions/constructs'",
      actions: []
    }
  },
  logS3AccessLogs: false,
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    serverAccessLogsPrefix: 'logs'
  }
};
new IotToS3(stack, 'test-iot-s3-integration', props);
app.synth();
