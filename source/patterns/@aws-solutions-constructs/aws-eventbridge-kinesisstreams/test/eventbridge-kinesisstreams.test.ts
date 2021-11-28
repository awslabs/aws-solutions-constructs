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

import * as cdk from "@aws-cdk/core";
import * as events from "@aws-cdk/aws-events";
import * as kinesis from '@aws-cdk/aws-kinesis';
import '@aws-cdk/assert/jest';
import {EventbridgeToKinesisStreams, EventbridgeToKinesisStreamsProps} from '../lib';

// --------------------------------------------------------------
// Test snapshot match with default parameters
// --------------------------------------------------------------
function deployNewStack(stack: cdk.Stack) {
  const props: EventbridgeToKinesisStreamsProps = {
    eventRuleProps: {
      description: 'event rule props',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };
  return new EventbridgeToKinesisStreams(stack, 'test-eventbridge-kinesis-streams-default-parameters', props);
}

// --------------------------------------------------------------
// Test properties
// --------------------------------------------------------------
test('Test properties', () => {
  const stack = new cdk.Stack();
  const construct: EventbridgeToKinesisStreams = deployNewStack(stack);

  // Assertions
  expect(construct.eventsRule !== null);
  expect(construct.kinesisStream !== null);
  expect(construct.eventsRole !== null);
});

// --------------------------------------------------------------
// Test default AWS managed encryption key property
// --------------------------------------------------------------
test('Test default AWS managed encryption key property', () => {
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

  new EventbridgeToKinesisStreams(stack, 'test-eventbridge-kinesis-stream-existing-resource', {
    existingStreamObj: existingStream,
    eventRuleProps: {
      description: 'event rule props',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  });

  expect(stack).toHaveResource('AWS::Kinesis::Stream', {
    Name: 'existing-stream',
    ShardCount: 5,
    RetentionPeriodHours: 48,
  });
});

test('check eventbus property, snapshot & eventbus exists', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToKinesisStreamsProps = {
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: {}
  };
  const construct = new EventbridgeToKinesisStreams(stack, 'test-eventbridge-kinesis-streams-default-parameters', props);

  expect(construct.eventsRule !== null);
  expect(construct.kinesisStream !== null);
  expect(construct.eventsRole !== null);
  expect(construct.eventBus !== null);
  // Check whether eventbus exists
  expect(stack).toHaveResource('AWS::Events::EventBus');
});

test('check exception while passing existingEventBus & eventBusProps', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToKinesisStreamsProps = {
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: { eventBusName: 'test' },
    existingEventBusInterface: new events.EventBus(stack, `test-existing-eventbus`, { eventBusName: 'test' })
  };

  const app = () => {
    new EventbridgeToKinesisStreams(stack, 'test-eventbridge-kinesisstreams', props);
  };
  expect(app).toThrowError();
});

test('check custom event bus resource with props when deploy:true', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToKinesisStreamsProps = {
    eventBusProps: {
      eventBusName: `testeventbus`
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    }
  };
  new EventbridgeToKinesisStreams(stack, 'test-new-eventbridge-with-props-kinsesisstreams', props);

  expect(stack).toHaveResource('AWS::Events::EventBus', {
    Name: `testeventbus`
  });
});