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
import * as defaults from '@aws-solutions-konstruk/core';
import { Construct } from '@aws-cdk/core';
import { CloudFrontToApiGateway } from '@aws-solutions-konstruk/aws-cloudfront-apigateway';

/**
 * @summary The properties for the CloudFrontToApiGatewayToLambda Construct
 */
export interface CloudFrontToApiGatewayToLambdaProps {
  /**
   * Whether to create a new Lambda function or use an existing Lambda function.
   * If set to false, you must provide a lambda function object as `existingLambdaObj`
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
   * Optional user provided props to override the default props for the Lambda function.
   * If `deploy` is set to true only then this property is required
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
   * security headers in all resonses from cloudfront
   *
   * @default - true
   */
  readonly insertHttpSecurityHeaders?: boolean;
}

export class CloudFrontToApiGatewayToLambda extends Construct {
  private cloudfront: cloudfront.CloudFrontWebDistribution;
  private api: api.RestApi;
  private fn: lambda.Function;

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

    this.fn = defaults.buildLambdaFunction(this, {
      deployLambda: props.deployLambda,
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    this.api = defaults.RegionalLambdaRestApi(this, this.fn, props.apiGatewayProps);

    const apiCloudfront: CloudFrontToApiGateway = new CloudFrontToApiGateway(this, 'CloudFrontToApiGateway', {
      existingApiGatewayObj: this.api,
      cloudFrontDistributionProps: props.cloudFrontDistributionProps,
      insertHttpSecurityHeaders: props.insertHttpSecurityHeaders
    });

    this.cloudfront = apiCloudfront.cloudFrontWebDistribution();
  }

  /**
   * @summary Returns an instance of cloudfront.CloudFrontWebDistribution created by the construct.
   * @returns {cloudfront.CloudFrontWebDistribution} Instance of CloudFrontWebDistribution created by the construct
   * @since 0.8.0
   * @access public
   */
  public cloudFrontWebDistribution(): cloudfront.CloudFrontWebDistribution {
    return this.cloudfront;
  }

  /**
   * @summary Returns an instance of api.RestApi created by the construct.
   * @returns {api.RestApi} Instance of RestApi created by the construct
   * @since 0.8.0
   * @access public
   */
  public restApi(): api.RestApi {
      return this.api;
  }

  /**
   * @summary Returns an instance of lambda.Function created by the construct.
   * @returns {lambda.Function} Instance of Function created by the construct
   * @since 0.8.0
   * @access public
   */
  public lambdaFunction(): lambda.Function {
    return this.fn;
  }
}
