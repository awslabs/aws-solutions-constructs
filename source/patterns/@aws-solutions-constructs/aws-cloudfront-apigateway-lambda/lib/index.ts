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

import * as api from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as logs from '@aws-cdk/aws-logs';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
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
   * Optional user provided props to override the default props for the API Gateway.
   *
   * @default - Default props are used
   */
  readonly apiGatewayProps?: api.LambdaRestApiProps | any
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  /**
   * Optional user provided props to turn on/off the automatic injection of best practice HTTP
   * security headers in all responses from cloudfront
   *
   * @default - true
   */
  readonly insertHttpSecurityHeaders?: boolean,
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
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CloudFrontToApiGatewayToLambdaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: CloudFrontToApiGatewayToLambdaProps) {
    super(scope, id);
    defaults.CheckProps(props);

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    [this.apiGateway, this.apiGatewayCloudWatchRole, this.apiGatewayLogGroup] =
      defaults.RegionalLambdaRestApi(this, this.lambdaFunction, props.apiGatewayProps, props.logGroupProps);

    this.apiGateway.methods.forEach((apiMethod) => {
      // Override the API Gateway Authorization Type from AWS_IAM to NONE
      const child = apiMethod.node.findChild('Resource') as api.CfnMethod;
      if (child.authorizationType === 'AWS_IAM') {
        child.addPropertyOverride('AuthorizationType', 'NONE');

        defaults.addCfnSuppressRules(apiMethod, [
          {
            id: 'W59',
            reason: `AWS::ApiGateway::Method AuthorizationType is set to 'NONE' because API Gateway behind CloudFront does not support AWS_IAM authentication`
          },
        ]);

      }
    });

    const apiCloudfront: CloudFrontToApiGateway = new CloudFrontToApiGateway(this, 'CloudFrontToApiGateway', {
      existingApiGatewayObj: this.apiGateway,
      cloudFrontDistributionProps: props.cloudFrontDistributionProps,
      insertHttpSecurityHeaders: props.insertHttpSecurityHeaders,
      cloudFrontLoggingBucketProps: props.cloudFrontLoggingBucketProps
    });

    this.cloudFrontWebDistribution = apiCloudfront.cloudFrontWebDistribution;
    this.cloudFrontFunction = apiCloudfront.cloudFrontFunction;
    this.cloudFrontLoggingBucket = apiCloudfront.cloudFrontLoggingBucket;
  }
}
