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
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { DefaultStreamProps } from './kinesis-streams-defaults';
import * as cdk from 'aws-cdk-lib';
import { consolidateProps } from './utils';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

export interface BuildKinesisStreamProps {
  /**
   * Existing instance of Kinesis Stream, providing both this and `kinesisStreamProps` will cause an error.
   *
   * @default - None
   */
  readonly existingStreamObj?: kinesis.Stream;

  /**
   * Optional user provided props to override the default props for the Kinesis stream.
   *
   * @default - Default props are used.
   */
  readonly kinesisStreamProps?: kinesis.StreamProps
}

export function buildKinesisStream(scope: Construct, props: BuildKinesisStreamProps): kinesis.Stream {

  if (props.existingStreamObj) {
    return props.existingStreamObj;
  }

  // Setup the stream properties
  let kinesisStreamProps;
  // If property overrides have been provided, incorporate them and deploy
  kinesisStreamProps = consolidateProps(DefaultStreamProps, props.kinesisStreamProps);

  // Create the stream and return
  return new kinesis.Stream(scope, 'KinesisStream', kinesisStreamProps);
}

export function buildKinesisStreamCWAlarms(scope: Construct): cloudwatch.Alarm[] {
  // Setup CW Alarms for KinesisStream
  const alarms: cloudwatch.Alarm[] = new Array();

  // Alarm if Max (GetRecords.IteratorAgeMilliseconds): >= 12 hours (50% of 24 hours default retention period)
  alarms.push(new cloudwatch.Alarm(scope, 'KinesisStreamGetRecordsIteratorAgeAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/Kinesis',
      metricName: 'GetRecords.IteratorAgeMilliseconds',
      statistic: 'Maximum',
      period: cdk.Duration.minutes(5),
    }),
    threshold: 43200000, // 43200000 Milliseconds = 12 Hours (50% of 24 hours - default record retention period)
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Consumer Record Processing Falling Behind, there is risk for data loss due to record expiration.'
  }));

  // Alarm if Avg (ReadProvisionedThroughputExceeded): > 0
  alarms.push(new cloudwatch.Alarm(scope, 'KinesisStreamReadProvisionedThroughputExceededAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/Kinesis',
      metricName: 'ReadProvisionedThroughputExceeded',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    }),
    threshold: 0,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    alarmDescription: 'Consumer Application is Reading at a Slower Rate Than Expected.'
  }));

  return alarms;
}