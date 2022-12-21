/**
 *  CopyrightAmazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Stack, Duration } from "aws-cdk-lib";
import * as defaults from '../';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { ResourcePart } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildKinesisStream(stack, {});

  expect(stack).toHaveResourceLike('AWS::Kinesis::Stream', {
    Type: "AWS::Kinesis::Stream",
    Properties: {
      StreamEncryption: {
        EncryptionType: "KMS"
      }
    }
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Test deployment w/ custom properties
// --------------------------------------------------------------
test('Test deployment w/ custom properties', () => {
  // Stack
  const stack = new Stack();
  // Helper setup
  const encKey = defaults.buildEncryptionKey(stack);
  // Helper declaration
  defaults.buildKinesisStream(stack, {
    kinesisStreamProps: {
      streamName: 'myCustomKinesisStream',
      encryption: kinesis.StreamEncryption.KMS,
      encryptionKey: encKey
    }
  });

  expect(stack).toHaveResource('AWS::Kinesis::Stream', {
    Name: 'myCustomKinesisStream'
  });
  // Assertion 3
  expect(stack).toHaveResource('AWS::KMS::Key', {
    EnableKeyRotation: true
  });
});

// --------------------------------------------------------------
// Test deployment w/ existing stream
// --------------------------------------------------------------
test('Test deployment w/ existing stream', () => {
  // Stack
  const stack = new Stack();
  // Helper setup
  const stream = new kinesis.Stream(stack, 'existing-stream', {
    shardCount: 2,
    retentionPeriod: Duration.days(3)
  });
  // Helper declaration
  defaults.buildKinesisStream(stack, {
    existingStreamObj: stream,

    // These props will be ignored as an existing stream was provided
    kinesisStreamProps: {
      shardCount: 1,
      retentionPeriod: Duration.days(1)
    }
  });

  expect(stack).toHaveResource('AWS::Kinesis::Stream', {
    ShardCount: 2,
    RetentionPeriodHours: 72
  });
});

test('Count Kinesis CW Alarms', () => {
  const stack = new Stack();

  const cwList = defaults.buildKinesisStreamCWAlarms(stack);

  expect(cwList.length).toEqual(2);
});