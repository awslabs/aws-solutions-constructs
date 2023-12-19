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

import * as api from 'aws-cdk-lib/aws-apigateway';
import { IntegrationResponse } from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { generatePhysicalName } from './utils';

/**
 * Private function to configure an api.RestApiProps
 * @param scope - the construct to which the RestApi should be attached to.
 * @param endpointType - endpoint type for Api Gateway e.g. Regional, Global, Private
 * @param logGroup - CW Log group for Api Gateway access logging
 */
function DefaultRestApiProps(endpointType: api.EndpointType[], logGroup: LogGroup, includeAuth: boolean = true): api.RestApiProps {
  return {
    endpointConfiguration: {
      types: endpointType
    },
    cloudWatchRole: false,
    // Configure API Gateway Access logging
    deployOptions: {
      accessLogDestination: new api.LogGroupLogDestination(logGroup),
      accessLogFormat: api.AccessLogFormat.jsonWithStandardFields(),
      loggingLevel: api.MethodLoggingLevel.INFO,
      dataTraceEnabled: false,
      tracingEnabled: true
    },
    defaultMethodOptions: {
      authorizationType: includeAuth ? api.AuthorizationType.IAM : undefined
    }

  } as api.RestApiProps;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
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
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Provides the default set of properties for Regional Lambda backed RestApi
 * @param scope - the construct to which the RestApi should be attached to.
 * @param _endpointType - endpoint type for Api Gateway e.g. Regional, Global, Private
 * @param logGroup - CW Log group for Api Gateway access logging
 */
export function DefaultRegionalLambdaRestApiProps(existingLambdaObj: lambda.Function,
  logGroup: LogGroup,
  includeAuth: boolean = true): api.LambdaRestApiProps {
  const baseProps: api.RestApiProps = DefaultRestApiProps([api.EndpointType.REGIONAL], logGroup, includeAuth);

  const extraProps: api.LambdaRestApiProps = {
    handler: existingLambdaObj,
  };

  return Object.assign(baseProps, extraProps);
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Provides the default set of properties for Edge/Global RestApi
 * @param _logGroup - CW Log group for Api Gateway access logging
 */
export function DefaultGlobalRestApiProps(_logGroup: LogGroup) {
  return DefaultRestApiProps([api.EndpointType.EDGE], _logGroup);
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Provides the default set of properties for Regional RestApi
 * @param _logGroup - CW Log group for Api Gateway access logging
 */
export function DefaultRegionalRestApiProps(_logGroup: LogGroup) {
  return DefaultRestApiProps([api.EndpointType.REGIONAL], _logGroup);
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Provides the default set of properties for SpecRestApi
 * @param logGroup - CloudWatch Log Group for Api Gateway Access Logging
 */
export function DefaultSpecRestApiProps(scope: Construct, logGroup: LogGroup): api.RestApiBaseProps {
  return {
    cloudWatchRole: false,
    deployOptions: {
      accessLogDestination: new api.LogGroupLogDestination(logGroup),
      accessLogFormat: api.AccessLogFormat.jsonWithStandardFields(),
      loggingLevel: api.MethodLoggingLevel.INFO,
      dataTraceEnabled: false,
      tracingEnabled: true
    },
    restApiName: generatePhysicalName("", [ scope.node.id ], 255),
  };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
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