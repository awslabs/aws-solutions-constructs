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

import * as s3 from '@aws-cdk/aws-s3';
import * as iot from '@aws-cdk/aws-iot';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the IotToS3 class.
 */
export interface IotToS3Props {
  /**
   * Existing S3 Bucket interface, providing both this and `bucketProps` will cause an error.
   *
   * @default - None
   */
  readonly existingBucketInterface?: s3.IBucket;
  /**
   * User provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used.
   */
  readonly bucketProps?: s3.BucketProps;
  /**
   * User provided CfnTopicRuleProps to override the defaults
   *
   * @default - Default props are used. S3ActionProperty with S3 Key '${topic()}/${timestamp()}' is used.
   */
  readonly iotTopicRuleProps: iot.CfnTopicRuleProps;
  /**
   * Optional user provided props to override the default props for the S3 Logging Bucket.
   *
   * @default - Default props are used
   */
  readonly loggingBucketProps?: s3.BucketProps
  /**
   * Optional user provided value to override the default S3Key for IoTRule S3 Action.
   *
   * @default - Default value '${topic()}/${timestamp()}' is used
   */
  readonly s3Key?: string;
  /**
   * Whether to turn on Access Logs for the S3 bucket with the associated storage costs.
   * Enabling Access Logging is a best practice.
   *
   * @default - true
   */
  readonly logS3AccessLogs?: boolean;
}

export class IotToS3 extends Construct {
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3BucketInterface: s3.IBucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  public readonly iotActionsRole: iam.Role;
  public readonly iotTopicRule: iot.CfnTopicRule;

  /**
   * @summary Constructs a new instance of the IotToSqs class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {IotToS3Props} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: IotToS3Props) {
    super(scope, id);
    defaults.CheckProps(props);

    // Setup S3 Bucket
    if (!props.existingBucketInterface) {
      [this.s3Bucket, this.s3LoggingBucket] = defaults.buildS3Bucket(this, {
        bucketProps: props.bucketProps,
        loggingBucketProps: props.loggingBucketProps,
        logS3AccessLogs: props.logS3AccessLogs
      });
      this.s3BucketInterface = this.s3Bucket;
    } else {
      this.s3BucketInterface = props.existingBucketInterface;
    }

    // Role to allow IoT to send messages to the S3 Bucket
    this.iotActionsRole = new iam.Role(this, 'iot-actions-role', {
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com')
    });

    // Setup the IAM policy for IoT Actions
    this.s3BucketInterface.grantWrite(this.iotActionsRole);

    const defaultIotTopicProps = defaults.DefaultCfnTopicRuleProps([{
      s3: {
        key: props.s3Key || '${topic()}/${timestamp()}',
        bucketName: this.s3BucketInterface.bucketName,
        roleArn: this.iotActionsRole.roleArn
      }
    }]);
    const iotTopicProps = defaults.overrideProps(defaultIotTopicProps, props.iotTopicRuleProps, true);

    // Create the IoT topic rule
    this.iotTopicRule = new iot.CfnTopicRule(this, 'IotTopicRule', iotTopicProps);

    // If existing bucket has a KMS CMK, explicitly provide IoTActionsRole necessary access to write to the bucket
    if (this.s3Bucket && this.s3Bucket.encryptionKey) {
      this.s3Bucket.encryptionKey.grantEncrypt(this.iotActionsRole);
    }
  }
}
