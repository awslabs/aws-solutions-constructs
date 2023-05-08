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
import * as defaults from '@aws-solutions-constructs/core';
import * as resources from '@aws-solutions-constructs/resources';
import { RestApiBaseProps } from 'aws-cdk-lib/aws-apigateway';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { overrideProps } from '@aws-solutions-constructs/core';

export interface ApiIntegration {
  /**
   * Id of the ApiIntegration, used to correlate this lambda function to the api integration in the open api definition.
   */
  readonly id: string;
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps
}

interface InternalApiIntegration {
  readonly id: string;
  readonly lambdaFunction: lambda.Function
}

export interface OpenApiGatewayToLambdaProps {
  /**
   * S3 Bucket where the open-api spec file is located. When specifying this property, apiDefinitionKey must also be specified.
   */
  readonly apiDefinitionBucket?: string;
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
  public readonly lambdaFunctions: lambda.Function[];

  constructor(scope: Construct, id: string, props: OpenApiGatewayToLambdaProps) {
    super(scope, id);

    if (props.apiDefinitionBucket && props.apiDefinitionKey && props.apiDefinitionAsset) {
      throw new Error('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified, but not both');
    }

    const specBucket = props.apiDefinitionBucket ?? props.apiDefinitionAsset?.s3BucketName;
    const specKey = props.apiDefinitionKey ?? props.apiDefinitionAsset?.s3ObjectKey;

    if (specBucket === undefined || specKey === undefined) {
      throw new Error('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified');
    }

    if (props.apiIntegrations === undefined || props.apiIntegrations.length < 1) {
      throw new Error('At least one ApiIntegration must be specified in the apiIntegrations property');
    }

    // transform the incoming lambda function/lambda function props into a single group of lambda functions,
    // preserving the handler id to be used later in the custom resource
    const lambdaHandlers: InternalApiIntegration[] = props.apiIntegrations.map(apiIntegration => {

      if (apiIntegration.existingLambdaObj) {
        return {
          id: apiIntegration.id,
          lambdaFunction: defaults.buildLambdaFunction(this, {
            existingLambdaObj: apiIntegration.existingLambdaObj,
            lambdaFunctionProps: apiIntegration.lambdaFunctionProps
          })
        };
      } else if (apiIntegration.lambdaFunctionProps) {
        let lambdaFunctionProps = apiIntegration.lambdaFunctionProps;
        if (lambdaFunctionProps?.functionName === undefined) {
          lambdaFunctionProps = overrideProps(lambdaFunctionProps, {
            functionName: '<replace me>'
          }, true);
        }

        return {
          id: apiIntegration.id,
          lambdaFunction: defaults.buildLambdaFunction(this, {
            existingLambdaObj: apiIntegration.existingLambdaObj,
            lambdaFunctionProps: apiIntegration.lambdaFunctionProps
          })
        };
      } else {
        throw new Error(`One of existingLambdaObj or lambdaFunctionProps must be specified for the api integration with id: ${apiIntegration.id}`);
      }
    });

    this.lambdaFunctions = lambdaHandlers.map(handler => handler.lambdaFunction);

    const templateValues = lambdaHandlers.map(lambdaHandler => {
      return {
        id: lambdaHandler.id,
        value: `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}:lambda:path/2015-03-31/functions/${lambdaHandler.lambdaFunction.functionArn}/invocations`
      };
    });

    const templateWriter = resources.createTemplateWriterCustomResource(this, 'TemplateWriter', specBucket, specKey, templateValues);

    const specRestApiResponse = defaults.CreateSpecRestApi(this, {
      ...props.apiGatewayProps,
      apiDefinition: apigateway.ApiDefinition.fromBucket(
        templateWriter.s3Bucket,
        templateWriter.s3Key
      )
    }, props.logGroupProps);

    this.apiGateway = specRestApiResponse.api;
    this.apiGatewayCloudWatchRole = specRestApiResponse.role;
    this.apiGatewayLogGroup = specRestApiResponse.logGroup;

    this.apiGateway.latestDeployment?.addToLogicalId(specKey); // trigger deployment any time the api definition changes

    lambdaHandlers.map(lambdaHandler => {
      lambdaHandler.lambdaFunction.addPermission('PermitAPIGInvocation', {
        principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        sourceArn: this.apiGateway.arnForExecuteApi('*')
      });
    });
  }
}
