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
import * as cdk from "aws-cdk-lib";
import { ApiGatewayToIot, ApiGatewayToIotProps } from "../lib";
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template } from "aws-cdk-lib/assertions";

// --------------------------------------------------------------
// Check for ApiGateway params
// --------------------------------------------------------------
test('Test for default Params construct props', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const props: ApiGatewayToIotProps = {
    iotEndpoint: `a1234567890123-ats`
  };
  const construct = new ApiGatewayToIot(stack, 'test-apigateway-iot-default-params', props);
  // Assertion
  expect(construct.apiGateway).not.toBeNull();
  expect(construct.apiGatewayCloudWatchRole).not.toBeNull();
  expect(construct.apiGatewayLogGroup).not.toBeNull();
  expect(construct.apiGatewayRole).not.toBeNull();
});

// --------------------------------------------------------------
// Check for Default IAM Role
// --------------------------------------------------------------
test('Test for default IAM Role', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const props: ApiGatewayToIotProps = {
    iotEndpoint: `a1234567890123-ats`
  };
  new ApiGatewayToIot(stack, 'test-apigateway-iot-default-iam-role', props);
  // Check whether default IAM role is created to access IoT core
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Role", {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "apigateway.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    },
    Path: "/",
    Policies: [
      {
        PolicyDocument: {
          Statement: [
            {
              Action: "iot:UpdateThingShadow",
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":iot:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":thing/*"
                  ]
                ]
              }
            },
            {
              Action: "iot:Publish",
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":iot:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":topic/*"
                  ]
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "awsapigatewayiotpolicy"
      }
    ]
  });
});

// --------------------------------------------------------------
// Check for Request Validator
// --------------------------------------------------------------
test('Test for default Params request validator', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const props: ApiGatewayToIotProps = {
    iotEndpoint: `a1234567890123-ats`
  };
  new ApiGatewayToIot(stack, 'test-apigateway-iot-request-validator', props);
  // Assertion
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::RequestValidator", {
    ValidateRequestBody: false,
    ValidateRequestParameters: true,
  });
});

// --------------------------------------------------------------
// Check for Integ Props and Method Props
// --------------------------------------------------------------
test('Test for default Params Integ Props and Method Props', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const props: ApiGatewayToIotProps = {
    iotEndpoint: `a1234567890123-ats`
  };
  new ApiGatewayToIot(stack, 'test-apigateway-iot-integpros-methodprops', props);

  // Assertion for {topic-level-7} to ensure all Integration Request Params, Integration Responses,
  // Method Request Params and Method Reposes are intact
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "POST",
    AuthorizationType: "AWS_IAM",
    Integration: {
      IntegrationHttpMethod: "POST",
      IntegrationResponses: [
        {
          ResponseTemplates: {
            "application/json": "$input.json('$')"
          },
          SelectionPattern: "2\\d{2}",
          StatusCode: "200"
        },
        {
          ResponseTemplates: {
            "application/json": "$input.json('$')"
          },
          SelectionPattern: "5\\d{2}",
          StatusCode: "500"
        },
        {
          ResponseTemplates: {
            "application/json": "$input.json('$')"
          },
          StatusCode: "403"
        }
      ],
      PassthroughBehavior: "WHEN_NO_MATCH",
      RequestParameters: {
        "integration.request.path.topic-level-1": "method.request.path.topic-level-1",
        "integration.request.path.topic-level-2": "method.request.path.topic-level-2",
        "integration.request.path.topic-level-3": "method.request.path.topic-level-3",
        "integration.request.path.topic-level-4": "method.request.path.topic-level-4",
        "integration.request.path.topic-level-5": "method.request.path.topic-level-5",
        "integration.request.path.topic-level-6": "method.request.path.topic-level-6",
        "integration.request.path.topic-level-7": "method.request.path.topic-level-7"
      },
      RequestTemplates: {
        "application/json": "$input.json('$')"
      },
      Type: "AWS",
      Uri: {
        "Fn::Join": [
          "",
          [
            "arn:",
            {
              Ref: "AWS::Partition"
            },
            ":apigateway:",
            {
              Ref: "AWS::Region"
            },
            `:${props.iotEndpoint}.iotdata:path/topics/{topic-level-1}/{topic-level-2}/{topic-level-3}/{topic-level-4}/{topic-level-5}/{topic-level-6}/{topic-level-7}`
          ]
        ]
      }
    },
    MethodResponses: [
      {
        StatusCode: "200"
      },
      {
        StatusCode: "500"
      },
      {
        StatusCode: "403"
      }
    ],
    RequestParameters: {
      "method.request.path.topic-level-1": true,
      "method.request.path.topic-level-2": true,
      "method.request.path.topic-level-3": true,
      "method.request.path.topic-level-4": true,
      "method.request.path.topic-level-5": true,
      "method.request.path.topic-level-6": true,
      "method.request.path.topic-level-7": true
    }
  });
});

// --------------------------------------------------------------
// Check for valid IoT Endpoint
// --------------------------------------------------------------
test('Test for valid iot endpoint', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const props: ApiGatewayToIotProps = {
    iotEndpoint: ' '
  };

  const app = () => {
    new ApiGatewayToIot(stack, 'test-apigateway-iot-no-endpoint', props);
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// Check for binaryMediaTypes
// --------------------------------------------------------------
test('Test for Binary Media types', () => {
  // Stack
  const stack = new cdk.Stack();
  // Helper declaration
  new ApiGatewayToIot(stack, 'test-apigateway-iot-binaryMediaTypes', {
    iotEndpoint: 'a1234567890123-ats'
  }
  );
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::RestApi", {
    BinaryMediaTypes: [
      "application/octet-stream",
    ],
  });
});

// --------------------------------------------------------------
// Check for Api Name and Desc
// --------------------------------------------------------------
test('Test for Api Name and Desc', () => {
  // Stack
  const stack = new cdk.Stack();
  const apiGatewayProps = {
    restApiName: 'RestApi-Regional',
    description: 'Description for the Regional Rest Api'
  };
  // Helper declaration
  new ApiGatewayToIot(stack, 'test-apigateway-iot-name-desc', {
    iotEndpoint: 'a1234567890123-ats',
    apiGatewayProps
  }
  );
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::RestApi", {
    Name: 'RestApi-Regional',
    Description: 'Description for the Regional Rest Api'
  });
});

// --------------------------------------------------------------
// Check for Overridden IAM Role
// --------------------------------------------------------------
test('Test for overridden IAM Role', () => {
  // Initial Setup
  const stack = new cdk.Stack();

  const policyJSON = {
    Version: "2012-10-17",
    Statement: [
      {
        Action: [
          "iot:UpdateThingShadow"
        ],
        Resource: `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:thing/mything1`,
        Effect: "Allow"
      },
      {
        Action: [
          "iot:Publish"
        ],
        Resource: `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:topic/topic-abc`,
        Effect: "Allow"
      }
    ]
  };
  const policyDocument: iam.PolicyDocument = iam.PolicyDocument.fromJson(policyJSON);
  const iamRoleProps: iam.RoleProps = {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    path: '/',
    inlinePolicies: {testPolicy: policyDocument}
  };

  // Create a policy that overrides the default policy that gets created with the construct
  const apiGatewayExecutionRole: iam.Role = new iam.Role(stack, 'apigateway-iot-role', iamRoleProps);

  const props: ApiGatewayToIotProps = {
    iotEndpoint: `a1234567890123-ats`,
    apiGatewayExecutionRole,
  };

  new ApiGatewayToIot(stack, 'test-apigateway-iot-overridden-iam-role', props);
  // Check whether default IAM role is created to access IoT core
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Role", {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "apigateway.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    },
    Path: "/",
    Policies: [
      {
        PolicyDocument: {
          Statement: [
            {
              Action: "iot:UpdateThingShadow",
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:iot:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":thing/mything1"
                  ]
                ]
              }
            },
            {
              Action: "iot:Publish",
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:iot:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":topic/topic-abc"
                  ]
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "testPolicy"
      }
    ]
  });
});

// --------------------------------------------------------------
// Check for Api Key Source
// --------------------------------------------------------------
test('Test for APi Key Source', () => {
  // Stack
  const stack = new cdk.Stack();
  const apiGatewayProps = {
    apiKeySourceType: api.ApiKeySourceType.AUTHORIZER,
  };

  // Helper declaration
  new ApiGatewayToIot(stack, 'test-apigateway-iot-api-key-source', {
    iotEndpoint: 'a1234567890123-ats',
    apiGatewayProps
  }
  );
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::RestApi", {
    ApiKeySourceType: "AUTHORIZER"
  });
});

// --------------------------------------------------------------
// Check for Api Key Creation
// --------------------------------------------------------------
test('Test for Api Key Creation', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const props: ApiGatewayToIotProps = {
    iotEndpoint: `a1234567890123-ats`,
    apiGatewayCreateApiKey: true
  };
  new ApiGatewayToIot(stack, 'test-apigateway-iot-api-key', props);

  // Assertion to check for ApiKey
  const template = Template.fromStack(stack);
  template.hasResource("AWS::ApiGateway::Method", {
    Properties : {
      ApiKeyRequired: true
    },
    Metadata: {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W59"
          }
        ]
      }
    }
  });
  template.hasResourceProperties("AWS::ApiGateway::ApiKey", {
    Enabled: true
  });
  // Assertion to check for UsagePlan Api Key Mapping
  template.hasResourceProperties("AWS::ApiGateway::UsagePlanKey", {
    KeyType: "API_KEY"
  });
});

// -----------------------------------------------------------------
// Test deployment for ApiGateway endPointCongiurationOverride
// -----------------------------------------------------------------
test('Test for deployment ApiGateway AuthorizationType override', () => {
  // Stack
  const stack = new cdk.Stack();
  // Helper declaration
  new ApiGatewayToIot(stack, 'test-apigateway-iot-auth-none', {
    iotEndpoint: 'a1234567890123-ats',
    apiGatewayProps: {
      endpointConfiguration: {
        types: [api.EndpointType.REGIONAL]
      }
    }
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::RestApi", {
    EndpointConfiguration: {
      Types: ["REGIONAL"]
    }
  });
});

// -----------------------------------------------------------------
// Test deployment for override ApiGateway AuthorizationType to NONE
// -----------------------------------------------------------------
test('Test for deployment ApiGateway AuthorizationType override', () => {
  // Stack
  const stack = new cdk.Stack();
  // Helper declaration
  new ApiGatewayToIot(stack, 'test-apigateway-iot-override-auth', {
    iotEndpoint: 'a1234567890123-ats',
    apiGatewayProps: {
      defaultMethodOptions: {
        authorizationType: api.AuthorizationType.NONE
      }
    }
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "POST",
    AuthorizationType: "NONE"
  });
});

// -----------------------------------------------------------------
// Test deployment for fully qualified iotEndpoint name
// -----------------------------------------------------------------
test('Test for handling fully qualified iotEndpoint', () => {
  // Stack
  const stack = new cdk.Stack();
  // Helper declaration
  new ApiGatewayToIot(stack, 'test-apigateway-iot-override-auth', {
    iotEndpoint: 'a1234567890123-ats.iot.ap-south-1.amazonaws.com',
    apiGatewayProps: {
      defaultMethodOptions: {
        authorizationType: api.AuthorizationType.NONE
      }
    }
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::Method", {
    Integration: {
      Uri: {
        "Fn::Join": [
          "",
          [
            "arn:",
            {
              Ref: "AWS::Partition"
            },
            ":apigateway:",
            {
              Ref: "AWS::Region"
            },
            ":a1234567890123-ats.iotdata:path/topics/{topic-level-1}/{topic-level-2}/{topic-level-3}"
          ]
        ]
      } }
  });
});
