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
import * as kms from '@aws-cdk/aws-kms';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the IotToSqs class.
 */
export interface IotToSqsProps {
  /**
   * Existing instance of S3 Bucket object, providing both this and `bucketProps` will cause an error.
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.IBucket;
  /**
   * User provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps;
  /**
   * Use a KMS Key, either managed by this CDK app, or imported. If importing an encryption key, it must be specified in
   * the encryptionKey property for this construct.
   *
   * @default - true (encryption enabled, managed by this CDK app).
   */
  // readonly enableEncryptionWithCustomerManagedKey?: boolean;
  /**
   * An optional, imported encryption key to encrypt the SQS queue, and SNS Topic.
   *
   * @default - not specified.
   */
  // readonly encryptionKey?: kms.Key;
  /**
   * Optional user-provided props to override the default props for the encryption key.
   *
   * @default - Default props are used.
   */
  // readonly encryptionKeyProps?: kms.KeyProps;
  /**
   * User provided CfnTopicRuleProps to override the defaults
   *
   * @default - None
   */
  readonly iotTopicRuleProps: iot.CfnTopicRuleProps;
}

export class IotToSqs extends Construct {
  public readonly s3Bucket: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  // public readonly encryptionKey?: kms.IKey;
  public readonly iotActionsRole: iam.Role;
  public readonly iotTopicRule: iot.CfnTopicRule;

  /**
   * @summary Constructs a new instance of the IotToSqs class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {IotToSqsProps} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: IotToSqsProps) {
    super(scope, id);
    defaults.CheckProps(props);

    if (!props.existingBucketInterface) {
      [this.s3Bucket, this.s3LoggingBucket] = defaults.buildS3Bucket(this, {
        bucketProps: props.bucketProps
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
    const iotActionsPolicy = new iam.Policy(this, 'IotActionsPolicy', {
      statements: [new iam.PolicyStatement({
        actions: [
          's3:PutObject'
        ],
        resources: [this.kinesisStream.streamArn]
      })
      ]});
    // Attach policy to role
    iotActionsPolicy.attachToRole(this.iotActionsRole);

    // if (this.encryptionKey) {
    //   this.encryptionKey.grantEncrypt(this.iotActionsRole);
    // }

    const defaultIotTopicProps = defaults.DefaultCfnTopicRuleProps([{
      s3: {
        bucketName: this.s3Bucket?.bucketName,
        roleArn: this.iotActionsRole.roleArn
      }
    }]);
    const iotTopicProps = defaults.overrideProps(defaultIotTopicProps, props.iotTopicRuleProps, true);

    // Create the IoT topic rule
    this.iotTopicRule = new iot.CfnTopicRule(this, 'IotTopicRule', iotTopicProps);
  }
}
