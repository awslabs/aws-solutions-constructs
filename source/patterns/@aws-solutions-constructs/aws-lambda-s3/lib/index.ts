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

// Imports
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the LambdaToS3 class.
 */
export interface LambdaToS3Props {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default properties are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
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
   * Optional bucket permissions to grant to the Lambda function.
   * One or more of the following may be specified: "Delete", "Put", "Read", "ReadWrite", "Write".
   *
   * @default - Read/write access is given to the Lambda function if no value is specified.
   */
  readonly bucketPermissions?: string[];
  /**
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Whether to deploy a new VPC
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
  /**
   * Optional Name for the S3 bucket environment variable set for the Lambda function.
   *
   * @default - None
   */
  readonly bucketEnvironmentVariableName?: string;
}

/**
 * @summary The LambdaToS3 class.
 */
export class LambdaToS3 extends Construct {
    public readonly lambdaFunction: lambda.Function;
    public readonly s3Bucket?: s3.Bucket;
    public readonly s3LoggingBucket?: s3.Bucket;
    public readonly vpc?: ec2.IVpc;

    /**
     * @summary Constructs a new instance of the LambdaToS3 class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {LambdaToS3Props} props - user provided props for the construct.
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: LambdaToS3Props) {
      super(scope, id);
      defaults.CheckProps(props);

      let bucket: s3.IBucket;

      if (props.existingBucketObj && props.bucketProps) {
        throw new Error('Cannot specify both bucket properties and an existing bucket');
      }

      if (props.deployVpc || props.existingVpc) {
        if (props.deployVpc && props.existingVpc) {
          throw new Error("More than 1 VPC specified in the properties");
        }

        this.vpc = defaults.buildVpc(scope, {
          defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
          existingVpc: props.existingVpc,
          userVpcProps: props.vpcProps,
          constructVpcProps: {
            enableDnsHostnames: true,
            enableDnsSupport: true,
          },
        });

        defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.S3);
      }

      // Setup the Lambda function
      this.lambdaFunction = defaults.buildLambdaFunction(this, {
        existingLambdaObj: props.existingLambdaObj,
        lambdaFunctionProps: props.lambdaFunctionProps,
        vpc: this.vpc,
      });

      // Setup S3 Bucket
      if (!props.existingBucketObj) {
        [this.s3Bucket, this.s3LoggingBucket] = defaults.buildS3Bucket(this, {
          bucketProps: props.bucketProps
        });
        bucket = this.s3Bucket;
      } else {
        bucket = props.existingBucketObj;
      }

      // Configure environment variables
      const bucketEnvironmentVariableName = props.bucketEnvironmentVariableName || 'S3_BUCKET_NAME';
      this.lambdaFunction.addEnvironment(bucketEnvironmentVariableName, bucket.bucketName);

      // Add the requested or default bucket permissions
      if (props.bucketPermissions) {
        if (props.bucketPermissions.includes('Delete')) {
          bucket.grantDelete(this.lambdaFunction.grantPrincipal);
        }
        if (props.bucketPermissions.includes('Put')) {
          bucket.grantPut(this.lambdaFunction.grantPrincipal);
        }
        if (props.bucketPermissions.includes('Read')) {
          bucket.grantRead(this.lambdaFunction.grantPrincipal);
        }
        if (props.bucketPermissions.includes('ReadWrite')) {
          bucket.grantReadWrite(this.lambdaFunction.grantPrincipal);
        }
        if (props.bucketPermissions.includes('Write')) {
          bucket.grantWrite(this.lambdaFunction.grantPrincipal);
        }
      } else {
        bucket.grantReadWrite(this.lambdaFunction.grantPrincipal);
      }
    }
}