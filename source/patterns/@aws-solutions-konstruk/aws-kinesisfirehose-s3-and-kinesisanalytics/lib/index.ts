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

// Imports
import * as kinesisFirehose from '@aws-cdk/aws-kinesisfirehose';
import * as kinesisAnalytics from '@aws-cdk/aws-kinesisanalytics';
import { KinesisFirehoseToS3, KinesisFirehoseToS3Props } from '@aws-solutions-konstruk/aws-kinesisfirehose-s3';
import * as s3 from '@aws-cdk/aws-s3';
import * as defaults from '@aws-solutions-konstruk/core';
import { Construct } from '@aws-cdk/core';

/**
 * The properties for the KinesisFirehoseToAnalyticsAndS3 class.
 */
export interface KinesisFirehoseToAnalyticsAndS3Props {
  /**
   * Optional user-provided props to override the default props for the Kinesis Firehose delivery stream.
   *
   * @default - Default props are used.
   */
  readonly kinesisFirehoseProps?: kinesisFirehose.CfnDeliveryStreamProps | any;
  /**
   * Optional user-provided props to override the default props for the Kinesis Analytics application.
   *
   * @default - Default props are used.
   */
  readonly kinesisAnalyticsProps?: kinesisAnalytics.CfnApplicationProps | any;
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

/**
 * @summary The KinesisFirehoseToAnalyticsAndS3 class.
 */
export class KinesisFirehoseToAnalyticsAndS3 extends Construct {

    // Declarations
    private analytics: kinesisAnalytics.CfnApplication;
    private kfs: KinesisFirehoseToS3;

    /**
     * @summary Constructs a new instance of the KinesisFirehoseToAnalyticsAndS3 class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {CloudFrontToApiGatewayProps} props - user provided props for the construct
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: KinesisFirehoseToAnalyticsAndS3Props) {
        super(scope, id);

        // Setup the kinesisfirehose-s3 pattern
        const kinesisFirehoseToS3Props: KinesisFirehoseToS3Props = {
            kinesisFirehoseProps: props.kinesisFirehoseProps,
            deployBucket: props.deployBucket,
            existingBucketObj: props.existingBucketObj,
            bucketProps: props.bucketProps
        };

        // Add the kinesisfirehose-s3 pattern
        this.kfs = new KinesisFirehoseToS3(this, 'KinesisFirehoseToS3', kinesisFirehoseToS3Props);

        // Add the Kinesis Analytics application
        this.analytics = defaults.buildKinesisAnalyticsApp(this, {
            kinesisFirehose: this.kfs.kinesisFirehose(),
            kinesisAnalyticsProps: props.kinesisAnalyticsProps
        });
    }

    /**
     * @summary Returns an instance of the kinesisAnalytics.CfnApplication created by the construct.
     * @returns {kinesisAnalytics.CfnApplication} Instance of the CfnApplication created by the construct.
     * @since 0.8.0
     * @access public
     */
    public kinesisAnalytics(): kinesisAnalytics.CfnApplication {
        return this.analytics;
    }

    /**
     * @summary Returns an instance of the kinesisFirehose.CfnDeliveryStream created by the construct.
     * @returns {kinesisFirehose.CfnDeliveryStream} Instance of the CfnDeliveryStream created by the construct.
     * @since 0.8.0
     * @access public
     */
    public kinesisFirehose(): kinesisFirehose.CfnDeliveryStream {
        return this.kfs.kinesisFirehose();
    }

    /**
     * @summary Returns an instance of the s3.Bucket created by the construct.
     * @returns {s3.Bucket} Instance of the Bucket created by the construct.
     * @since 0.8.0
     * @access public
     */
    public bucket(): s3.Bucket {
        return this.kfs.bucket();
    }
}