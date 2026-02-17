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

// Imports
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * The properties for the ApiGatewayToLambda class.
 */
export interface ApiGatewayToLambdaProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * Optional - user provided props to override the default props for the Lambda function. Providing both this and `existingLambdaObj`
   * causes an error.
   *
   * @default - Default props are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps,
  /**
   * Optional - user-provided props to override the default props for the API Gateway API.
   *
   * @default - Default props are used.
   */
  readonly apiGatewayProps?: api.LambdaRestApiProps | any,
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps,
  /**
   * Whether to create a Usage Plan attached to the API. Must be true if
   * apiGatewayProps.defaultMethodOptions.apiKeyRequired is true
   *
   * @default - true (to match legacy behavior)
   */
  readonly createUsagePlan?: boolean
}

/**
 * @summary The ApiGatewayToLambda class.
 */
export class ApiGatewayToLambda extends Construct {
  public readonly apiGateway: api.RestApi;
  public readonly apiGatewayCloudWatchRole?: iam.Role;
  public readonly apiGatewayLogGroup: logs.LogGroup;
  public readonly lambdaFunction: lambda.Function;

  /**
   * @summary Constructs a new instance of the ApiGatewayToLambda class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CloudFrontToApiGatewayToLambdaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: ApiGatewayToLambdaProps) {
    super(scope, id);
    defaults.CheckLambdaProps(props);
    defaults.CheckApiProps(props);
    defaults.ValidateLambdaRestApiProps(props.apiGatewayProps);

    // Setup the Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    // Setup the API Gateway
    const globalRestApiResponse = defaults.GlobalLambdaRestApi(
      this,
      this.lambdaFunction,
      props.apiGatewayProps,
      props.logGroupProps,
      props.createUsagePlan);
    this.apiGateway = globalRestApiResponse.api;
    this.apiGatewayCloudWatchRole = globalRestApiResponse.role;
    this.apiGatewayLogGroup = globalRestApiResponse.group;
  }
}