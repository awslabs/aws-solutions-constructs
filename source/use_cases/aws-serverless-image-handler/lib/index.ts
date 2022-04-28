/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import * as cloudFront from '@aws-cdk/aws-cloudfront';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import { CloudFrontToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cloudfront-apigateway-lambda';
import { LambdaToS3 } from '@aws-solutions-constructs/aws-lambda-s3';

/**
 * The properties for the ServerlessImageHandler class.
 */
export interface ServerlessImageHandlerProps {
    /**
     * Whether or not to emable Cross-Origin Resource Sharing (CORS) for the image handler API.
     *
     * @default - false.
     */
    readonly corsEnabled?: boolean
    /**
     * The CORS origin to use for the image handler API. This property is only required if `corsEnabled` is set to true.
     *
     * @default - none.
     */
    readonly corsOrigin?: string
    /**
     * One or more buckets within the deployment account to be used for storing/sourcing original image files.
     *
     * @default - required.
     */
    readonly sourceBuckets: string
    /**
     * The amount of time for CloudWatch log entries from this solution to be retained.
     *
     * @default - 1 day.
     */
    readonly logRetentionPeriod?: number,
    /**
     * Whether or not to accept/enable automatic WebP based on Accept- headers.
     *
     * @default - false.
     */
    readonly autoWebP?: boolean,
    /**
     * Optional user provided props to override the default props for each resource.
     *
     * @default - undefined/optional.
     */
    readonly customProps?: ServerlessImageHandlerCustomProps
}

/**
 * Custom properties for the ServerlessImageHandler class.
 */
export interface ServerlessImageHandlerCustomProps {
    /**
     * Optional user provided props to override the default props for the CloudFront distribution.
     *
     * @default - false.
     */
    readonly cloudFrontDistributionProps?: cloudFront.DistributionProps | any,
    /**
     * Optional user provided props to override the default props for the API Gateway REST API.
     *
     * @default - none.
     */
    readonly apiGatewayProps?: apiGateway.RestApiProps | any,
    /**
     * Optional user provided props to override the default props for the Lambda function.
     *
     * @default - none.
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps | any,
    /**
     * Optional user provided props to override the default props for the S3 bucket.
     *
     * @default - none.
     */
    readonly bucketProps?: s3.BucketProps | any,
    /**
     * Optional user provided props to override the default permissions for the S3 bucket.
     *
     * @default - none.
     */
    readonly bucketPermissions?: string[]
}

/**
 * @summary The ServerlessImageHandler class.
 */
export class ServerlessImageHandler extends Construct {
    // Private variables
    private cloudFrontApiGatewayLambda: CloudFrontToApiGatewayToLambda;
    private lambdaS3: LambdaToS3;
    private customProps: any;

    /**
     * @summary Constructs a new instance of the ServerlessImageHandler class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {ServerlessImageHandlerProps} props - user provided props for the construct
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: ServerlessImageHandlerProps) {
        super(scope, id);

        // If customProps is undefined, define it
        this.customProps = (props.customProps === undefined) ? {} : props.customProps;

        // Use case specific properties for the Lambda function
        const useCaseFunctionProps: lambda.FunctionProps = {
            code: lambda.Code.fromAsset(`${__dirname}/lambda/image-handler`),
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'index.handler',
            environment: {
                AUTO_WEBP: (props.autoWebP) ? 'Yes' : 'No',
                CORS_ENABLED: (props.corsEnabled) ? 'Yes' : 'No',
                CORS_ORIGIN: (props.corsOrigin) ? props.corsOrigin : ''
            }
        };
        const functionProps = (this.customProps.lambdaFunctionProps) ?
            defaults.overrideProps(useCaseFunctionProps, this.customProps.lambdaFunctionProps) : useCaseFunctionProps;

        // Use case specific properties for the API Gateway
        const useCaseApiProps: apiGateway.RestApiProps = {
            binaryMediaTypes: [ "*/*" ]
        };
        const apiProps = (this.customProps.apiGatewayProps) ?
            defaults.overrideProps(useCaseApiProps, this.customProps.apiGatewayProps) : useCaseApiProps;

        // Build the CloudFrontToApiGatewayToLambda pattern
        this.cloudFrontApiGatewayLambda = new CloudFrontToApiGatewayToLambda(this, 'CloudFrontApiGatewayLambda', {
            cloudFrontDistributionProps: (this.customProps.cloudFrontDistributionProps) ? this.customProps.cloudFrontDistributionProps : undefined,
            apiGatewayProps: apiProps,
            lambdaFunctionProps: functionProps
        });
        const existingLambdaFn = this.cloudFrontApiGatewayLambda.lambdaFunction;

        // Build the LambdaToS3 pattern
        this.lambdaS3 = new LambdaToS3(this, 'ExistingLambdaS3', {
            existingLambdaObj: existingLambdaFn,
            bucketProps: this.customProps.bucketProps,
            bucketPermissions: (this.customProps.bucketPermissions) ? this.customProps.bucketPermissions : undefined
        });

        // Add additional permissions for Lambda to source original images from any bucket in the account
        const lambdaSourcingPolicyStmt = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW
        });
        lambdaSourcingPolicyStmt.addResources('arn:aws:s3:::*');
        lambdaSourcingPolicyStmt.addActions('s3:GetObject*', 's3:GetBucket*', 's3:List*');

        // Add additional permissions for Lambda to access Rekognition services
        const lambdaRekognitionPolicyStmt = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW
        });
        lambdaRekognitionPolicyStmt.addResources('*');
        lambdaRekognitionPolicyStmt.addActions('rekognition:DetectFaces');

        // Append the additional permissions to an inline policy
        const inlinePolicy = new iam.Policy(this, 'LambdaS3AccessPolicy', {
            statements: [ lambdaSourcingPolicyStmt, lambdaRekognitionPolicyStmt ]
        });

        // Add cfn_nag suppression for Rekognition wildcard resource
        const rawInlinePolicy: iam.CfnPolicy = inlinePolicy.node.findChild('Resource') as iam.CfnPolicy;
        rawInlinePolicy.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                    id: 'W12',
                    reason: `Specified Rekognition action needs wildcard resource.`
                }]
            }
        };

        // Attach the inline policy to the Lambda function role
        existingLambdaFn.role?.attachInlinePolicy(inlinePolicy);

        // Add the SOURCE_BUCKETS environment variable to the Lambda function
        const bucketsArr = (props.sourceBuckets !== "") ? props.sourceBuckets.split(',') : [];
        bucketsArr.push(this.safeGetBucketProperty().bucketName);
        const bucketsStr = bucketsArr.toString().replace(/\s+/g, '');
        this.cloudFrontApiGatewayLambda.lambdaFunction.addEnvironment("SOURCE_BUCKETS", bucketsStr);
    }

    /**
     * @summary Returns an instance of cloudFront.CloudFrontWebDistribution created by the construct.
     * @returns { cloudFront.Distribution } Instance of CloudFrontWebDistribution created by the construct.
     * @since 0.8.0
     * @access public
     */
    public cloudFrontDistribution(): cloudFront.Distribution {
        return this.cloudFrontApiGatewayLambda.cloudFrontWebDistribution;
    }

    /**
     * @summary Returns an instance of apiGateway.RestApi created by the construct.
     * @returns { apiGateway.RestApi } Instance of RestApi created by the construct.
     * @since 0.8.0
     * @access public
     */
    public apiGateway(): apiGateway.RestApi {
        return this.cloudFrontApiGatewayLambda.apiGateway;
    }

    /**
     * @summary Returns an instance of lambda.Function created by the construct.
     * @returns { lambda.Function } Instance of Function created by the construct
     * @since 0.8.0
     * @access public
     */
    public lambdaFunction(): lambda.Function {
        return this.cloudFrontApiGatewayLambda.lambdaFunction;
    }

    /**
     * @summary Returns an instance of s3.Bucket created by the construct.
     * @returns { s3.Bucket } Instance of Bucket created by the construct
     * @since 0.8.0
     * @access public
     */
    public s3Bucket(): s3.Bucket {
        return this.safeGetBucketProperty();
    }

    private safeGetBucketProperty(): s3.Bucket {
      // When LambdaToS3 was altered to accept IBucket, the
      // s3Bucket property became optional. This app always 
      // has LambdaToS3 create a new bucket, so if the S3Bucket property
      // is undefined, then an invalid situation has arisen.
      if (!this.lambdaS3.s3Bucket) {
        throw Error('s3Bucket is not set - this should never occur');
      }
      return this.lambdaS3.s3Bucket;
    }
}