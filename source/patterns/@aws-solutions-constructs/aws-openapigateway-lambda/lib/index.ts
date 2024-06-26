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

import { Aws } from 'aws-cdk-lib';
import * as cdk from "aws-cdk-lib";
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import * as resources from '@aws-solutions-constructs/resources';
import { RestApiBaseProps } from 'aws-cdk-lib/aws-apigateway';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';

/**
 * The ApiIntegration interface is used to correlate a user-specified id with either a existing lambda function or set of lambda props.
 *
 * See the 'Overview of how the OpenAPI file transformation works' section of the README.md for more details on its usage.
 */
export interface ApiIntegration {
  /**
   * Id of the ApiIntegration, used to correlate this lambda function to the api integration in the open api definition.
   *
   * Note this is not a CDK Construct ID, and is instead a client defined string used to map the resolved lambda resource with the OpenAPI definition.
   */
  readonly id: string;
  /**
   * The Lambda function to associate with the API method in the OpenAPI file matched by id.
   *
   * One and only one of existingLambdaObj or lambdaFunctionProps must be specified, any other combination will cause an error.
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * Properties for the Lambda function to create and associate with the API method in the OpenAPI file matched by id.
   *
   * One and only one of existingLambdaObj or lambdaFunctionProps must be specified, any other combination will cause an error.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
}

/**
 * Helper object to map an ApiIntegration id to its resolved lambda.Function. This type is exposed as a property on the instantiated construct.
 */
export interface ApiLambdaFunction {
  /**
   * Id of the ApiIntegration, used to correlate this lambda function to the api integration in the open api definition.
   */
  readonly id: string;
  /**
   * The instantiated lambda.Function.
   */
  readonly lambdaFunction: lambda.Function;
}

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

    const apiDefinitionBucket = props.apiDefinitionBucket ?? props.apiDefinitionAsset?.bucket;
    const apiDefinitionKey = props.apiDefinitionKey ?? props.apiDefinitionAsset?.s3ObjectKey;

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

    // Map each id and lambda function pair to the required format for the template writer custom resource
    const apiIntegrationUris = this.apiLambdaFunctions.map(apiLambdaFunction => {
      // the placeholder string that will be replaced in the OpenAPI Definition
      const uriPlaceholderString = apiLambdaFunction.id;
      // the endpoint URI of the backing lambda function, as defined in the API Gateway extensions for OpenAPI here:
      // https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration.html
      const uriResolvedValue = `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}:lambda:path/2015-03-31/functions/${apiLambdaFunction.lambdaFunction.functionArn}/invocations`;

      return {
        id: uriPlaceholderString,
        value: uriResolvedValue
      };
    });

    // This custom resource will overwrite the string placeholders in the openapi definition with the resolved values of the lambda URIs
    const apiDefinitionWriter = resources.createTemplateWriterCustomResource(this, 'Api', {
      // CheckAlbProps() has confirmed the existence of these values
      templateBucket: apiDefinitionBucket!,
      templateKey: apiDefinitionKey!,
      templateValues: apiIntegrationUris,
      timeout: props.internalTransformTimeout ?? cdk.Duration.minutes(1),
      memorySize: props.internalTransformMemorySize ?? 1024
    });

    const specRestApiResponse = defaults.CreateSpecRestApi(this, {
      ...props.apiGatewayProps,
      apiDefinition: apigateway.ApiDefinition.fromBucket(
        apiDefinitionWriter.s3Bucket,
        apiDefinitionWriter.s3Key
      )
    }, props.logGroupProps);

    this.apiGateway = specRestApiResponse.api;
    this.apiGatewayCloudWatchRole = specRestApiResponse.role;
    this.apiGatewayLogGroup = specRestApiResponse.logGroup;

    // Redeploy the API any time the incoming API definition changes (from asset or s3 object)
    this.apiGateway.latestDeployment?.addToLogicalId(apiDefinitionKey);

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

function CheckOpenapiProps(props: OpenApiGatewayToLambdaProps) {

  let errorMessages = '';
  let errorFound = false;

  if (props.apiDefinitionAsset && (props.apiDefinitionBucket || props.apiDefinitionKey)) {
    errorMessages += 'Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified, but not both\n';
    errorFound = true;
  }

  const apiDefinitionBucket = props.apiDefinitionBucket ?? props.apiDefinitionAsset?.bucket;
  const apiDefinitionKey = props.apiDefinitionKey ?? props.apiDefinitionAsset?.s3ObjectKey;

  if (apiDefinitionBucket === undefined || apiDefinitionKey === undefined) {
    errorMessages += 'Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified\n';
    errorFound = true;
  }

  if (props.apiIntegrations === undefined || props.apiIntegrations.length < 1) {
    errorMessages += 'At least one ApiIntegration must be specified in the apiIntegrations property\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }

}