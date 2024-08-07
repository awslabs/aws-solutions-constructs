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

// Imports
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apiDefaults from './apigateway-defaults';
import { buildLogGroup } from './cloudwatch-log-group-helper';
import { addCfnGuardSuppressRules, addCfnSuppressRules, consolidateProps } from './utils';
import { IRole } from 'aws-cdk-lib/aws-iam';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * Create and configures access logging for API Gateway resources.
 * @param scope - the construct to which the access logging capabilities should be attached to.
 * @param api - an existing api.RestApi or api.LambdaRestApi.
 */
function configureCloudwatchRoleForApi(scope: Construct, api: apigateway.RestApiBase): iam.Role {
  // Setup the IAM Role for API Gateway CloudWatch access
  const restApiCloudwatchRole = new iam.Role(scope, 'LambdaRestApiCloudWatchRole', {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    inlinePolicies: {
      LambdaRestApiCloudWatchRolePolicy: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
            'logs:PutLogEvents',
            'logs:GetLogEvents',
            'logs:FilterLogEvents'
          ],
          resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`]
        })]
      })
    }
  });
  // Create and configure AWS::ApiGateway::Account with CloudWatch Role for ApiGateway
  const CfnApi = api.node.findChild('Resource') as apigateway.CfnRestApi;
  const cfnAccount: apigateway.CfnAccount = new apigateway.CfnAccount(scope, 'LambdaRestApiAccount', {
    cloudWatchRoleArn: restApiCloudwatchRole.roleArn
  });
  cfnAccount.addDependency(CfnApi);

  // Suppress Cfn Nag warning for APIG
  const deployment: apigateway.CfnDeployment = api.latestDeployment?.node.findChild('Resource') as apigateway.CfnDeployment;
  addCfnSuppressRules(deployment, [
    {
      id: 'W45',
      reason: `ApiGateway has AccessLogging enabled in AWS::ApiGateway::Stage resource, but cfn_nag checks for it in AWS::ApiGateway::Deployment resource`
    }
  ]);

  addCfnGuardSuppressRules(restApiCloudwatchRole, ["IAM_NO_INLINE_POLICY_CHECK"]);
  // Return the CW Role
  return restApiCloudwatchRole;
}

interface ConfigureLambdaRestApiResponse {
  api: apigateway.RestApi,
  role?: iam.Role
}

/**
 * Creates and configures an api.LambdaRestApi.
 * @param scope - the construct to which the LambdaRestApi should be attached to.
 * @param defaultApiGatewayProps - the default properties for the LambdaRestApi.
 * @param apiGatewayProps - (optional) user-specified properties to override the default properties.
 */
function configureLambdaRestApi(scope: Construct, defaultApiGatewayProps: apigateway.LambdaRestApiProps,
  apiGatewayProps?: apigateway.LambdaRestApiProps): ConfigureLambdaRestApiResponse {

  // API Gateway doesn't allow both endpointTypes and endpointConfiguration, check whether endPointTypes exists
  if (apiGatewayProps?.endpointTypes) {
    throw Error('Solutions Constructs internally uses endpointConfiguration, use endpointConfiguration instead of endpointTypes');
  }

  // Define the API object
  let api: apigateway.RestApi;
  if (apiGatewayProps) {
    // If property overrides have been provided, incorporate them and deploy
    const consolidatedApiGatewayProps = consolidateProps(defaultApiGatewayProps, apiGatewayProps, { cloudWatchRole: false });
    api = new apigateway.LambdaRestApi(scope, 'LambdaRestApi', consolidatedApiGatewayProps);
  } else {
    // If no property overrides, deploy using the default configuration
    api = new apigateway.LambdaRestApi(scope, 'LambdaRestApi', defaultApiGatewayProps);
  }
  // Configure API access logging
  const cwRole = (apiGatewayProps?.cloudWatchRole !== false) ? configureCloudwatchRoleForApi(scope, api) : undefined;

  addCfnGuardSuppressRules(api.deploymentStage, ["API_GW_CACHE_ENABLED_AND_ENCRYPTED"]);

  // Configure Usage Plan
  const usagePlanProps: apigateway.UsagePlanProps = {
    apiStages: [{
      api,
      stage: api.deploymentStage
    }]
  };

  const plan = api.addUsagePlan('UsagePlan', usagePlanProps);

  // If requireApiKey param is set to true, create a api key & associate to Usage Plan
  if (apiGatewayProps?.defaultMethodOptions?.apiKeyRequired === true) {
    // Configure Usage Plan with API Key
    const key = api.addApiKey('ApiKey');
    plan.addApiKey(key);
  }

  // Return the API and CW Role
  return { api, role: cwRole};
}

interface ConfigureRestApiResponse {
  api: apigateway.RestApi,
  role?: iam.Role
}

/**
 * Creates and configures an api.RestApi.
 * @param scope - the construct to which the RestApi should be attached to.
 * @param defaultApiGatewayProps - the default properties for the RestApi.
 * @param apiGatewayProps - (optional) user-specified properties to override the default properties.
 */
function configureRestApi(scope: Construct, defaultApiGatewayProps: apigateway.RestApiProps,
  apiGatewayProps?: apigateway.RestApiProps): ConfigureRestApiResponse {

  // API Gateway doesn't allow both endpointTypes and endpointConfiguration, check whether endPointTypes exists
  if (apiGatewayProps?.endpointTypes) {
    throw Error('Solutions Constructs internally uses endpointConfiguration, use endpointConfiguration instead of endpointTypes');
  }

  const consolidatedApiGatewayProps = consolidateProps(defaultApiGatewayProps, apiGatewayProps, { cloudWatchRole: false });
  const api = new apigateway.RestApi(scope, 'RestApi', consolidatedApiGatewayProps);

  addCfnGuardSuppressRules(api.deploymentStage, ["API_GW_CACHE_ENABLED_AND_ENCRYPTED"]);

  let cwRole;

  // Configure API access logging
  if (apiGatewayProps?.cloudWatchRole !== false) {
    cwRole = configureCloudwatchRoleForApi(scope, api);
  }

  // Configure Usage Plan
  const usagePlanProps: apigateway.UsagePlanProps = {
    apiStages: [{
      api,
      stage: api.deploymentStage
    }]
  };

  const plan = api.addUsagePlan('UsagePlan', usagePlanProps);

  // If requireApiKey param is set to true, create a api key & associate to Usage Plan
  if (apiGatewayProps?.defaultMethodOptions?.apiKeyRequired === true) {
    // Configure Usage Plan with API Key
    const key = api.addApiKey('ApiKey');
    plan.addApiKey(key);
  }

  // Return the API and CW Role
  return { api, role: cwRole };
}

export interface GlobalLambdaRestApiResponse {
  readonly api: apigateway.RestApi,
  readonly role?: iam.Role,
  readonly group: logs.LogGroup
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Builds and returns a global api.RestApi designed to be used with an AWS Lambda function.
 * @param scope - the construct to which the RestApi should be attached to.
 * @param _existingLambdaObj - an existing AWS Lambda function.
 * @param apiGatewayProps - (optional) user-specified properties to override the default properties.
 */
export function GlobalLambdaRestApi(scope: Construct, _existingLambdaObj: lambda.Function,
  apiGatewayProps?: apigateway.LambdaRestApiProps, logGroupProps?: logs.LogGroupProps): GlobalLambdaRestApiResponse {
  // Configure log group for API Gateway AccessLogging
  const logGroup = buildLogGroup(scope, 'ApiAccessLogGroup', logGroupProps);

  const defaultProps = apiDefaults.DefaultGlobalLambdaRestApiProps(_existingLambdaObj, logGroup);
  const configureLambdaRestApiResponse = configureLambdaRestApi(scope, defaultProps, apiGatewayProps);
  return { api: configureLambdaRestApiResponse.api, role: configureLambdaRestApiResponse.role, group: logGroup};
}

export interface RegionalLambdaRestApiResponse {
  readonly api: apigateway.RestApi,
  readonly role?: iam.Role,
  readonly group: logs.LogGroup,
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Builds and returns a regional api.RestApi designed to be used with an AWS Lambda function.
 * @param scope - the construct to which the RestApi should be attached to.
 * @param existingLambdaObj - an existing AWS Lambda function.
 * @param apiGatewayProps - (optional) user-specified properties to override the default properties.
 */
export function RegionalLambdaRestApi(scope: Construct, existingLambdaObj: lambda.Function,
  apiGatewayProps?: apigateway.LambdaRestApiProps,
  logGroupProps?: logs.LogGroupProps,
  useDefaultAuth: boolean = true): RegionalLambdaRestApiResponse {
  // Configure log group for API Gateway AccessLogging
  const logGroup = buildLogGroup(scope, 'ApiAccessLogGroup', logGroupProps);

  const defaultProps = apiDefaults.DefaultRegionalLambdaRestApiProps(existingLambdaObj, logGroup, useDefaultAuth);
  const configureLambdaRestApiResponse = configureLambdaRestApi(scope, defaultProps, apiGatewayProps);
  return { api: configureLambdaRestApiResponse.api, role: configureLambdaRestApiResponse.role, group: logGroup};
}

export interface GlobalRestApiResponse {
  readonly api: apigateway.RestApi,
  readonly role?: iam.Role,
  readonly logGroup: logs.LogGroup,
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Builds and returns a standard api.RestApi.
 * @param scope - the construct to which the RestApi should be attached to.
 * @param apiGatewayProps - (optional) user-specified properties to override the default properties.
 */
export function GlobalRestApi(scope: Construct, apiGatewayProps?: apigateway.RestApiProps,
  logGroupProps?: logs.LogGroupProps): GlobalRestApiResponse {
  // Configure log group for API Gateway AccessLogging
  const logGroup = buildLogGroup(scope, 'ApiAccessLogGroup', logGroupProps);

  const defaultProps = apiDefaults.DefaultGlobalRestApiProps(logGroup);
  const configureRestApiResponse = configureRestApi(scope, defaultProps, apiGatewayProps);
  return { api: configureRestApiResponse.api, role: configureRestApiResponse.role, logGroup };
}

export interface RegionalRestApiResponse {
  readonly api: apigateway.RestApi,
  readonly role?: iam.Role,
  readonly logGroup: logs.LogGroup,
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Builds and returns a Regional api.RestApi.
 * @param scope - the construct to which the RestApi should be attached to.
 * @param apiGatewayProps - (optional) user-specified properties to override the default properties.
 */
export function RegionalRestApi(scope: Construct, apiGatewayProps?: apigateway.RestApiProps,
  logGroupProps?: logs.LogGroupProps): RegionalRestApiResponse {
  // Configure log group for API Gateway AccessLogging
  const logGroup = buildLogGroup(scope, 'ApiAccessLogGroup', logGroupProps);

  const defaultProps = apiDefaults.DefaultRegionalRestApiProps(logGroup);
  const configureRestApiResponse = configureRestApi(scope, defaultProps, apiGatewayProps);
  return { api: configureRestApiResponse.api, role: configureRestApiResponse.role, logGroup };
}

export interface CreateSpecRestApiResponse {
  readonly api: apigateway.SpecRestApi,
  readonly role?: iam.Role,
  readonly logGroup: logs.LogGroup,
}

export function CreateSpecRestApi(
  scope: Construct,
  apiGatewayProps: apigateway.SpecRestApiProps,
  logGroupProps?: logs.LogGroupProps): CreateSpecRestApiResponse {

  const logGroup = buildLogGroup(scope, 'ApiAccessLogGroup', logGroupProps);
  const defaultProps = apiDefaults.DefaultSpecRestApiProps(scope, logGroup);

  // Define the API object
  let api: apigateway.SpecRestApi;
  // If property overrides have been provided, incorporate them and deploy
  const consolidatedApiGatewayProps = consolidateProps(defaultProps, apiGatewayProps, { cloudWatchRole: false });
  api = new apigateway.SpecRestApi(scope, 'SpecRestApi', consolidatedApiGatewayProps);
  // Configure API access logging
  const cwRole = (apiGatewayProps?.cloudWatchRole !== false) ? configureCloudwatchRoleForApi(scope, api) : undefined;

  addCfnGuardSuppressRules(api.deploymentStage, ["API_GW_CACHE_ENABLED_AND_ENCRYPTED"]);

  // Configure Usage Plan
  const usagePlanProps: apigateway.UsagePlanProps = {
    apiStages: [{
      api,
      stage: api.deploymentStage
    }]
  };

  api.addUsagePlan('UsagePlan', usagePlanProps);

  return { api, role: cwRole, logGroup};
}

export interface AddProxyMethodToApiResourceInputParams {
  readonly service: string,
  readonly action?: string,
  readonly path?: string,
  readonly apiResource: apigateway.IResource,
  readonly apiMethod: string,
  readonly apiGatewayRole: IRole,
  readonly requestTemplate: string,
  readonly additionalRequestTemplates?: { [contentType: string]: string; },
  readonly integrationResponses?: cdk.aws_apigateway.IntegrationResponse[],
  readonly contentType?: string,
  readonly awsIntegrationProps?: apigateway.AwsIntegrationProps | any,
  readonly methodOptions?: apigateway.MethodOptions
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function addProxyMethodToApiResource(params: AddProxyMethodToApiResourceInputParams): apigateway.Method {
  // Make sure the user hasn't also specified the application/json content-type in the additionalRequestTemplates optional property
  if (params.additionalRequestTemplates && 'application/json' in params.additionalRequestTemplates) {
    throw new Error(`Request Template for the application/json content-type must be specified in the requestTemplate property and not in the additionalRequestTemplates property `);
  }

  const requestTemplates = {
    "application/json": params.requestTemplate,
    ...params.additionalRequestTemplates
  };

  // Use user-provided integration responses, otherwise fallback to the default ones we provide.
  const integrationResponses = params.integrationResponses ?? apiDefaults.DefaultIntegrationResponses();

  let baseProps: apigateway.AwsIntegrationProps = {
    service: params.service,
    integrationHttpMethod: "POST",
    options: {
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      credentialsRole: params.apiGatewayRole,
      requestParameters: {
        "integration.request.header.Content-Type": params.contentType ? params.contentType : "'application/json'"
      },
      requestTemplates,
      integrationResponses
    }
  };

  let extraProps;

  if (params.action) {
    extraProps = {
      action: params.action
    };
  } else if (params.path) {
    extraProps = {
      path: params.path
    };
  } else {
    throw Error('Either action or path is required');
  }

  // Setup the API Gateway AWS Integration
  baseProps = Object.assign(baseProps, extraProps);

  let apiGatewayIntegration;
  const newProps = consolidateProps(baseProps, params.awsIntegrationProps);

  apiGatewayIntegration = new apigateway.AwsIntegration(newProps);

  const defaultMethodOptions = {
    methodResponses: [
      {
        statusCode: "200",
        responseParameters: {
          "method.response.header.Content-Type": true
        }
      },
      {
        statusCode: "500",
        responseParameters: {
          "method.response.header.Content-Type": true
        },
      }
    ]
  };

  // Setup the API Gateway method
  const overriddenProps = consolidateProps(defaultMethodOptions, params.methodOptions);
  return params.apiResource.addMethod(params.apiMethod, apiGatewayIntegration, overriddenProps);
}