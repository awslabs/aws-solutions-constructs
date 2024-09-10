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

import * as cdk from "aws-cdk-lib";
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import { RestApiBaseProps } from 'aws-cdk-lib/aws-apigateway';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { ApiIntegration, CheckOpenapiProps, ApiLambdaFunction, ObtainApiDefinition } from './openapi-helper';
// openapi-helper is on its way to core, so these interfaces must be exported here
export { ApiIntegration, ApiLambdaFunction } from './openapi-helper';

export interface OpenApiGatewayToLambdaProps {
  /**
   * S3 Bucket where the OpenAPI spec file is located. When specifying this property, apiDefinitionKey must also be specified.
   */
  readonly apiDefinitionBucket?: s3.IBucket;
  /**
   * S3 Object name of the OpenAPI spec file. When specifying this property, apiDefinitionBucket must also be specified.
   */
  readonly apiDefinitionKey?: string;
  /**
   * Local file asset of the OpenAPI spec file.
   */
  readonly apiDefinitionAsset?: Asset;
  /**
   * The OpenApi spec represented as a json object to be included in the CloudFormation template.
   * IMPORTANT - Including the spec in the template introduces a risk of the template growing too big, but
   * there are some use cases that require an embedded spec. Unless your use case explicitly requires an embedded spec
   * you should pass your spec as an S3 asset.
   */
  readonly apiJsonDefinition?: any;
  /**
   * One or more key-value pairs that contain an id for the api integration
   * and either an existing lambda function or an instance of the LambdaProps.
   *
   * Example:
   * const apiIntegrations: ApiIntegration[] = [
   *   {
   *     id: 'MessagesHandler',
   *     lambdaFunctionProps: {
   *       runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
   *       handler: 'index.handler',
   *       code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
   *     }
   *   },
   *   {
   *     id: 'PhotosHandler',
   *     existingLambdaObj: new lambda.Function(this, 'PhotosLambda', {
   *       runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
   *       handler: 'index.handler',
   *       code: lambda.Code.fromAsset(`${__dirname}/photos-lambda`),
   *     })
   *   }
   * ]
   */
  readonly apiIntegrations: ApiIntegration[];
  /**
   * Optional user-provided props to override the default props for the API.
   *
   * @default - Default props are used.
   */
  readonly apiGatewayProps?: RestApiBaseProps;
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps
  /**
   * Optional user-defined timeout for the Lambda function custom resource installed to do the OpenAPI definition transformation.
   *
   * This setting does not affect the deployed architecture - only the ability for the Construct to complete its work.
   *
   * Defaults to 1 minute, but for larger files (hundreds of megabytes or gigabytes in size) this value may need to be increased.
   *
   * @default Duration.minutes(1)
   */
  readonly internalTransformTimeout?: cdk.Duration;
  /**
   * Optional user-defined memory size for the Lambda function custom resource installed to do the OpenAPI definition transformation.
   *
   * This setting does not affect the deployed architecture - only the ability for the Construct to complete its work.
   *
   * Defaults to 1024 MiB, but for larger files (hundreds of megabytes or gigabytes in size) this value may need to be increased.
   *
   * @default 1024
   */
  readonly internalTransformMemorySize?: number;
}

export class OpenApiGatewayToLambda extends Construct {
  public readonly apiGateway: apigateway.SpecRestApi;
  public readonly apiGatewayCloudWatchRole?: iam.Role;
  public readonly apiGatewayLogGroup: logs.LogGroup;
  public readonly apiLambdaFunctions: ApiLambdaFunction[];

  constructor(scope: Construct, id: string, props: OpenApiGatewayToLambdaProps) {
    super(scope, id);
    CheckOpenapiProps(props);

    // store a counter to be able to uniquely name lambda functions to avoid naming collisions
    let lambdaCounter = 0;

    this.apiLambdaFunctions = props.apiIntegrations.map(apiIntegration => {
      if (apiIntegration.existingLambdaObj && apiIntegration.lambdaFunctionProps) {
        throw new Error(`Error - Cannot provide both lambdaFunctionProps and existingLambdaObj in an ApiIntegrationfor the api integration with id: ${apiIntegration.id}`);
      }
      if (apiIntegration.existingLambdaObj || apiIntegration.lambdaFunctionProps) {
        return {
          id: apiIntegration.id,
          lambdaFunction: defaults.buildLambdaFunction(this, {
            existingLambdaObj: apiIntegration.existingLambdaObj,
            lambdaFunctionProps: apiIntegration.lambdaFunctionProps
          }, `${apiIntegration.id}ApiFunction${lambdaCounter++}`)
        };
      } else {
        throw new Error(`One of existingLambdaObj or lambdaFunctionProps must be specified for the api integration with id: ${apiIntegration.id}`);
      }
    });

    const definition = ObtainApiDefinition(this,  {
      tokenToFunctionMap: this.apiLambdaFunctions,
      apiDefinitionBucket: props.apiDefinitionBucket,
      apiDefinitionKey: props.apiDefinitionKey,
      apiDefinitionAsset: props.apiDefinitionAsset,
      apiJsonDefinition: props.apiJsonDefinition,
      internalTransformTimeout: props.internalTransformTimeout,
      internalTransformMemorySize: props.internalTransformMemorySize
    });

    const specRestApiResponse = defaults.CreateSpecRestApi(this, {
      ...props.apiGatewayProps,
      apiDefinition: definition
    }, props.logGroupProps);

    this.apiGateway = specRestApiResponse.api;
    this.apiGatewayCloudWatchRole = specRestApiResponse.role;
    this.apiGatewayLogGroup = specRestApiResponse.logGroup;

    // Redeploy the API any time a decoupled (non-inline) API definition changes (from asset or s3 object)
    this.apiGateway.latestDeployment?.addToLogicalId(props.apiDefinitionKey ?? props.apiDefinitionAsset?.s3ObjectKey);
    this.apiLambdaFunctions.forEach(apiLambdaFunction => {
      // Redeploy the API any time one of the lambda functions changes
      this.apiGateway.latestDeployment?.addToLogicalId(apiLambdaFunction.lambdaFunction.functionArn);
      // Grant APIGW invocation rights for each lambda function
      apiLambdaFunction.lambdaFunction.addPermission('PermitAPIGInvocation', {
        principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        sourceArn: this.apiGateway.arnForExecuteApi('*')
      });
    });
  }
}
