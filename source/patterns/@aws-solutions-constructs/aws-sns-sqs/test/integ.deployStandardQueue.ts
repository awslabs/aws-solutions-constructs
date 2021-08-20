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

// Imports
import { App, Stack } from "@aws-cdk/core";
import { SnsToSqs, SnsToSqsProps } from "../lib";
import * as sqs from "@aws-cdk/aws-sqs";
import * as sns from "@aws-cdk/aws-sns";
import { generateIntegStackName } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-sns-sqs Standard Queue';

// Definitions
const topic = new sns.Topic(stack, 'TestTopic', {
  displayName: 'Customer subscription topic',
  fifo: false,
  topicName: 'customerTopic',
});

const props: SnsToSqsProps = {
  enableEncryptionWithCustomerManagedKey: false,
  existingTopicObj: topic,
  queueProps: {
    encryption: sqs.QueueEncryption.UNENCRYPTED,
    fifo: false,
  },
};

new SnsToSqs(stack, 'test-sns-sqs', props);

// Synth
app.synth();
