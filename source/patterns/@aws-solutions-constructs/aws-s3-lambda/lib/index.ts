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

import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import { Construct, Stack } from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
import { S3EventSourceProps, S3EventSource } from '@aws-cdk/aws-lambda-event-sources';

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
  public readonly s3Bucket: s3.Bucket;
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

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    [this.s3Bucket, this.s3LoggingBucket] = defaults.buildS3Bucket(this, {
      existingBucketObj: props.existingBucketObj,
      bucketProps: props.bucketProps
    });

    // Create S3 trigger to invoke lambda function
    this.lambdaFunction.addEventSource(new S3EventSource(this.s3Bucket,
      defaults.S3EventSourceProps(props.s3EventSourceProps)));

    this.addCfnNagSuppress();
  }

  private addCfnNagSuppress() {
    // Extract the CfnBucket from the s3Bucket
    const s3BucketResource = this.s3Bucket.node.findChild('Resource') as s3.CfnBucket;

    s3BucketResource.cfnOptions.metadata = {
        cfn_nag: {
            rules_to_suppress: [{
                id: 'W51',
                reason: `This S3 bucket Bucket does not need a bucket policy`
            }]
        }
    };

    const root = Stack.of(this);
    const logicalId = 'BucketNotificationsHandler050a0587b7544547bf325f094a3db834';
    const notificationsResourceHandler = root.node.tryFindChild(logicalId) as lambda.Function;
    const notificationsResourceHandlerRoleRole = notificationsResourceHandler.node.findChild('Role') as iam.Role;
    const notificationsResourceHandlerRolePolicy = notificationsResourceHandlerRoleRole.node.findChild('DefaultPolicy') as iam.Policy;

    // Extract the CfnFunction from the Function
    const fnResource = notificationsResourceHandler.node.findChild('Resource') as lambda.CfnFunction;

    fnResource.cfnOptions.metadata = {
      cfn_nag: {
          rules_to_suppress: [{
              id: 'W58',
              reason: `Lambda function has permission to write CloudWatch Logs via AWSLambdaBasicExecutionRole policy attached to the lambda role`
          }]
      }
    };

    // Extract the CfnPolicy from the iam.Policy
    const policyResource = notificationsResourceHandlerRolePolicy.node.findChild('Resource') as iam.CfnPolicy;

    policyResource.cfnOptions.metadata = {
      cfn_nag: {
          rules_to_suppress: [{
              id: 'W12',
              reason: `Bucket resource is '*' due to circular dependency with bucket and role creation at the same time`
          }]
      }
    };
  }
}