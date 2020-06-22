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

// Imports
import * as api from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';

/**
 * The properties for the ApiGatewayToLambda class.
 */
export interface ApiGatewayToLambdaProps {
    /**
     * Whether to create a new Lambda function or use an existing Lambda function.
     * If set to false, you must provide an existing function for the `existingLambdaObj` property.
     *
     * @default - true
     */
    readonly deployLambda: boolean,
    /**
     * An optional, existing Lambda function.
     * This property is required if `deployLambda` is set to false.
     *
     * @default - None
     */
    readonly existingLambdaObj?: lambda.Function,
    /**
     * Optional user-provided props to override the default props for the Lambda function.
     * This property is only required if `deployLambda` is set to true.
     *
     * @default - Default props are used.
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps | any
    /**
     * Optional user-provided props to override the default props for the API.
     *
     * @default - Default props are used.
     */
    readonly apiGatewayProps?: api.LambdaRestApiProps | any
}

/**
 * @summary The ApiGatewayToLambda class.
 */
export class ApiGatewayToLambda extends Construct {
    public readonly apiGateway: api.RestApi;
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

        // Setup the Lambda function
        this.lambdaFunction = defaults.buildLambdaFunction(this, {
            deployLambda: props.deployLambda,
            existingLambdaObj: props.existingLambdaObj,
            lambdaFunctionProps: props.lambdaFunctionProps
        });

        // Setup the API Gateway
        this.apiGateway = defaults.GlobalLambdaRestApi(this, this.lambdaFunction, props.apiGatewayProps);
    }
}