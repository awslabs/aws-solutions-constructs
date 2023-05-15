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
import { overrideProps } from '@aws-solutions-constructs/core';

/**
 * The ApiIntegration interface is used to correlate a user-specified id with either a existing lambda function or set of lambda props.
 *
 * See the 'Overview of how the OpenAPI file transformation works' section of the README.md for more details on its usage.
 */
export interface ApiIntegration {
  /**
   * Id of the ApiIntegration, used to correlate this lambda function to the api integration in the open api definition.
   */
  readonly id: string;
  /**
   * Existing instance of Lambda Function object. Providing both this and `lambdaFunctionProps` will cause an error.
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function. Providing both this and `existingLambdaObj` will cause an error.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
}

/**
 * Helper object to map an ApiIntegration id to its resolved lambda.Function.
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
   * S3 Bucket where the open-api spec file is located. When specifying this property, apiDefinitionKey must also be specified.
   */
  readonly apiDefinitionBucket?: s3.IBucket;
  /**
   * S3 Object name of the open-api spec file. When specifying this property, apiDefinitionBucket must also be specified.
   */
  readonly apiDefinitionKey?: string;
  /**
   * Local file asset of the open-api spec file.
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
   *       runtime: lambda.Runtime.NODEJS_16_X,
   *       handler: 'index.handler',
   *       code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
   *     }
   *   },
   *   {
   *     id: 'PhotosHandler',
   *     existingLambdaObj: new lambda.Function(this, 'PhotosLambda', {
   *       runtime: lambda.Runtime.NODEJS_16_X,
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
}

export class OpenApiGatewayToLambda extends Construct {
  public readonly apiGateway: apigateway.SpecRestApi;
  public readonly apiGatewayCloudWatchRole?: iam.Role;
  public readonly apiGatewayLogGroup: logs.LogGroup;
  public readonly apiLambdaFunctions: ApiLambdaFunction[];

  constructor(scope: Construct, id: string, props: OpenApiGatewayToLambdaProps) {
    super(scope, id);

    if (props.apiDefinitionBucket && props.apiDefinitionKey && props.apiDefinitionAsset) {
      throw new Error('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified, but not both');
    }

    const apiDefinitionBucket = props.apiDefinitionBucket ?? props.apiDefinitionAsset?.bucket;
    const apiDefinitionKey = props.apiDefinitionKey ?? props.apiDefinitionAsset?.s3ObjectKey;

    if (apiDefinitionBucket === undefined || apiDefinitionKey === undefined) {
      throw new Error('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified');
    }

    if (props.apiIntegrations === undefined || props.apiIntegrations.length < 1) {
      throw new Error('At least one ApiIntegration must be specified in the apiIntegrations property');
    }

    // store a counter to be able to uniquely name lambda functions to avoid naming collisions
    let lambdaCounter = 0;

    this.apiLambdaFunctions = props.apiIntegrations.map(apiIntegration => {
      lambdaCounter++;
      if (apiIntegration.existingLambdaObj) {
        return {
          id: apiIntegration.id,
          lambdaFunction: defaults.buildLambdaFunction(this, {
            existingLambdaObj: apiIntegration.existingLambdaObj,
            lambdaFunctionProps: apiIntegration.lambdaFunctionProps
          })
        };
      } else if (apiIntegration.lambdaFunctionProps) {
        // we need to pass unique name to the underlying buildLambdaFunction call to avoid naming collisions
        let lambdaFunctionProps: lambda.FunctionProps = apiIntegration.lambdaFunctionProps;
        if (lambdaFunctionProps?.functionName === undefined) {
          lambdaFunctionProps = overrideProps(lambdaFunctionProps, {
            functionName: defaults.generateName(this, `Function${lambdaCounter}`)
          }, true);
        }

        return {
          id: apiIntegration.id,
          lambdaFunction: defaults.buildLambdaFunction(this, {
            existingLambdaObj: apiIntegration.existingLambdaObj,
            lambdaFunctionProps
          })
        };
      } else {
        throw new Error(`One of existingLambdaObj or lambdaFunctionProps must be specified for the api integration with id: ${apiIntegration.id}`);
      }
    });

    // Map each id and lambda function pair to the required format for the template writer custom resource
    const apiIntegrationUris = this.apiLambdaFunctions.map(apiLambdaFunction => {
      return {
        id: apiLambdaFunction.id,
        value: `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}:lambda:path/2015-03-31/functions/${apiLambdaFunction.lambdaFunction.functionArn}/invocations`
      };
    });

    // This custom resource will overwrite the string placeholders in the openapi definition with the resolved values of the lambda URIs
    const apiDefinitionWriter = resources.createTemplateWriterCustomResource(this, apiDefinitionBucket, apiDefinitionKey, apiIntegrationUris);

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

    // Grant APIGW invocation rights of the backing lambda functions
    this.apiLambdaFunctions.map(apiLambdaFunction => {
      apiLambdaFunction.lambdaFunction.addPermission('PermitAPIGInvocation', {
        principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        sourceArn: this.apiGateway.arnForExecuteApi('*')
      });
    });
  }
}
