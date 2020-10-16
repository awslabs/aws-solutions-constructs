/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
import { Aws, Construct } from '@aws-cdk/core';
import { LogGroup } from '@aws-cdk/aws-logs';

/**
 * @summary The properties for the ApiGatewayToSageMakerEndpointProps class.
 */
export interface ApiGatewayToSageMakerEndpointProps {
    /**
     * Optional user-provided props to override the default props for the API Gateway.
     *
     * @default - Default properties are used.
     */
    readonly apiGatewayProps?: api.RestApiProps,

    /**
     * Optional IAM role that is used by API Gateway to invoke the SageMaker endpoint.
     *
     * @default - An IAM role with sagemaker:InvokeEndpoint access to `endpointName` is created.
     */
    readonly apiGatewayExecutionRole?: iam.Role,

    /**
     * Name of the deployed SageMaker inference endpoint.
     *
     * @default - None.
     */
    readonly endpointName: string,

    /**
     * Optional resource name where the GET method will be available.
     *
     * @default - None.
     */
    readonly resourceName?: string,

    /**
     * Resource path for the GET method. The variable defined here can be referenced in `requestMappingTemplate`.
     *
     * @default - None.
     */
    readonly resourcePath: string,

    /**
     * Mapping template to convert GET requests received on the REST API to POST requests expected by the SageMaker endpoint.
     *
     * @default - None.
     */
    readonly requestMappingTemplate: string,

    /**
     * Optional mapping template to convert responses received from the SageMaker endpoint.
     *
     * @default - None.
     */
    readonly responseMappingTemplate?: string
}

/**
 * @summary The ApiGatewayToSageMakerEndpoint class.
 */
export class ApiGatewayToSageMakerEndpoint extends Construct {
    public readonly apiGateway: api.RestApi;
    public readonly apiGatewayRole: iam.Role;
    public readonly apiGatewayCloudWatchRole: iam.Role;
    public readonly apiGatewayLogGroup: LogGroup;

    /**
     * @summary Constructs a new instance of the ApiGatewayToSageMakerEndpoint class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {ApiGatewayToSageMakerEndpointProps} props - user provided props for the construct.
     * @since 1.67.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: ApiGatewayToSageMakerEndpointProps) {
        super(scope, id);

        // Setup the API Gateway
        [this.apiGateway, this.apiGatewayCloudWatchRole, this.apiGatewayLogGroup] = defaults.GlobalRestApi(this, props.apiGatewayProps);

        // Setup the API Gateway role
        if (props.apiGatewayExecutionRole !== undefined) {
            this.apiGatewayRole = props.apiGatewayExecutionRole;
        } else {
            this.apiGatewayRole = new iam.Role(this, 'api-gateway-role', {
                assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
            });

            // Setup the IAM policy for SageMaker endpoint
            const invokePolicy = new iam.Policy(this, 'InvokeEndpointPolicy', {
                statements: [
                    new iam.PolicyStatement({
                        actions: ['sagemaker:InvokeEndpoint'],
                        resources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:endpoint/${props.endpointName}`]
                    })
                ]
            });

            invokePolicy.attachToRole(this.apiGatewayRole);
        }

        // Setup request validation
        const requestValidator = this.apiGateway.addRequestValidator('request-validator', {
            requestValidatorName: 'request-param-validator',

            // Setting this property to true makes sure the following are validated:
            // - Required request parameters in the URI
            // - Query string
            // - Headers
            validateRequestParameters: true
        });

        // Setup method and integration responses
        const methodResponses: api.MethodResponse[] = [
            { statusCode: '200' },
            { statusCode: '500' },
            { statusCode: '400' }
        ];

        const integResponses: api.IntegrationResponse[] = [];
        if (props.responseMappingTemplate !== undefined) {
            integResponses.push({
                statusCode: '200',
                responseTemplates: { 'application/json': props.responseMappingTemplate }
            });
        } else {
            integResponses.push({ statusCode: '200' });
        }

        integResponses.push(
            { statusCode: '500', selectionPattern: '5\\d{2}' },
            { statusCode: '400', selectionPattern: '4\\d{2}' }
        );

        // The SageMaker integration can be added either at the root of the API (GET https://execute-api.amazonaws.com/{some-param}),
        // or as a sub-resource (GET https://execute-api.amazonaws.com/inference/{some-param}).
        // The following lines will make sure only the necessary resources are created.
        let apiResource = this.apiGateway.root;
        if (props.resourceName !== undefined) {
            apiResource = apiResource.addResource(props.resourceName);
        }
        apiResource = apiResource.addResource(props.resourcePath);

        // Setup API Gateway method
        defaults.addProxyMethodToApiResource({
            service: 'runtime.sagemaker',
            path: `endpoints/${props.endpointName}/invocations`,
            apiGatewayRole: this.apiGatewayRole,
            apiMethod: 'GET',
            apiResource,
            requestValidator,
            requestTemplate: props.requestMappingTemplate,
            awsIntegrationProps: {
                options: { integrationResponses: integResponses }
            },
            methodOptions: { methodResponses }
        });
    }
}
