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
import * as defaults from '@aws-solutions-konstruk/core';
import { Construct } from '@aws-cdk/core';
import { LogGroup } from '@aws-cdk/aws-logs';

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
    // Private variables
    private api: api.RestApi;
    private fn: lambda.Function;

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
        this.fn = defaults.buildLambdaFunction(scope, {
            deployLambda: props.deployLambda,
            existingLambdaObj: props.existingLambdaObj,
            lambdaFunctionProps: props.lambdaFunctionProps
        });

        // Setup the API Gateway
        this.api = defaults.GlobalLambdaRestApi(scope, this.fn, props.apiGatewayProps);

        // Setup the log group
        const logGroup = new LogGroup(this, 'ApiAccessLogGroup');

        // Configure API Gateway Access logging
        const stage: api.CfnStage = this.api.deploymentStage.node.findChild('Resource') as api.CfnStage;
        stage.accessLogSetting = {
            destinationArn: logGroup.logGroupArn,
            format: "$context.identity.sourceIp $context.identity.caller $context.identity.user [$context.requestTime] \"$context.httpMethod $context.resourcePath $context.protocol\" $context.status $context.responseLength $context.requestId"
        };
        const deployment: api.CfnDeployment = this.api.latestDeployment?.node.findChild('Resource') as api.CfnDeployment;
        deployment.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                    id: 'W45',
                    reason: `ApiGateway does have access logging configured as part of AWS::ApiGateway::Stage.`
                }]
            }
        };
    }

    /**
     * @summary Returns an instance of lambda.Function created by the construct.
     * @returns { lambda.Function } Instance of Function created by the construct
     * @since 0.8.0
     * @access public
     */
    public lambdaFunction(): lambda.Function {
        return this.fn;
    }

    /**
     * @summary Returns an instance of api.LambdaRestApi created by the construct.
     * @returns { api.LambdaRestApi } Instance of LambdaRestApi created by the construct
     * @since 0.8.0
     * @access public
     */
    public restApi(): api.LambdaRestApi {
        return this.api;
    }
}