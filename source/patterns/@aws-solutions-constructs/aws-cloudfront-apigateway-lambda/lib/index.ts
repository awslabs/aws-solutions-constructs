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

import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { CloudFrontToApiGateway } from '@aws-solutions-constructs/aws-cloudfront-apigateway';

/**
 * @summary The properties for the CloudFrontToApiGatewayToLambda Construct
 */
export interface CloudFrontToApiGatewayToLambdaProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * Optional user provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps
  /**
   * User provided props to override the default props for the API Gateway. As of release
   * 2.48.0, clients must include this property with defaultMethodOptions: { authorizationType: string } specified.
   * See Issue1043 in the github repo https://github.com/awslabs/aws-solutions-constructs/issues/1043
   *
   * @default - defaultMethodOptions/authorizationType is required, for other, unspecified values the
   * default props are used
   */
  readonly apiGatewayProps: api.LambdaRestApiProps | any
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  /**
   * Optional user provided props to turn on/off the automatic injection of best practice HTTP
   * security headers in all responses from cloudfront.
   * Turning this on will inject default headers and is mutually exclusive with passing custom security headers
   * via the responseHeadersPolicyProps parameter.
   *
   * @default - true
   */
  readonly insertHttpSecurityHeaders?: boolean,
  /**
   * Optional user provided configuration that cloudfront applies to all http responses.
   * Can be used to pass a custom ResponseSecurityHeadersBehavior, ResponseCustomHeadersBehavior or
   * ResponseHeadersCorsBehavior to the cloudfront distribution.
   *
   * Passing a custom ResponseSecurityHeadersBehavior is mutually exclusive with turning on the default security headers
   * via `insertHttpSecurityHeaders` prop. Will throw an error if both `insertHttpSecurityHeaders` is set to `true`
   * and ResponseSecurityHeadersBehavior is passed.
   *
   * @default - undefined
   */
  readonly responseHeadersPolicyProps?: cloudfront.ResponseHeadersPolicyProps
  /**
   * Optional user provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps
  /**
   * Optional user provided props to override the default props for the CloudFront Logging Bucket.
   *
   * @default - Default props are used
   */
   readonly cloudFrontLoggingBucketProps?: s3.BucketProps
}

export class CloudFrontToApiGatewayToLambda extends Construct {
  public readonly cloudFrontWebDistribution: cloudfront.Distribution;
  public readonly cloudFrontFunction?: cloudfront.Function;
  public readonly cloudFrontLoggingBucket?: s3.Bucket;
  public readonly apiGateway: api.RestApi;
  public readonly apiGatewayCloudWatchRole?: iam.Role;
  public readonly apiGatewayLogGroup: logs.LogGroup;
  public readonly lambdaFunction: lambda.Function;

  /**
   * @summary Constructs a new instance of the CloudFrontToApiGatewayToLambda class.
   * @param {Construct} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CloudFrontToApiGatewayToLambdaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: CloudFrontToApiGatewayToLambdaProps) {
    super(scope, id);
    defaults.CheckLambdaProps(props);
    // CheckCloudFrontProps() is called by internal aws-cloudfront-apigateway construct
    if (!props.apiGatewayProps?.defaultMethodOptions?.authorizationType) {
      defaults.printWarning('As of v2.48.0, apiGatewayProps.defaultMethodOptions.authorizationType is\
      required. To update your instantiation call, add the following to your CloudFrontToApiGatewayToLambdaProps argument\
      \n\napiGatewayProps: { defaultMethodOptions: { authorizationType: api.AuthorizationType.NONE }},\n\nSee Issue1043 for an explanation.');
      throw new Error('As of v2.48.0, an explicit authorization type is required for CloudFront/API Gateway patterns');
    } else if (props.apiGatewayProps.defaultMethodOptions.authorizationType === "AWS_IAM") {
      throw new Error('Amazon API Gateway Rest APIs integrated with Amazon CloudFront do not support AWS_IAM authorization');
    }

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    // We can't default to IAM authentication with a CloudFront distribution, so
    // we'll instruct core to not use any default auth to avoid override warnings
    const regionalLambdaRestApiResponse = defaults.RegionalLambdaRestApi(this,
      this.lambdaFunction,
      props.apiGatewayProps,
      props.logGroupProps,
      false);
    this.apiGateway = regionalLambdaRestApiResponse.api;
    this.apiGatewayCloudWatchRole = regionalLambdaRestApiResponse.role;
    this.apiGatewayLogGroup = regionalLambdaRestApiResponse.group;

    const apiCloudfront: CloudFrontToApiGateway = new CloudFrontToApiGateway(this, 'CloudFrontToApiGateway', {
      existingApiGatewayObj: this.apiGateway,
      cloudFrontDistributionProps: props.cloudFrontDistributionProps,
      insertHttpSecurityHeaders: props.insertHttpSecurityHeaders,
      cloudFrontLoggingBucketProps: props.cloudFrontLoggingBucketProps,
      responseHeadersPolicyProps: props.responseHeadersPolicyProps
    });

    this.cloudFrontWebDistribution = apiCloudfront.cloudFrontWebDistribution;
    this.cloudFrontFunction = apiCloudfront.cloudFrontFunction;
    this.cloudFrontLoggingBucket = apiCloudfront.cloudFrontLoggingBucket;
  }
}
