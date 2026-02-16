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
import * as defaults from '../';

test('ValidateBucketProps - props object is undefined', () => {
  // Should not throw
  expect(() => defaults.ValidateBucketProps()).not.toThrow();
});

test('ValidateBucketProps - valid property', () => {
  // Should not throw
  expect(() => defaults.ValidateBucketProps({ bucketName: 'my-bucket' })).not.toThrow();
});

test('ValidateBucketProps - invalid property', () => {
  expect(() => defaults.ValidateBucketProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of BucketProps/);
});

test('ValidateFunctionProps - valid property', () => {
  expect(() => defaults.ValidateFunctionProps({ runtime: 'nodejs20.x' })).not.toThrow();
});

test('ValidateFunctionProps - invalid property', () => {
  expect(() => defaults.ValidateFunctionProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of FunctionProps/);
});

test('ValidateRestApiProps - valid property', () => {
  expect(() => defaults.ValidateRestApiProps({ binaryMediaTypes: ['image/png'] })).not.toThrow();
});

test('ValidateRestApiProps - invalid property', () => {
  expect(() => defaults.ValidateRestApiProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of RestApiProps/);
});

test('ValidateQueueProps - valid property', () => {
  expect(() => defaults.ValidateQueueProps({ queueName: 'my-queue' })).not.toThrow();
});

test('ValidateQueueProps - invalid property', () => {
  expect(() => defaults.ValidateQueueProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of QueueProps/);
});

test('ValidateTableProps - valid property', () => {
  expect(() => defaults.ValidateTableProps({ tableName: 'my-table' })).not.toThrow();
});

test('ValidateTableProps - invalid property', () => {
  expect(() => defaults.ValidateTableProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of TableProps/);
});

test('ValidateStreamProps - valid property', () => {
  expect(() => defaults.ValidateStreamProps({ streamName: 'my-stream' })).not.toThrow();
});

test('ValidateStreamProps - invalid property', () => {
  expect(() => defaults.ValidateStreamProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of StreamProps/);
});

test('ValidateCfnDeliveryStreamProps - valid property', () => {
  expect(() => defaults.ValidateCfnDeliveryStreamProps({ deliveryStreamName: 'my-stream' })).not.toThrow();
});

test('ValidateCfnDeliveryStreamProps - invalid property', () => {
  expect(() => defaults.ValidateCfnDeliveryStreamProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnDeliveryStreamProps/);
});

test('ValidateLogGroupProps - valid property', () => {
  expect(() => defaults.ValidateLogGroupProps({ logGroupName: 'my-log-group' })).not.toThrow();
});

test('ValidateLogGroupProps - invalid property', () => {
  expect(() => defaults.ValidateLogGroupProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of LogGroupProps/);
});

test('ValidateTopicProps - valid property', () => {
  expect(() => defaults.ValidateTopicProps({ topicName: 'my-topic' })).not.toThrow();
});

test('ValidateTopicProps - invalid property', () => {
  expect(() => defaults.ValidateTopicProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of TopicProps/);
});
