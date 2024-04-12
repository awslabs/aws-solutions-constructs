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
import { Stack, Duration } from "aws-cdk-lib";
import * as defaults from '../';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { Template } from 'aws-cdk-lib/assertions';

test('Test minimal deployment with no properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildKinesisStream(stack, {});

  Template.fromStack(stack).hasResource('AWS::Kinesis::Stream', {
    Type: "AWS::Kinesis::Stream",
    Properties: {
      StreamEncryption: {
        EncryptionType: "KMS"
      }
    }
  });
});

test('Test deployment w/ custom properties', () => {
  // Stack
  const stack = new Stack();
  // Helper setup
  const encKey = defaults.buildEncryptionKey(stack, 'key-test');
  // Helper declaration
  defaults.buildKinesisStream(stack, {
    kinesisStreamProps: {
      streamName: 'myCustomKinesisStream',
      encryption: kinesis.StreamEncryption.KMS,
      encryptionKey: encKey
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kinesis::Stream', {
    Name: 'myCustomKinesisStream'
  });
  // Assertion 3
  template.hasResourceProperties('AWS::KMS::Key', {
    EnableKeyRotation: true
  });
});

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

  Template.fromStack(stack).hasResourceProperties('AWS::Kinesis::Stream', {
    ShardCount: 2,
    RetentionPeriodHours: 72
  });
});

test('Count Kinesis CW Alarms', () => {
  const stack = new Stack();

  const cwList = defaults.buildKinesisStreamCWAlarms(stack);

  expect(cwList.length).toEqual(2);
});

// ---------------------------
// Prop Tests
// ---------------------------
test('Test fail Kinesis stream check', () => {
  const stack = new Stack();

  const stream = new kinesis.Stream(stack, 'placeholder', {

  });

  const props: defaults.KinesisStreamProps = {
    existingStreamObj: stream,
    kinesisStreamProps: {}
  };

  const app = () => {
    defaults.CheckKinesisStreamProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide existingStreamObj or kinesisStreamProps, but not both.\n');
});
