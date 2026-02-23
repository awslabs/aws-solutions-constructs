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

// Imports
import { Stack, Aws } from 'aws-cdk-lib';
import { ApiGatewayToSageMakerEndpoint, ApiGatewayToSageMakerEndpointProps } from '../lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template } from 'aws-cdk-lib/assertions';

test('Test construct properties', () => {
  const stack = new Stack();
  const pattern = new ApiGatewayToSageMakerEndpoint(stack, 'api-gateway-sagemakerendpoint', {
    endpointName: 'my-endpoint',
    resourcePath: '{my_param}',
    requestMappingTemplate: 'my-request-vtl-template'
  });

  expect(pattern.apiGateway).toBeDefined();
  expect(pattern.apiGatewayRole).toBeDefined();
  expect(pattern.apiGatewayCloudWatchRole).toBeDefined();
  expect(pattern.apiGatewayLogGroup).toBeDefined();
});

test('Test deployment w/ overwritten properties', () => {
  const stack = new Stack();

  const existingRole = new iam.Role(stack, 'api-gateway-role', {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    description: 'existing role for SageMaker integration',
    inlinePolicies: {
      InvokePolicy: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          resources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:endpoint/my-endpoint`],
          actions: ['sagemaker:InvokeEndpoint']
        })]
      })
    }
  });

  new ApiGatewayToSageMakerEndpoint(stack, 'api-gateway-sagemakerendpoint', {
    endpointName: 'my-endpoint',
    resourcePath: '{my_param}',
    requestMappingTemplate: 'my-request-vtl-template',

    apiGatewayProps: {
      restApiName: 'my-api',
      deployOptions: {
        methodOptions: {
          '/*/*': {
            throttlingRateLimit: 100,
            throttlingBurstLimit: 25
          }
        }
      }
    },
    apiGatewayExecutionRole: existingRole,
    resourceName: 'my-resource',
    responseMappingTemplate: 'my-response-vtl-template'
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Stage', {
    MethodSettings: [
      {
        DataTraceEnabled: false,
        HttpMethod: '*',
        LoggingLevel: 'INFO',
        ResourcePath: '/*'
      },
      {
        HttpMethod: '*',
        ResourcePath: '/*',
        ThrottlingRateLimit: 100,
        ThrottlingBurstLimit: 25
      }
    ]
  });

  template.hasResourceProperties('AWS::ApiGateway::Resource', {
    PathPart: 'my-resource'
  });

  template.hasResourceProperties('AWS::ApiGateway::Method', {
    Integration: {
      IntegrationResponses: [
        {
          ResponseTemplates: {
            'application/json': 'my-response-vtl-template',
          },
          StatusCode: '200'
        },
        {
          StatusCode: '500',
          SelectionPattern: '5\\d{2}'
        },
        {
          StatusCode: '400',
          SelectionPattern: '4\\d{2}'
        }
      ]
    },
    MethodResponses: [
      { StatusCode: '200' },
      { StatusCode: '500' },
      { StatusCode: '400' }
    ]
  });

  template.hasResourceProperties('AWS::IAM::Role', {
    Description: 'existing role for SageMaker integration'
  });

  template.resourceCountIs('AWS::ApiGateway::UsagePlan', 1);
});

test('Construct accepts additional read request templates', () => {
  const stack = new Stack();
  new ApiGatewayToSageMakerEndpoint(stack, 'api-gateway-sagemaker-endpoint', {
    endpointName: 'my-endpoint',
    resourcePath: '{my_param}',
    requestMappingTemplate: 'my-request-vtl-template',
    additionalRequestTemplates: {
      'text/plain': 'additional-request-template'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'GET',
    Integration: {
      RequestTemplates: {
        'application/json': 'my-request-vtl-template',
        'text/plain': 'additional-request-template'
      }
    }
  });
});

test('Confirm call to CheckApiProps', () => {
  // Initial Setup
  const stack = new Stack();

  const props: ApiGatewayToSageMakerEndpointProps = {
    apiGatewayProps: {
      defaultMethodOptions: {
        apiKeyRequired: true
      },
    },
    endpointName: 'my-endpoint',
    resourcePath: '{my_param}',
    requestMappingTemplate: 'my-request-vtl-template',
    createUsagePlan: false,
  };
  const app = () => {
    new ApiGatewayToSageMakerEndpoint(stack, 'test-apigateway-sagemaker', props);
  };
  // Assertion
  expect(app).toThrow('Error - if API key is required, then the Usage plan must be created\n');
});

test('Confirm suppression of Usage Plan', () => {
  // Initial Setup
  const stack = new Stack();
  const props: ApiGatewayToSageMakerEndpointProps = {
    endpointName: 'my-endpoint',
    resourcePath: '{my_param}',
    requestMappingTemplate: 'my-request-vtl-template',
    createUsagePlan: false
  };
  new ApiGatewayToSageMakerEndpoint(stack, 'test-apigateway-sagemaker', props);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ApiGateway::UsagePlan', 0);
});
