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

import * as api from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';
import { CloudFrontToApiGateway } from '@aws-solutions-constructs/aws-cloudfront-apigateway';

/**
 * @summary The properties for the CloudFrontToApiGatewayToLambda Construct
 */
export interface CloudFrontToApiGatewayToLambdaProps {
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
  readonly lambdaFunctionProps?: lambda.FunctionProps
  /**
   * Optional user provided props to override the default props for the API Gateway.
   *
   * @default - Default props are used
   */
  readonly apiGatewayProps?: api.LambdaRestApiProps
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly cloudFrontDistributionProps?: cloudfront.CloudFrontWebDistributionProps | any,
  /**
   * Optional user provided props to turn on/off the automatic injection of best practice HTTP
   * security headers in all responses from cloudfront
   *
   * @default - true
   */
  readonly insertHttpSecurityHeaders?: boolean;
}

export class CloudFrontToApiGatewayToLambda extends Construct {
  public readonly cloudFrontWebDistribution: cloudfront.CloudFrontWebDistribution;
  public readonly apiGateway: api.RestApi;
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

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    this.apiGateway = defaults.RegionalLambdaRestApi(this, this.lambdaFunction, props.apiGatewayProps);

    const apiCloudfront: CloudFrontToApiGateway = new CloudFrontToApiGateway(this, 'CloudFrontToApiGateway', {
      existingApiGatewayObj: this.apiGateway,
      cloudFrontDistributionProps: props.cloudFrontDistributionProps,
      insertHttpSecurityHeaders: props.insertHttpSecurityHeaders
    });

    this.cloudFrontWebDistribution = apiCloudfront.cloudFrontWebDistribution;
  }
}
