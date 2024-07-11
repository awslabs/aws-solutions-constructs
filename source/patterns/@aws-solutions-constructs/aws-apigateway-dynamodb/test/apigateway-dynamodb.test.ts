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
import { Stack } from "aws-cdk-lib";
import { ApiGatewayToDynamoDB, ApiGatewayToDynamoDBProps } from "../lib";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import * as api from "aws-cdk-lib/aws-apigateway";
import { Template } from "aws-cdk-lib/assertions";

test("check properties", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {};
  const construct = new ApiGatewayToDynamoDB( stack, "test-api-gateway-dynamodb-default", apiGatewayToDynamoDBProps);

  expect(construct.dynamoTable).toBeDefined();
  expect(construct.apiGateway).toBeDefined();
  expect(construct.apiGatewayRole).toBeDefined();
  expect(construct.apiGatewayCloudWatchRole).toBeDefined();
  expect(construct.apiGatewayLogGroup).toBeDefined();
});

test("check allow CRUD operations", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    allowReadOperation: true,
    allowCreateOperation: true,
    createRequestTemplate: "{}",
    allowDeleteOperation: true,
    allowUpdateOperation: true,
    updateRequestTemplate: "{}",
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "dynamodb:PutItem",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
        {
          Action: "dynamodb:Query",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
        {
          Action: "dynamodb:UpdateItem",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
        {
          Action: "dynamodb:DeleteItem",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "testapigatewaydynamodbapigatewayroleDefaultPolicy43AC565D",
    Roles: [
      {
        Ref: "testapigatewaydynamodbapigatewayrole961B19C4",
      },
    ],
  });

  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "AWS_IAM",
  });

  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "POST",
    AuthorizationType: "AWS_IAM",
  });

  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "PUT",
    AuthorizationType: "AWS_IAM",
  });

  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "DELETE",
    AuthorizationType: "AWS_IAM",
  });

  template.hasResourceProperties("AWS::ApiGateway::Resource", {
    PathPart: "{id}",
  });
});

test("check allow read and update only", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    allowUpdateOperation: true,
    updateRequestTemplate: "{}",
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "dynamodb:Query",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
        {
          Action: "dynamodb:UpdateItem",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "testapigatewaydynamodbapigatewayroleDefaultPolicy43AC565D",
    Roles: [
      {
        Ref: "testapigatewaydynamodbapigatewayrole961B19C4",
      },
    ],
  });

  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "AWS_IAM",
  });
});

test("check using custom partition key for dynamodb", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    dynamoTableProps: {
      partitionKey: {
        name: "page_id",
        type: ddb.AttributeType.STRING,
      },
    },
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::Resource", {
    PathPart: "{page_id}",
  });
});

test("override apiGatewayProps for api gateway", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    apiGatewayProps: {
      description: "This is a sample description for api gateway",
    },
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::RestApi", {
    Description: "This is a sample description for api gateway",
  });
});

test("Test deployment ApiGateway AuthorizationType override", () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, "api-gateway-dynamodb", {
    apiGatewayProps: {
      defaultMethodOptions: {
        authorizationType: api.AuthorizationType.NONE,
      },
    },
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "NONE",
  });
});

test("Test deployment with existing DynamoDB table", () => {
  const oddPartitionKeyName = 'oddName';
  const oddReadCapacity = 23;

  const stack = new Stack();
  const table = new ddb.Table(stack, "existing-table", {
    partitionKey: {
      name: oddPartitionKeyName,
      type: ddb.AttributeType.STRING,
    },
    readCapacity: oddReadCapacity
  });

  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    existingTableObj: table
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb-default", apiGatewayToDynamoDBProps);
  // Confirm there is only the one table
  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::DynamoDB::Table", 1);

  // Confirm that the one table is the one create here
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    ProvisionedThroughput: {
      ReadCapacityUnits: oddReadCapacity,
    }
  });

  template.hasResourceProperties("AWS::ApiGateway::Resource", {
    PathPart: `{${oddPartitionKeyName}}`,
  });
});

test("check setting allowReadOperation=false for dynamodb", () => {
  const stack1 = new Stack();

  new ApiGatewayToDynamoDB(stack1, "test-api-gateway-dynamodb1", {
    allowReadOperation: true,
    allowDeleteOperation: true
  });

  // Expect two APIG Methods (GET, DELETE) for allowReadOperation and allowDeleteOperation
  Template.fromStack(stack1).resourceCountIs("AWS::ApiGateway::Method", 2);

  const stack2 = new Stack();

  new ApiGatewayToDynamoDB(stack2, "test-api-gateway-dynamodb2", {
    allowReadOperation: false,
    allowDeleteOperation: true
  });

  // Expect only one APIG Method (DELETE) for allowDeleteOperation
  Template.fromStack(stack2).resourceCountIs("AWS::ApiGateway::Method", 1);
});

test('Construct can override default create request template type', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowCreateOperation: true,
    createRequestTemplate: 'ok',
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'POST',
    Integration: {
      RequestTemplates: {
        'application/json': 'ok'
      }
    }
  });
});

test('Construct can override default read request template type', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowReadOperation: true,
    readRequestTemplate: 'ok',
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'GET',
    Integration: {
      RequestTemplates: {
        'application/json': 'ok'
      }
    }
  });
});

test('Construct can override default update request template type', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowUpdateOperation: true,
    updateRequestTemplate: 'ok',
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'PUT',
    Integration: {
      RequestTemplates: {
        'application/json': 'ok'
      }
    }
  });
});

test('Construct can override default delete request template type', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowDeleteOperation: true,
    deleteRequestTemplate: 'ok',
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'DELETE',
    Integration: {
      RequestTemplates: {
        'application/json': 'ok'
      }
    }
  });
});

test('Construct accepts additional create request templates', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowCreateOperation: true,
    createRequestTemplate: 'create-me',
    additionalCreateRequestTemplates: {
      'text/plain': 'Hello'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'POST',
    Integration: {
      RequestTemplates: {
        'application/json': 'create-me',
        'text/plain': 'Hello'
      }
    }
  });
});

test('Construct accepts additional read request templates', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowReadOperation: true,
    additionalReadRequestTemplates: {
      'text/plain': 'Hello'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'GET',
    Integration: {
      RequestTemplates: {
        'text/plain': 'Hello'
      }
    }
  });
});

test('Construct accepts additional update request templates', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowUpdateOperation: true,
    updateRequestTemplate: 'default-update-template',
    additionalUpdateRequestTemplates: {
      'text/plain': 'additional-update-template'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'PUT',
    Integration: {
      RequestTemplates: {
        'application/json': 'default-update-template',
        'text/plain': 'additional-update-template'
      }
    }
  });
});

test('Construct accepts additional delete request templates', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowDeleteOperation: true,
    additionalDeleteRequestTemplates: {
      'text/plain': 'DeleteMe'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'DELETE',
    Integration: {
      RequestTemplates: {
        'text/plain': 'DeleteMe'
      }
    }
  });
});

test('Construct can customize the api resourceName', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    resourceName: 'my-resource-name',
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::Resource", {
    PathPart: "{my-resource-name}",
  });
});

test('Construct uses default integration responses', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowCreateOperation: true,
    allowReadOperation: true,
    allowUpdateOperation: true,
    allowDeleteOperation: true,
    createRequestTemplate: 'create',
    updateRequestTemplate: 'update'
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'POST',
    Integration: {
      IntegrationResponses: [
        {
          StatusCode: '200'
        },
        {
          ResponseTemplates: {
            'text/html': 'Error'
          },
          SelectionPattern: '500',
          StatusCode: '500'
        }
      ]
    }
  });

  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'GET',
    Integration: {
      IntegrationResponses: [
        {
          StatusCode: '200'
        },
        {
          ResponseTemplates: {
            'text/html': 'Error'
          },
          SelectionPattern: '500',
          StatusCode: '500'
        }
      ]
    }
  });

  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'PUT',
    Integration: {
      IntegrationResponses: [
        {
          StatusCode: '200'
        },
        {
          ResponseTemplates: {
            'text/html': 'Error'
          },
          SelectionPattern: '500',
          StatusCode: '500'
        }
      ]
    }
  });

  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'DELETE',
    Integration: {
      IntegrationResponses: [
        {
          StatusCode: '200'
        },
        {
          ResponseTemplates: {
            'text/html': 'Error'
          },
          SelectionPattern: '500',
          StatusCode: '500'
        }
      ]
    }
  });
});

test('Construct uses custom createIntegrationResponses property', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowCreateOperation: true,
    createRequestTemplate: 'OK',
    createIntegrationResponses: [
      {
        statusCode: '200',
        responseTemplates: {
          'text/html': 'OK'
        }
      }
    ]
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'POST',
    Integration: {
      IntegrationResponses: [
        {
          ResponseTemplates: {
            'text/html': 'OK'
          },
          StatusCode: '200'
        }
      ]
    }
  });
});

test('Construct uses custom readIntegrationResponses property', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowReadOperation: true,
    readIntegrationResponses: [
      {
        statusCode: '200',
        responseTemplates: {
          'text/html': 'OK'
        }
      }
    ]
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'GET',
    Integration: {
      IntegrationResponses: [
        {
          ResponseTemplates: {
            'text/html': 'OK'
          },
          StatusCode: '200'
        }
      ]
    }
  });
});

test('Construct uses custom updateIntegrationResponses property', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowUpdateOperation: true,
    updateRequestTemplate: 'OK',
    updateIntegrationResponses: [
      {
        statusCode: '200',
        responseTemplates: {
          'text/html': 'OK'
        }
      }
    ]
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'PUT',
    Integration: {
      IntegrationResponses: [
        {
          ResponseTemplates: {
            'text/html': 'OK'
          },
          StatusCode: '200'
        }
      ]
    }
  });
});

test('Construct uses custom deleteIntegrationResponses property', () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowDeleteOperation: true,
    deleteIntegrationResponses: [
      {
        statusCode: '200',
        responseTemplates: {
          'text/html': 'OK'
        }
      }
    ]
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'DELETE',
    Integration: {
      IntegrationResponses: [
        {
          ResponseTemplates: {
            'text/html': 'OK'
          },
          StatusCode: '200'
        }
      ]
    }
  });
});

test('Construct throws error when createRequestTemplate is set and allowCreateOperation is not true', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    createRequestTemplate: '{}',
  });

  expect(app).toThrowError(/The 'allowCreateOperation' property must be set to true when setting any of the following: 'createRequestTemplate', 'additionalCreateRequestTemplates', 'createIntegrationResponses'/);
});

test('Construct throws error when additionalCreateRequestTemplates is set and allowCreateOperation is not true', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    additionalCreateRequestTemplates: {}
  });

  expect(app).toThrowError(/The 'allowCreateOperation' property must be set to true when setting any of the following: 'createRequestTemplate', 'additionalCreateRequestTemplates', 'createIntegrationResponses'/);
});

test('Construct throws error when createIntegrationResponses is set and allowCreateOperation is not true', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    createIntegrationResponses: []
  });

  expect(app).toThrowError(/The 'allowCreateOperation' property must be set to true when setting any of the following: 'createRequestTemplate', 'additionalCreateRequestTemplates', 'createIntegrationResponses'/);
});

test('Construct throws error when readRequestTemplate is set and allowReadOperation is false', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowReadOperation: false,
    readRequestTemplate: '{}',
  });

  expect(app).toThrowError(/The 'allowReadOperation' property must be set to true or undefined when setting any of the following: 'readRequestTemplate', 'additionalReadRequestTemplates', 'readIntegrationResponses'/);
});

test('Construct throws error when additionalReadRequestTemplates is set and allowReadOperation is false', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowReadOperation: false,
    additionalReadRequestTemplates: {},
  });

  expect(app).toThrowError(/The 'allowReadOperation' property must be set to true or undefined when setting any of the following: 'readRequestTemplate', 'additionalReadRequestTemplates', 'readIntegrationResponses'/);
});

test('Construct throws error when readIntegrationResponses is set and allowReadOperation is false', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    allowReadOperation: false,
    readIntegrationResponses: [],
  });

  expect(app).toThrowError(/The 'allowReadOperation' property must be set to true or undefined when setting any of the following: 'readRequestTemplate', 'additionalReadRequestTemplates', 'readIntegrationResponses'/);
});

test('Construct throws error when updateRequestTemplate is set and allowUpdateOperation is not true', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    updateRequestTemplate: '{}',
  });

  expect(app).toThrowError(/The 'allowUpdateOperation' property must be set to true when setting any of the following: 'updateRequestTemplate', 'additionalUpdateRequestTemplates', 'updateIntegrationResponses'/);
});

test('Construct throws error when additionalUpdateRequestTemplates is set and allowUpdateOperation is not true', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    additionalUpdateRequestTemplates: {}
  });

  expect(app).toThrowError(/The 'allowUpdateOperation' property must be set to true when setting any of the following: 'updateRequestTemplate', 'additionalUpdateRequestTemplates', 'updateIntegrationResponses'/);
});

test('Construct throws error when updateIntegrationResponses is set and allowUpdateOperation is not true', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    updateIntegrationResponses: []
  });

  expect(app).toThrowError(/The 'allowUpdateOperation' property must be set to true when setting any of the following: 'updateRequestTemplate', 'additionalUpdateRequestTemplates', 'updateIntegrationResponses'/);
});

test('Construct throws error when deleteRequestTemplate is set and allowDeleteOperation is not true', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    deleteRequestTemplate: '{}',
  });

  expect(app).toThrowError(/The 'allowDeleteOperation' property must be set to true when setting any of the following: 'deleteRequestTemplate', 'additionalDeleteRequestTemplates', 'deleteIntegrationResponses'/);
});

test('Construct throws error when additionalDeleteRequestTemplates is set and allowDeleteOperation is not true', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    additionalDeleteRequestTemplates: {}
  });

  expect(app).toThrowError(/The 'allowDeleteOperation' property must be set to true when setting any of the following: 'deleteRequestTemplate', 'additionalDeleteRequestTemplates', 'deleteIntegrationResponses'/);
});

test('Construct throws error when deleteIntegrationResponses is set and allowDeleteOperation is not true', () => {
  const stack = new Stack();
  const app = () => new ApiGatewayToDynamoDB(stack, 'api-gateway-dynamodb', {
    deleteIntegrationResponses: []
  });

  expect(app).toThrowError(/The 'allowDeleteOperation' property must be set to true when setting any of the following: 'deleteRequestTemplate', 'additionalDeleteRequestTemplates', 'deleteIntegrationResponses'/);
});

test('Test that CheckDynamoDBProps is getting called', () => {
  const stack = new Stack();
  const tableName = 'custom-table-name';

  const existingTable = new ddb.Table(stack, 'MyTablet', {
    tableName,
    partitionKey: {
      name: 'id',
      type: ddb.AttributeType.STRING
    }
  });

  const props: ApiGatewayToDynamoDBProps = {
    existingTableObj: existingTable,
    dynamoTableProps: {
      tableName,
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING
      },
    },
  };

  const app = () => {
    new ApiGatewayToDynamoDB(stack, 'test-apigateway-dynamodb-stack', props);
  };

  // Assertion
  expect(app).toThrowError(/Error - Either provide existingTableObj or dynamoTableProps, but not both.\n/);
});

test("provide createMethodResponses", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    allowCreateOperation: true,
    createRequestTemplate: "fingerprint",
    createMethodResponses: [{
      statusCode: "100"
    }]
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  const template = Template.fromStack(stack);
  // Checking for fingerprint ensures we're looking at the correct Method
  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "POST",
    Integration: {
      RequestTemplates: {
        "application/json": "fingerprint"
      }
    },
    MethodResponses: [
      {
        StatusCode: "100"
      }
    ]
  });
});

test("provide readMethodResponses", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    allowReadOperation: true,
    readRequestTemplate: "fingerprint",
    readMethodResponses: [{
      statusCode: "100"
    }]
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    Integration: {
      RequestTemplates: {
        "application/json": "fingerprint"
      }
    },
    MethodResponses: [
      {
        StatusCode: "100"
      }
    ]
  });
});

test("provide updateMethodResponses", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    allowUpdateOperation: true,
    updateRequestTemplate: "fingerprint",
    updateMethodResponses: [{
      statusCode: "100"
    }]
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "PUT",
    Integration: {
      RequestTemplates: {
        "application/json": "fingerprint"
      }
    },
    MethodResponses: [
      {
        StatusCode: "100"
      }
    ]
  });
});

test("provide deleteMethodResponses", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    allowDeleteOperation: true,
    deleteRequestTemplate: "fingerprint",
    deleteMethodResponses: [{
      statusCode: "100"
    }]
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "DELETE",
    Integration: {
      RequestTemplates: {
        "application/json": "fingerprint"
      }
    },
    MethodResponses: [
      {
        StatusCode: "100"
      }
    ]
  });
});
