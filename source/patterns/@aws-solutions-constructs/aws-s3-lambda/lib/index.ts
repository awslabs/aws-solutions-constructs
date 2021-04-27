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

import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import { Construct, Stack } from '@aws-cdk/core';
import * as defaults from '@aws-solutions-constructs/core';
import { S3EventSourceProps, S3EventSource } from '@aws-cdk/aws-lambda-event-sources';
import {addCfnNagS3BucketNotificationRulesToSuppress} from "@aws-solutions-constructs/core";

/**
 * @summary The properties for the S3ToLambda class.
 */
export interface S3ToLambdaProps {
  /**
   * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps,
  /**
   * Existing instance of S3 Bucket object, if this is set then the bucketProps is ignored.
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.Bucket,
  /**
   * User provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps,
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly s3EventSourceProps?: S3EventSourceProps
}

export class S3ToLambda extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;

  /**
   * @summary Constructs a new instance of the S3ToLambda class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {S3ToLambdaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: S3ToLambdaProps) {
    super(scope, id);
    let bucket: s3.Bucket;

    if (props.existingBucketObj && props.bucketProps) {
      throw new Error('Cannot specify both bucket properties and an existing bucket');
    }

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    if (!props.existingBucketObj) {
      [this.s3Bucket, this.s3LoggingBucket] = defaults.buildS3Bucket(this, {
        bucketProps: props.bucketProps
      });
      bucket = this.s3Bucket;
    } else {
      bucket = props.existingBucketObj;
    }

    // Create S3 trigger to invoke lambda function
    this.lambdaFunction.addEventSource(new S3EventSource(bucket,
      defaults.S3EventSourceProps(props.s3EventSourceProps)));

    // Suppress cfn-nag rules that generate warns for S3 bucket notification CDK resources
    addCfnNagS3BucketNotificationRulesToSuppress(Stack.of(this), 'BucketNotificationsHandler050a0587b7544547bf325f094a3db834');
  }
}
