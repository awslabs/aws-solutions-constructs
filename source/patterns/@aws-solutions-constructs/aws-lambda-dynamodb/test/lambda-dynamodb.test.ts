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

import { LambdaToDynamoDB, LambdaToDynamoDBProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

function deployNewFunc(stack: cdk.Stack) {
  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
  };

  return new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);
}

function useExistingFunc(stack: cdk.Stack) {
  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.PYTHON_3_6,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const props: LambdaToDynamoDBProps = {
    existingLambdaObj: new lambda.Function(stack, 'MyExistingFunction', lambdaFunctionProps),
    dynamoTableProps: {
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 3,
      writeCapacity: 3,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      }
    },
  };

  return new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);
}

test('check lambda function properties for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "testlambdadynamodbstackLambdaFunctionServiceRole758347A1",
        "Arn"
      ]
    },
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        DDB_TABLE_NAME: {
          Ref: "testlambdadynamodbstackDynamoTable8138E93B"
        }
      }
    }
  });
});

test('check dynamo table properties for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH"
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: "id",
        AttributeType: "S"
      }
    ],
    BillingMode: "PAY_PER_REQUEST",
    SSESpecification: {
      SSEEnabled: true
    }
  });
});

test('check lambda function role for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "lambda.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    },
    Policies: [
      {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":logs:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":log-group:/aws/lambda/*"
                  ]
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "LambdaFunctionServiceRolePolicy"
      }
    ]
  });
});

test('check lambda function policy default table permissions', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "dynamodb:BatchGetItem",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:Query",
            "dynamodb:GetItem",
            "dynamodb:Scan",
            "dynamodb:ConditionCheckItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:DescribeTable"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testlambdadynamodbstackDynamoTable8138E93B",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('check lambda function properties for deploy: false', () => {
  const stack = new cdk.Stack();

  useExistingFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "MyExistingFunctionServiceRoleF9E14BFD",
        "Arn"
      ]
    },
    Runtime: "python3.6"
  });
});

test('check lambda function role for existing function', () => {
  const stack = new cdk.Stack();

  useExistingFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "lambda.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    },
    ManagedPolicyArns: [
      {
        "Fn::Join": [
          "",
          [
            "arn:",
            {
              Ref: "AWS::Partition"
            },
            ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
          ]
        ]
      }
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: LambdaToDynamoDB = deployNewFunc(stack);

  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.dynamoTable).toBeDefined();
});

test('check exception for Missing existingObj from props', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
  };

  try {
    new LambdaToDynamoDB(stack, 'test-iot-lambda-integration', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check for no prop', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    }
  };
  new LambdaToDynamoDB(stack, 'test-iot-lambda-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "testiotlambdastackLambdaFunctionServiceRoleF72A85A9",
        "Arn"
      ]
    },
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        DDB_TABLE_NAME: {
          Ref: "testiotlambdastackDynamoTable76858356"
        }
      }
    }
  });
});

test('check lambda function policy ReadOnly table permissions', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    tablePermissions: 'Read'
  };

  new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "dynamodb:BatchGetItem",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:Query",
            "dynamodb:GetItem",
            "dynamodb:Scan",
            "dynamodb:ConditionCheckItem",
            "dynamodb:DescribeTable"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testlambdadynamodbstackDynamoTable8138E93B",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });

});

test('check lambda function policy WriteOnly table permissions', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    tablePermissions: 'Write'
  };

  new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:DescribeTable"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testlambdadynamodbstackDynamoTable8138E93B",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });

});

test('check lambda function policy ReadWrite table permissions', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    tablePermissions: 'ReadWrite'
  };

  new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "dynamodb:BatchGetItem",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:Query",
            "dynamodb:GetItem",
            "dynamodb:Scan",
            "dynamodb:ConditionCheckItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:DescribeTable"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testlambdadynamodbstackDynamoTable8138E93B",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });

});

test('check lambda function policy All table permissions', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    tablePermissions: 'All'
  };

  new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "dynamodb:*",
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testlambdadynamodbstackDynamoTable8138E93B",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });

});

test('check lambda function custom environment variable', () => {
  const stack = new cdk.Stack();
  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    tableEnvironmentVariableName: 'CUSTOM_DYNAMODB_TABLE'
  };

  new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_DYNAMODB_TABLE: {
          Ref: 'testlambdadynamodbstackDynamoTable8138E93B'
        }
      }
    }
  });
});

// --------------------------------------------------------------
// Test minimal deployment that deploys a VPC without vpcProps
// --------------------------------------------------------------
test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new cdk.Stack();
  // Helper declaration
  new LambdaToDynamoDB(stack, "lambda-to-dynamodb-stack", {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    deployVpc: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatodynamodbstackReplaceDefaultSecurityGroupsecuritygroupD5CEDE41",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "VpcisolatedSubnet1SubnetE62B1B9B",
        },
        {
          Ref: "VpcisolatedSubnet2Subnet39217055",
        },
      ],
    },
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
  });

  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::InternetGateway", 0);
});

// --------------------------------------------------------------
// Test minimal deployment that deploys a VPC w/vpcProps
// --------------------------------------------------------------
test("Test minimal deployment that deploys a VPC w/vpcProps", () => {
  // Stack
  const stack = new cdk.Stack();
  // Helper declaration
  new LambdaToDynamoDB(stack, "lambda-to-dynamodb-stack", {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    vpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      ipAddresses: ec2.IpAddresses.cidr("192.68.0.0/16"),
    },
    deployVpc: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatodynamodbstackReplaceDefaultSecurityGroupsecuritygroupD5CEDE41",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "VpcisolatedSubnet1SubnetE62B1B9B",
        },
        {
          Ref: "VpcisolatedSubnet2Subnet39217055",
        },
      ],
    },
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: "192.68.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
  });

  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::InternetGateway", 0);
});

// --------------------------------------------------------------
// Test minimal deployment with an existing VPC
// --------------------------------------------------------------
test("Test minimal deployment with an existing VPC", () => {
  // Stack
  const stack = new cdk.Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  new LambdaToDynamoDB(stack, "lambda-to-dynamodb-stack", {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingVpc: testVpc,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatodynamodbstackReplaceDefaultSecurityGroupsecuritygroupD5CEDE41",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "testvpcPrivateSubnet1Subnet865FB50A",
        },
        {
          Ref: "testvpcPrivateSubnet2Subnet23D3396F",
        },
      ],
    },
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
  });
});

// --------------------------------------------------------------
// Test minimal deployment with an existing VPC and existing Lambda function not in a VPC
//
// buildLambdaFunction should throw an error if the Lambda function is not
// attached to a VPC
// --------------------------------------------------------------
test("Test minimal deployment with an existing VPC and existing Lambda function not in a VPC", () => {
  // Stack
  const stack = new cdk.Stack();

  const testLambdaFunction = new lambda.Function(stack, 'test-lambda', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  const app = () => {
    // Helper declaration
    new LambdaToDynamoDB(stack, "lambda-to-dynamodb-stack", {
      existingLambdaObj: testLambdaFunction,
      existingVpc: testVpc,
    });
  };

  // Assertion
  expect(app).toThrowError();

});

test("Confirm CheckVpcProps is called", () => {
  // Stack
  const stack = new cdk.Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const app = () => {
    // Helper declaration
    new LambdaToDynamoDB(stack, "lambda-to-dynamodb-stack", {
      lambdaFunctionProps: {
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      existingVpc: testVpc,
      deployVpc: true,
    });
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Test bad table permission', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    tablePermissions: 'Reed',
  };

  const app = () => {
    new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);
  };

  // Assertion
  expect(app).toThrowError(/Invalid table permission submitted - Reed/);
});

test('Test that CheckDynamoDBProps is getting called', () => {
  const stack = new cdk.Stack();
  const tableName = 'custom-table-name';

  const existingTable = new dynamodb.Table(stack, 'MyTablet', {
    tableName,
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING
    }
  });

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    existingTableObj: existingTable,
    dynamoTableProps: {
      tableName,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
    },
  };

  const app = () => {
    new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);
  };

  // Assertion
  expect(app).toThrowError(/Error - Either provide existingTableObj or dynamoTableProps, but not both.\n/);
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToDynamoDB(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
