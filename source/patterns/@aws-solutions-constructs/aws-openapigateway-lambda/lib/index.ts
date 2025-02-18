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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import { RestApiBaseProps } from 'aws-cdk-lib/aws-apigateway';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { ApiIntegration, CheckOpenApiProps, ApiLambdaFunction, ObtainApiDefinition } from './openapi-helper';
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
   * OpenAPI specification represented in a JSON object to be embedded in the CloudFormation template.
   * IMPORTANT - Including the spec in the template introduces a risk of the template growing too big, but
   * there are some use cases that require an embedded spec. Unless your use case explicitly requires an embedded spec
   * you should pass your spec as an S3 asset.
   */
  readonly apiDefinitionJson?: any;
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
    CheckOpenApiProps(props);

    // store a counter to be able to uniquely name lambda functions to avoid naming collisions
    let lambdaCounter = 0;

    // TODO: Should this functionality be moved to openapi-helper.ts?
    this.apiLambdaFunctions = props.apiIntegrations.map(rawApiIntegration => {
      // let updatedIntegration: ApiIntegration;
      // if (rawApiIntegration.alternateType) {
      //   if ((rawApiIntegration.alternateType as lambda.Alias).aliasName) {
      //     updatedIntegration = {
      //       ...rawApiIntegration,
      //       existingFunctionAlias: rawApiIntegration.alternateType as lambda.Alias
      //     };
      //   } else {
      //     updatedIntegration = {
      //       ...rawApiIntegration,
      //       existingLambdaObj: rawApiIntegration.alternateType as lambda.Function
      //     };
      //   }
      // } else {
      //   updatedIntegration = rawApiIntegration;
      // }
      if (rawApiIntegration.existingLambdaObj && this.isResourceAnAlias(rawApiIntegration.existingLambdaObj)) {
        return {
          id: rawApiIntegration.id,
          functionAlias: rawApiIntegration.existingLambdaObj as lambda.Alias
        };
      } else {
        return {
          id: rawApiIntegration.id,
          lambdaFunction: defaults.buildLambdaFunction(this, {
            existingLambdaObj: rawApiIntegration.existingLambdaObj as lambda.Function,
            lambdaFunctionProps: rawApiIntegration.lambdaFunctionProps
          }, `${rawApiIntegration.id}ApiFunction${lambdaCounter++}`),
        };
      }
    });

    const definition = ObtainApiDefinition(this, {
      tokenToFunctionMap: this.apiLambdaFunctions,
      apiDefinitionBucket: props.apiDefinitionBucket,
      apiDefinitionKey: props.apiDefinitionKey,
      apiDefinitionAsset: props.apiDefinitionAsset,
      apiJsonDefinition: props.apiDefinitionJson,
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
      // We confirm upstream that one of these two values exists, so we can cast away Typescripts doubt
      const targetInterface: lambda.IFunction = (apiLambdaFunction.lambdaFunction ?? apiLambdaFunction.functionAlias) as lambda.IFunction;

      // Redeploy the API any time one of the lambda functions changes
      this.apiGateway.latestDeployment?.addToLogicalId(targetInterface.functionArn);
      if (apiLambdaFunction.functionAlias) {
        // Grant APIGW invocation rights for each lambda function
        apiLambdaFunction.functionAlias.addPermission(`${id}PermitAPIGInvocation`, {
          principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          sourceArn: this.apiGateway.arnForExecuteApi('*')
        });
      } else {
        // Grant APIGW invocation rights for each lambda function
        targetInterface.addPermission(`${id}PermitAPIGInvocation`, {
          principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          sourceArn: this.apiGateway.arnForExecuteApi('*')
        });
      }
    });
  }

  private isResourceAnAlias(lambdaResource: lambda.Function | lambda.Alias): boolean {
    return (lambdaResource as lambda.Alias).aliasName !== undefined;
  }
}
