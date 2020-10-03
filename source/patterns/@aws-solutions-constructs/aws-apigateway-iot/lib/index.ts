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
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import { LogGroup } from '@aws-cdk/aws-logs';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';

/**
 * The properties for the ApiGatewayIot class.
 */
export interface ApiGatewayToIotProps {
    /**
     * The AWS IoT endpoint subdomain to integrate the API Gateway with (e.g ab123cdefghij4l-ats). Added as AWS Subdomain to the Integration Request.
     *
     * @default - None.
     */
    readonly iotEndpoint: string,
    /**
     * Creates an api key and associates to usage plan if set to true
     *
     * @default - false
     */
    readonly apiGatewayCreateApiKey?: boolean,
    /**
     * The IAM role that is used by API Gateway to publish messages to IoT topics and Thing shadows.
     *
     * @default - An IAM role with iot:Publish access to all topics (topic/*) and iot:UpdateThingShadow access to all things (thing/*) is created.
     */
    readonly apiGatewayExecutionRole?: iam.IRole,
    /**
     * Optional user-provided props to override the default props for the API.
     *
     * @default - Default props are used.
     */
    readonly apiGatewayProps?: api.RestApiProps | any
}

/**
 * @summary The ApiGatewayIot class.
 */
export class ApiGatewayToIot extends Construct {
    public readonly apiGateway: api.RestApi;
    public readonly apiGatewayCloudWatchRole: iam.Role;
    public readonly apiGatewayLogGroup: LogGroup;
    public readonly apiGatewayRole: iam.IRole;
    private readonly iotEndpoint: string;
    private readonly requestValidator: api.IRequestValidator;

    /**
     * @summary Constructs a new instance of the ApiGatewayIot class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {ApiGatewayToIotProps} props - user provided props for the construct
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: ApiGatewayToIotProps) {
        super(scope, id);

        // Assignment to private members to make these available to all members of the class
        this.iotEndpoint = props.iotEndpoint.trim();

        // Mandatory params check
        if (!this.iotEndpoint || this.iotEndpoint.length < 0) {
          throw new Error('specify a valid iotEndpoint');
        }

        // Add additional params to the apiGatewayProps
        let extraApiGwProps = {
          binaryMediaTypes: ['application/octet-stream'],
          defaultMethodOptions: {
            apiKeyRequired: props.apiGatewayCreateApiKey
          }
        };

        // If apiGatewayProps are specified override the extra Api Gateway properties
        if (props.apiGatewayProps) {
          extraApiGwProps = defaults.overrideProps(props.apiGatewayProps, extraApiGwProps);
        }

        // Check whether an API Gateway execution role is specified?
        if (props.apiGatewayExecutionRole) {
          this.apiGatewayRole = props.apiGatewayExecutionRole;
        } else {
          // JSON that will be used for policy document
          const policyJSON = {
            Version: "2012-10-17",
            Statement: [
                {
                    Action: [
                        "iot:UpdateThingShadow"
                    ],
                    Resource: `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:thing/*`,
                    Effect: "Allow"
                },
                {
                    Action: [
                        "iot:Publish"
                    ],
                    Resource: `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:topic/*`,
                    Effect: "Allow"
                }
            ]
          };

          // Create a policy document
          const policyDocument: iam.PolicyDocument = iam.PolicyDocument.fromJson(policyJSON);

          // Props for IAM Role
          const iamRoleProps: iam.RoleProps = {
            assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            path: '/',
            inlinePolicies: {awsapigatewayiotpolicy: policyDocument}
          };

        // Create a policy that overrides the default policy that gets created with the construct
          this.apiGatewayRole = new iam.Role(this, 'apigateway-iot-role', iamRoleProps);
        }

        // Setup the API Gateway
        [this.apiGateway, this.apiGatewayCloudWatchRole,
            this.apiGatewayLogGroup] = defaults.GlobalRestApi(this, extraApiGwProps);

        // Validate the Query Params
        const requestValidatorProps: api.RequestValidatorProps = {
          restApi: this.apiGateway,
          validateRequestBody: false,
          validateRequestParameters: true
        };
        this.requestValidator = new api.RequestValidator(this, `aws-apigateway-iot-req-val`, requestValidatorProps);

        // Create a resource for messages '/message'
        const msgResource: api.IResource = this.apiGateway.root.addResource('message');

        // List of Integrtion Request params that needs to be added at each path level
        const integReqParams = [
          {'integration.request.path.topic-level-1': 'method.request.path.topic-level-1'},
          {'integration.request.path.topic-level-2': 'method.request.path.topic-level-2'},
          {'integration.request.path.topic-level-3': 'method.request.path.topic-level-3'},
          {'integration.request.path.topic-level-4': 'method.request.path.topic-level-4'},
          {'integration.request.path.topic-level-5': 'method.request.path.topic-level-5'},
          {'integration.request.path.topic-level-6': 'method.request.path.topic-level-6'},
          {'integration.request.path.topic-level-7': 'method.request.path.topic-level-7'}
        ];

        // List of method request params that needs to be added at each path level
        const methodReqParams = [
          {'method.request.path.topic-level-1': true},
          {'method.request.path.topic-level-2': true},
          {'method.request.path.topic-level-3': true},
          {'method.request.path.topic-level-4': true},
          {'method.request.path.topic-level-5': true},
          {'method.request.path.topic-level-6': true},
          {'method.request.path.topic-level-7': true}
        ];

        // List of Rest path segments
        const pathSegments = [
          '{topic-level-1}',
          '{topic-level-2}',
          '{topic-level-3}',
          '{topic-level-4}',
          '{topic-level-5}',
          '{topic-level-6}',
          '{topic-level-7}'
        ];

        // Create resources from '/message/{topic-level-1}' through '/message/{topic-level-1}/..../{topic-level-7}'
        let topicPath = 'topics';
        let parentNode = msgResource;
        let integParams = {};
        let methodParams = {};
        for (let pathLevel = 0; pathLevel < pathSegments.length; pathLevel++) {
          const topicResource: api.IResource = parentNode.addResource(pathSegments[pathLevel]);
          topicPath = `${topicPath}/${pathSegments[pathLevel]}`;
          integParams = Object.assign(integParams, integReqParams[pathLevel]);
          methodParams = Object.assign(methodParams, methodReqParams[pathLevel]);
          this.addResourceMethod(topicResource, topicPath, integParams, methodParams);
          parentNode = topicResource;
        }

        // Create a resource for shadow updates '/shadow'
        const shadowResource: api.IResource = this.apiGateway.root.addResource('shadow');

        // Create resource '/shadow/{thingName}'
        const defaultShadowResource: api.IResource = shadowResource.addResource('{thingName}');
        const shadowReqParams = {'integration.request.path.thingName': 'method.request.path.thingName'};
        const methodShadowReqParams = {'method.request.path.thingName': true};
        this.addResourceMethod(defaultShadowResource, 'things/{thingName}/shadow',
                                shadowReqParams, methodShadowReqParams);

        // Create resource '/shadow/{thingName}/{shadowName}'
        const namedShadowResource: api.IResource = defaultShadowResource.addResource('{shadowName}');
        const namedShadowReqParams = Object.assign({
          'integration.request.path.shadowName': 'method.request.path.shadowName'},
          shadowReqParams);
        const methodNamedShadowReqParams = Object.assign({
          'method.request.path.shadowName': true}, methodShadowReqParams);
        // For some reason path mapping to 'things/{thingName}/shadow/name/{shadowName}' results in 403 error, hence this shortcut
        this.addResourceMethod(namedShadowResource, 'topics/$aws/things/{thingName}/shadow/name/{shadowName}/update',
                                namedShadowReqParams, methodNamedShadowReqParams);
    }

    /**
     * Adds a method to specified resource
     * @param resource API Gateway resource to which this method is added
     * @param resourcePath path of resource from root
     * @param integReqParams request paramters for the Integration method
     * @param methodReqParams request parameters at Method level
     */
    private addResourceMethod(resource: api.IResource, resourcePath: string,
                              integReqParams: {[key: string]: string},
                              methodReqParams: {[key: string]: boolean}) {
      const integResp: api.IntegrationResponse[] = [
        {
          statusCode: "200",
          selectionPattern: "2\\d{2}",
          responseTemplates : {
            "application/json": "$input.json('$')"
          }
        },
        {
          statusCode: "500",
          selectionPattern: "5\\d{2}",
          responseTemplates : {
            "application/json": "$input.json('$')"
          }
        },
        {
          statusCode: "403",
          responseTemplates : {
            "application/json": "$input.json('$')"
          }
        }
      ];

      // Method responses for the resource
      const methodResp: api.MethodResponse[] = [
        {
          statusCode: "200"
        },
        {
          statusCode: "500"
        },
        {
          statusCode: "403"
        }
      ];

      // Override the default Integration Request Props
      const integrationReqProps = {
        subdomain: this.iotEndpoint,
        options: {
          requestParameters: integReqParams,
          integrationResponses: integResp,
          passthroughBehavior: api.PassthroughBehavior.WHEN_NO_MATCH
        }
      };

      // Override the default Method Options
      const resourceMethodOptions = {
        requestParameters: methodReqParams,
        methodResponses: methodResp,
      };

      const resourceMethodParams: defaults.AddProxyMethodToApiResourceInputParams = {
        service: 'iotdata',
        path: resourcePath,
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: 'POST',
        apiResource: resource,
        requestTemplate: "$input.json('$')",
        requestValidator: this.requestValidator,
        awsIntegrationProps: integrationReqProps,
        methodOptions: resourceMethodOptions
      };

      defaults.addProxyMethodToApiResource(resourceMethodParams);
    }
}