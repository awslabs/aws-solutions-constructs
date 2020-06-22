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
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the LambdaToS3 class.
 */
export interface LambdaToS3Props {
    /**
     * Whether to create a new Lambda function or use an existing Lambda function.
     * If set to false, you must provide an existing function for the `existingLambdaObj` property.
     *
     * @default - true
     */
    readonly deployLambda: boolean,
    /**
     * Existing instance of Lambda Function object.
     * If `deploy` is set to false only then this property is required
     *
     * @default - None
     */
    readonly existingLambdaObj?: lambda.Function,
    /**
     * Optional user provided properties to override the default properties for the Lambda function.
     * If `deploy` is set to true only then this property is required.
     *
     * @default - Default properties are used.
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps | any
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
    /**
     * Optional bucket permissions to grant to the Lambda function.
     * One or more of the following may be specified: "Delete", "Put", "Read", "ReadWrite", "Write".
     *
     * @default - Read/write access is given to the Lambda function if no value is specified.
     */
    readonly bucketPermissions?: string[]
}

/**
 * @summary The LambdaToS3 class.
 */
export class LambdaToS3 extends Construct {
    public readonly lambdaFunction: lambda.Function;
    public readonly s3Bucket: s3.Bucket;

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

        // Setup the Lambda function
        this.lambdaFunction = defaults.buildLambdaFunction(this, {
            deployLambda: props.deployLambda,
            existingLambdaObj: props.existingLambdaObj,
            lambdaFunctionProps: props.lambdaFunctionProps
        });

        // Setup the S3 bucket
        this.s3Bucket = defaults.buildS3Bucket(this, {
            deployBucket: props.deployBucket,
            existingBucketObj: props.existingBucketObj,
            bucketProps: props.bucketProps
        });

        // Configure environment variables
        this.lambdaFunction.addEnvironment('S3_BUCKET_NAME', this.s3Bucket.bucketName);

        // Add the requested or default bucket permissions
        if (props.hasOwnProperty('bucketPermissions') && props.bucketPermissions) {
            if (props.bucketPermissions.includes('Delete')) {
                this.s3Bucket.grantDelete(this.lambdaFunction.grantPrincipal);
            }
            if (props.bucketPermissions.includes('Put')) {
                this.s3Bucket.grantPut(this.lambdaFunction.grantPrincipal);
            }
            if (props.bucketPermissions.includes('Read')) {
                this.s3Bucket.grantRead(this.lambdaFunction.grantPrincipal);
            }
            if (props.bucketPermissions.includes('ReadWrite')) {
                this.s3Bucket.grantReadWrite(this.lambdaFunction.grantPrincipal);
            }
            if (props.bucketPermissions.includes('Write')) {
                this.s3Bucket.grantWrite(this.lambdaFunction.grantPrincipal);
            }
        } else {
            this.s3Bucket.grantReadWrite(this.lambdaFunction.grantPrincipal);
        }

        // Add appropriate metadata
        const s3BucketResource = this.s3Bucket.node.findChild('Resource') as s3.CfnBucket;
        s3BucketResource.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                    id: 'W51',
                    reason: `This S3 bucket Bucket does not need a bucket policy`
                }]
            }
        };
    }
}