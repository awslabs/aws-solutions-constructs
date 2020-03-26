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

export function DefaultGlobalLambdaRestApiProps(_existingLambdaObj: lambda.Function) {
    const defaultGatewayProps: api.LambdaRestApiProps = {
        handler: _existingLambdaObj,
        options: {
            endpointTypes: [api.EndpointType.EDGE],
            cloudWatchRole: false,
            // Configure API Gateway Execution logging
            deployOptions: {
                loggingLevel: api.MethodLoggingLevel.INFO,
                dataTraceEnabled: true
            },
            defaultMethodOptions: {
                authorizationType: api.AuthorizationType.IAM
            }
        }
    };
    return defaultGatewayProps;
}

export function DefaultRegionalLambdaRestApiProps(_existingLambdaObj: lambda.Function) {
    const defaultGatewayProps: api.LambdaRestApiProps = {
        handler: _existingLambdaObj,
        options: {
            endpointTypes: [api.EndpointType.REGIONAL],
            cloudWatchRole: false,
            // Configure API Gateway Execution logging
            deployOptions: {
                loggingLevel: api.MethodLoggingLevel.INFO,
                dataTraceEnabled: true
            },
            defaultMethodOptions: {
                authorizationType: api.AuthorizationType.IAM
            }
        }
    };
    return defaultGatewayProps;
}

export function DefaultGlobalApiProps() {
    const defaultGatewayProps: api.RestApiProps = {
        endpointTypes: [api.EndpointType.EDGE],
        cloudWatchRole: false,
        // Configure API Gateway Execution logging
        deployOptions: {
            loggingLevel: api.MethodLoggingLevel.INFO,
            dataTraceEnabled: true
        },
        defaultMethodOptions: {
            authorizationType: api.AuthorizationType.IAM
        }
    };
    return defaultGatewayProps;
}