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

import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as defaults from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the IotToKinesisFirehoseToS3 Construct
 */
export interface IotToKinesisStreamsProps {
  /**
   * User provided CfnTopicRuleProps to override the defaults
   *
   * @default - Default props are used
   */
  readonly iotTopicRuleProps: iot.CfnTopicRuleProps;
  /**
   * Existing instance of Kinesis Stream object, providing both this and KinesisStreamProps will cause an error.
   *
   * @default - Default props are used
   */
  readonly existingStreamObj?: kinesis.Stream;
  /**
   * User provided props to override the default props for the Kinesis Stream.
   *
   * @default - Default props are used
   */
  readonly kinesisStreamProps?: kinesis.StreamProps | any;
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean;
}

export class IotToKinesisStreams extends Construct {
  public readonly iotTopicRule: iot.CfnTopicRule;
  public readonly kinesisStream: kinesis.Stream;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly iotActionsRole: iam.Role;

  /**
   * @summary Constructs a new instance of the IotToKinesisFirehoseToS3 class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CloudFrontToApiGatewayProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: IotToKinesisStreamsProps) {
    super(scope, id);
    defaults.CheckProps(props);
    defaults.CheckKinesisStreamProps(props);

    // Set up the Kinesis Stream
    this.kinesisStream = defaults.buildKinesisStream(this, {
      existingStreamObj: props.existingStreamObj,
      kinesisStreamProps: props.kinesisStreamProps,
    });

    // Setup the IAM Role for IoT Actions
    this.iotActionsRole = new iam.Role(this, 'IotActionsRole', {
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
    });

    // Setup the IAM policy for IoT Actions
    const iotActionsPolicy = new iam.Policy(this, 'IotActionsPolicy', {
      statements: [new iam.PolicyStatement({
        actions: [
          'kinesis:PutRecord'
        ],
        resources: [this.kinesisStream.streamArn]
      })
      ]});

    // Attach policy to role
    iotActionsPolicy.attachToRole(this.iotActionsRole);

    // Create IoT Rule Props
    const defaultIotTopicProps = defaults.DefaultCfnTopicRuleProps([{
      kinesis: {
        streamName: this.kinesisStream.streamName,
        roleArn: this.iotActionsRole.roleArn
      }
    }]);
    const iotTopicProps = defaults.overrideProps(defaultIotTopicProps, props.iotTopicRuleProps, true);

    // Create the IoT topic rule
    this.iotTopicRule = new iot.CfnTopicRule(this, 'IotTopic', iotTopicProps);

    if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
      // Deploy best practices CW Alarms for Kinesis Stream
      this.cloudwatchAlarms = defaults.buildKinesisStreamCWAlarms(this);
    }
  }
}