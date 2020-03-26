/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as kinesisfirehose from '@aws-cdk/aws-kinesisfirehose';
import * as iot from '@aws-cdk/aws-iot';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import * as defaults from '@aws-solutions-konstruk/core';
import { overrideProps } from '@aws-solutions-konstruk/core';
import { KinesisFirehoseToS3 } from '@aws-solutions-konstruk/aws-kinesisfirehose-s3';

/**
 * @summary The properties for the IotToKinesisFirehoseToS3 Construct
 */
export interface IotToKinesisFirehoseToS3Props {
    /**
     * User provided CfnTopicRuleProps to override the defaults
     *
     * @default - Default props are used
     */
    readonly iotTopicRuleProps: iot.CfnTopicRuleProps;
    /**
     * Optional user provided props to override the default props
     *
     * @default - Default props are used
     */
    readonly kinesisFirehoseProps?: kinesisfirehose.CfnDeliveryStreamProps | any;
    /**
     * Whether to create a S3 Bucket or use an existing S3 Bucket.
     * If set to false, you must provide S3 Bucket as `existingBucketObj`
     *
     * @default - true
     */
    readonly deployBucket?: boolean,
    /**
     * Existing instance of S3 Bucket object.
     * If `deployBucket` is set to false only then this property is required
     *
     * @default - None
     */
    readonly existingBucketObj?: s3.Bucket,
    /**
     * Optional user provided props to override the default props.
     * If `deploy` is set to true only then this property is required
     *
     * @default - Default props are used
     */
    readonly bucketProps?: s3.BucketProps
}

export class IotToKinesisFirehoseToS3 extends Construct {
    private topic: iot.CfnTopicRule;
    private firehose: kinesisfirehose.CfnDeliveryStream;
    private s3Bucket: s3.Bucket;

    /**
     * @summary Constructs a new instance of the IotToKinesisFirehoseToS3 class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {CloudFrontToApiGatewayProps} props - user provided props for the construct
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: IotToKinesisFirehoseToS3Props) {
        super(scope, id);

        const firehoseToS3 = new KinesisFirehoseToS3(this, 'KinesisFirehoseToS3', {
            kinesisFirehoseProps: props.kinesisFirehoseProps,
            deployBucket: props.deployBucket,
            existingBucketObj: props.existingBucketObj,
            bucketProps: props.bucketProps
        });
        this.firehose = firehoseToS3.kinesisFirehose();
        this.s3Bucket = firehoseToS3.bucket();

        // Setup the IAM Role for IoT Actions
        const iotActionsRole = new iam.Role(this, 'IotActionsRole', {
            assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
        });

        // Setup the IAM policy for IoT Actions
        const iotActionsPolicy = new iam.Policy(this, 'IotActionsPolicy', {
            statements: [new iam.PolicyStatement({
              actions: [
                'firehose:PutRecord'
              ],
              resources: [this.firehose.attrArn]
            })
        ]});

        // Attach policy to role
        iotActionsPolicy.attachToRole(iotActionsRole);

        const defaultIotTopicProps = defaults.DefaultCfnTopicRuleProps([{
            firehose: {
                deliveryStreamName: this.firehose.ref,
                roleArn: iotActionsRole.roleArn
            }
        }]);
        const iotTopicProps = overrideProps(defaultIotTopicProps, props.iotTopicRuleProps, true);

        // Create the IoT topic rule
        this.topic = new iot.CfnTopicRule(this, 'IotTopic', iotTopicProps);
    }

    /**
     * @summary Retruns an instance of kinesisfirehose.CfnDeliveryStream created by the construct.
     * @returns {kinesisfirehose.CfnDeliveryStream} Instance of CfnDeliveryStream created by the construct
     * @since 0.8.0
     * @access public
     */
    public kinesisFirehose(): kinesisfirehose.CfnDeliveryStream {
        return this.firehose as kinesisfirehose.CfnDeliveryStream;
    }

    /**
     * @summary Retruns an instance of s3.Bucket created by the construct.
     * @returns {s3.Bucket} Instance of s3.Bucket created by the construct
     * @since 0.8.0
     * @access public
     */
    public bucket(): s3.Bucket {
        return this.s3Bucket;
    }

    /**
     * @summary Retruns an instance of iot.CfnTopicRule created by the construct.
     * @returns {iot.CfnTopicRule} Instance of CfnTopicRule created by the construct
     * @since 0.8.0
     * @access public
     */
    public iotTopicRule(): iot.CfnTopicRule {
        return this.topic;
    }
}