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

import * as api from 'aws-cdk-lib/aws-apigateway';
import { IntegrationResponse } from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';

/**
 * Private function to configure an api.RestApiProps
 * @param scope - the construct to which the RestApi should be attached to.
 * @param _endpointType - endpoint type for Api Gateway e.g. Regional, Global, Private
 * @param _logGroup - CW Log group for Api Gateway access logging
 */
function DefaultRestApiProps(_endpointType: api.EndpointType[], _logGroup: LogGroup): api.RestApiProps {
  return {
    endpointConfiguration: {
      types: _endpointType
    },
    cloudWatchRole: false,
    // Configure API Gateway Access logging
    deployOptions: {
      accessLogDestination: new api.LogGroupLogDestination(_logGroup),
      accessLogFormat: api.AccessLogFormat.jsonWithStandardFields(),
      loggingLevel: api.MethodLoggingLevel.INFO,
      dataTraceEnabled: false,
      tracingEnabled: true
    },
    defaultMethodOptions: {
      authorizationType: api.AuthorizationType.IAM
    }

  } as api.RestApiProps;
}

/**
 * Provides the default set of properties for Edge/Global Lambda backed RestApi
 * @param scope - the construct to which the RestApi should be attached to.
 * @param _endpointType - endpoint type for Api Gateway e.g. Regional, Global, Private
 * @param _logGroup - CW Log group for Api Gateway access logging
 */
export function DefaultGlobalLambdaRestApiProps(_existingLambdaObj: lambda.Function, _logGroup: LogGroup): api.LambdaRestApiProps {
  const baseProps: api.RestApiProps = DefaultRestApiProps([api.EndpointType.EDGE], _logGroup);

  const extraProps: api.LambdaRestApiProps = {
    handler: _existingLambdaObj,
  };

  return Object.assign(baseProps, extraProps);
}

/**
 * Provides the default set of properties for Regional Lambda backed RestApi
 * @param scope - the construct to which the RestApi should be attached to.
 * @param _endpointType - endpoint type for Api Gateway e.g. Regional, Global, Private
 * @param _logGroup - CW Log group for Api Gateway access logging
 */
export function DefaultRegionalLambdaRestApiProps(_existingLambdaObj: lambda.Function, _logGroup: LogGroup): api.LambdaRestApiProps {
  const baseProps: api.RestApiProps = DefaultRestApiProps([api.EndpointType.REGIONAL], _logGroup);

  const extraProps: api.LambdaRestApiProps = {
    handler: _existingLambdaObj,
  };

  return Object.assign(baseProps, extraProps);
}

/**
 * Provides the default set of properties for Edge/Global RestApi
 * @param _logGroup - CW Log group for Api Gateway access logging
 */
export function DefaultGlobalRestApiProps(_logGroup: LogGroup) {
  return DefaultRestApiProps([api.EndpointType.EDGE], _logGroup);
}

/**
 * Provides the default set of properties for Regional RestApi
 * @param _logGroup - CW Log group for Api Gateway access logging
 */
export function DefaultRegionalRestApiProps(_logGroup: LogGroup) {
  return DefaultRestApiProps([api.EndpointType.REGIONAL], _logGroup);
}

/**
 * @returns The set of default integration responses for status codes 200 and 500.
 */
export function DefaultIntegrationResponses(): IntegrationResponse[] {
  return [
    {
      statusCode: "200"
    },
    {
      statusCode: "500",
      responseTemplates: {
        "text/html": "Error"
      },
      selectionPattern: "500"
    }
  ];
}