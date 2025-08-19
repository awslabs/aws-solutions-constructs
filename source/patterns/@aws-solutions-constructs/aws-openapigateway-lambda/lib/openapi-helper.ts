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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

/*
 * This file is core openapi functionality and should ideally be in the core library. Since
 * that causes a circular reference with the resources library we have left it here for now
 * in the interest of getting these updates out faster
 */

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Aws, Duration } from "aws-cdk-lib";
import { Construct } from 'constructs';
import * as resources from '@aws-solutions-constructs/resources';
import * as defaults from '@aws-solutions-constructs/core';

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
  readonly existingLambdaObj?: lambda.Function | lambda.Alias;
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
   * The function the API method will integrate with -
   * Must be defined in lambdaFunction or functionAlias (but not both)
   */
  readonly lambdaFunction?: lambda.Function;
  readonly functionAlias?: lambda.Alias;
}

export interface OpenApiProps {
  readonly apiDefinitionAsset?: Asset,
  readonly apiDefinitionJson?: any,
  readonly apiDefinitionBucket?: s3.IBucket,
  readonly apiDefinitionKey?: string,
  readonly apiIntegrations: ApiIntegration[]
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function CheckOpenApiProps(props: OpenApiProps) {

  let errorMessages = '';
  let errorFound = false;

  if ((props.apiDefinitionBucket && !props.apiDefinitionKey) || (!props.apiDefinitionBucket && props.apiDefinitionKey)) {
    errorMessages += 'apiDefinitionBucket and apiDefinitionKey must be specified together.\n';
    errorFound = true;
  }

  const definitionCount: number =
    (props.apiDefinitionAsset ? 1 : 0) +
    (props.apiDefinitionBucket ? 1 : 0) +
    (props.apiDefinitionJson ? 1 : 0);

  if (definitionCount !== 1) {
    errorMessages += 'Exactly one of apiDefinitionAsset, apiDefinitionJson or (apiDefinitionBucket/apiDefinitionKey) must be provided\n';
    errorFound = true;
  }

  const integrationValidation = validateApiIntegrations(props.apiIntegrations);
  if (integrationValidation.errorFound) {
    errorMessages += integrationValidation.errorMessages;
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }

}

function validateApiIntegrations(apiIntegrations: ApiIntegration[]): { errorFound: boolean; errorMessages: string } {
  let errorMessages = '';
  let errorFound = false;

  if (apiIntegrations === undefined || apiIntegrations.length < 1) {
    errorMessages += 'At least one ApiIntegration must be specified in the apiIntegrations property\n';
    errorFound = true;
  } else {
    apiIntegrations.forEach((apiIntegration: ApiIntegration) => {
      if (!apiIntegration.id) {
        errorMessages += 'Each ApiIntegration must have a non-empty id property\n';
        errorFound = true;
      }
      let functionDefCount = 0;
      if (apiIntegration.lambdaFunctionProps) { functionDefCount++; }
      if (apiIntegration.existingLambdaObj) { functionDefCount++; }
      if (functionDefCount !== 1) {
        errorMessages += `ApiIntegration id:${apiIntegration.id} must have exactly one of lambdaFunctionProps or existingLambdaObj\n`;
        errorFound = true;
      }
    });
  }

  return { errorFound, errorMessages };
}

export interface ObtainApiDefinitionProps {
  readonly tokenToFunctionMap: ApiLambdaFunction[],
  readonly apiDefinitionBucket?: s3.IBucket,
  readonly apiDefinitionKey?: string,
  readonly apiDefinitionAsset?: Asset,
  readonly apiJsonDefinition?: any,
  readonly internalTransformTimeout?: Duration,
  readonly internalTransformMemorySize?: number
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function ObtainApiDefinition(scope: Construct, props: ObtainApiDefinitionProps): apigateway.ApiDefinition {
  const apiRawInlineSpec = props.apiJsonDefinition;
  const meldedDefinitionBucket = props.apiDefinitionBucket ?? props.apiDefinitionAsset?.bucket;
  const meldedDefinitionKey = props.apiDefinitionKey ?? props.apiDefinitionAsset?.s3ObjectKey;

  // Map each id and lambda function pair to the required format for the template writer custom resource
  const apiIntegrationUris = props.tokenToFunctionMap.map(apiLambdaFunction => {
    // the placeholder string that will be replaced in the OpenAPI Definition
    const uriPlaceholderString = apiLambdaFunction.id;
    // the endpoint URI of the backing lambda function, as defined in the API Gateway extensions for OpenAPI here:
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration.html
    // We know that either functionAlias or lambdaFunction must be defined, so we can use ! to satisfy Typescript
    const targetArn = apiLambdaFunction.functionAlias ? apiLambdaFunction.functionAlias.functionArn : apiLambdaFunction.lambdaFunction!.functionArn;
    const uriResolvedValue = `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}:lambda:path/2015-03-31/functions/${targetArn}/invocations`;

    return {
      id: uriPlaceholderString,
      value: uriResolvedValue
    };
  });

  let apiDefinitionWriter: resources.CreateTemplateWriterResponse | undefined;
  let newApiDefinition: apigateway.ApiDefinition | undefined;

  if (props.apiDefinitionAsset || props.apiDefinitionBucket) {
    // This custom resource will overwrite the string placeholders in the openapi definition with the resolved values of the lambda URIs
    apiDefinitionWriter = resources.createTemplateWriterCustomResource(scope, 'Api', {
      // CheckOpenapiProps() has confirmed the existence of these values
      templateBucket: meldedDefinitionBucket!,
      templateKey: meldedDefinitionKey!,
      templateValues: apiIntegrationUris,
      timeout: props.internalTransformTimeout ?? Duration.minutes(1),
      memorySize: props.internalTransformMemorySize ?? 1024
    });

    newApiDefinition = apigateway.ApiDefinition.fromBucket(
      apiDefinitionWriter.s3Bucket,
      apiDefinitionWriter.s3Key
    );
  } else if (apiRawInlineSpec) {
    newApiDefinition = InlineTemplateWriter(apiRawInlineSpec, apiIntegrationUris);
  } else {
    throw new Error("No definition provided (this code should be unreachable)");
  }

  return newApiDefinition;
}

function InlineTemplateWriter(rawInlineSpec: any, templateValues: resources.TemplateValue[]) {
  let template = JSON.stringify(rawInlineSpec);

  // This replicates logic in the template writer custom resource (resources/lib/template-writer-custom-resource/index.ts),
  // any logic changes should be made to both locations every time
  templateValues.forEach((templateValue) => {
    template = template?.replace(new RegExp(templateValue.id, 'g'), templateValue.value);
  });

  return new apigateway.InlineApiDefinition(JSON.parse(template));
}

export function MapApiIntegrationsToApiFunction(scope: Construct, apiIntegrations: ApiIntegration[]): ApiLambdaFunction[] {
    // store a counter to be able to uniquely name lambda functions to avoid naming collisions
    let lambdaCounter = 0;

    return apiIntegrations.map(rawApiIntegration => {
      if (rawApiIntegration.existingLambdaObj && isResourceAnAlias(rawApiIntegration.existingLambdaObj)) {
        return {
          id: rawApiIntegration.id,
          functionAlias: rawApiIntegration.existingLambdaObj as lambda.Alias
        };
      } else {
        return {
          id: rawApiIntegration.id,
          lambdaFunction: defaults.buildLambdaFunction(scope, {
            existingLambdaObj: rawApiIntegration.existingLambdaObj as lambda.Function,
            lambdaFunctionProps: rawApiIntegration.lambdaFunctionProps
          }, `${rawApiIntegration.id}ApiFunction${lambdaCounter++}`),
        };
      }
    });
}

export function ExtractFunctionInterface(apiFunction: ApiLambdaFunction): lambda.IFunction {
  return (apiFunction.lambdaFunction ?? apiFunction.functionAlias) as lambda.IFunction;
}

function isResourceAnAlias(lambdaResource: lambda.Function | lambda.Alias): boolean {
  return (lambdaResource as lambda.Alias).aliasName !== undefined;
}

