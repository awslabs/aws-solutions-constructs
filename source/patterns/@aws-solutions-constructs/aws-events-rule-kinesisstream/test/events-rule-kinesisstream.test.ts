/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { SynthUtils } from '@aws-cdk/assert';
import * as cdk from "@aws-cdk/core";
import * as events from "@aws-cdk/aws-events";
import * as kinesis from '@aws-cdk/aws-kinesis';
import '@aws-cdk/assert/jest';
import {EventsRuleToKinesisStream, EventsRuleToKinesisStreamProps} from '../lib';

// --------------------------------------------------------------
// Test snapshot match with default parameters
// --------------------------------------------------------------
function deployNewStack(stack: cdk.Stack) {
  const props: EventsRuleToKinesisStreamProps = {
    eventRuleProps: {
      description: 'event rule props',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };
  return new EventsRuleToKinesisStream(stack, 'test-events-rule-kinesis-streams-default-parameters', props);
}

test('Test snapshot match with default parameters', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);

  // Assertions
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test properties
// --------------------------------------------------------------
test('Test properties', () => {
  const stack = new cdk.Stack();
  const construct: EventsRuleToKinesisStream = deployNewStack(stack);

  // Assertions
  expect(construct.eventsRule !== null);
  expect(construct.kinesisStream !== null);
  expect(construct.eventsRole !== null);
});

// --------------------------------------------------------------
// Test default AWS managed encryption key property
// --------------------------------------------------------------
test('check events rule properties', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);

   // Assertions
  expect(stack).toHaveResource('AWS::Kinesis::Stream', {
    StreamEncryption: {
      EncryptionType: "KMS",
      KeyId: "alias/aws/kinesis"
    }
  });
});

// --------------------------------------------------------------
// Test existing resources
// --------------------------------------------------------------
test('Test existing resources', () => {
  const stack = new cdk.Stack();

  // create resource
  const existingStream = new kinesis.Stream(stack, 'test-existing-stream', {
      streamName: 'existing-stream',
      shardCount: 5,
      retentionPeriod: cdk.Duration.hours(48),
      encryption: kinesis.StreamEncryption.UNENCRYPTED
  });

  new EventsRuleToKinesisStream(stack, 'test-events-rule-kinesis-streams-existing-resource', {
      existingStreamObj: existingStream,
      // These properties will be ignored as existing object was provided
      kinesisStreamProps: {
          streamName: 'other-name-stream',
          shardCount: 1,
          retentionPeriod: cdk.Duration.hours(24)
      },
      eventRuleProps: {
        description: 'event rule props',
        schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  });

  // Assertions
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  expect(stack).toHaveResource('AWS::Kinesis::Stream', {
      Name: 'existing-stream',
      ShardCount: 5,
      RetentionPeriodHours: 48,
  });
});