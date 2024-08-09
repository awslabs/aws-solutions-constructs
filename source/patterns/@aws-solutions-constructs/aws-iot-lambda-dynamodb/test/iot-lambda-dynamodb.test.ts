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

import { IotToLambdaToDynamoDB, IotToLambdaToDynamoDBProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from "aws-cdk-lib";
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

function deployStack(stack: cdk.Stack) {
  const props: IotToLambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    }
  };

  return new IotToLambdaToDynamoDB(stack, 'test-iot-lambda-dynamodb-stack', props);
}

test('check lambda function properties', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "testiotlambdadynamodbstackLambdaToDynamoDBLambdaFunctionServiceRole31915E05",
        "Arn"
      ]
    },
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        DDB_TABLE_NAME: {
          Ref: "testiotlambdadynamodbstackLambdaToDynamoDBDynamoTableE17E5733"
        }
      }
    }
  });
});

test('check lambda function permission', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Permission', {
    Action: "lambda:InvokeFunction",
    FunctionName: {
      "Fn::GetAtt": [
        "testiotlambdadynamodbstackLambdaToDynamoDBLambdaFunction5165A7EE",
        "Arn"
      ]
    },
    Principal: "iot.amazonaws.com",
    SourceArn: {
      "Fn::GetAtt": [
        "testiotlambdadynamodbstackIotToLambdaIotTopic74F5E3BB",
        "Arn"
      ]
    }
  });
});

test('check iot lambda function role', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

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

test('check iot topic rule properties', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IoT::TopicRule', {
    TopicRulePayload: {
      Actions: [
        {
          Lambda: {
            FunctionArn: {
              "Fn::GetAtt": [
                "testiotlambdadynamodbstackLambdaToDynamoDBLambdaFunction5165A7EE",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
      RuleDisabled: false,
      Sql: "SELECT * FROM 'connectedcar/dtc/#'"
    }
  });

});

test('check dynamo table properties', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

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

test('check lambda function policy ', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

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
                "testiotlambdadynamodbstackLambdaToDynamoDBDynamoTableE17E5733",
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

test('check properties', () => {
  const stack = new cdk.Stack();

  const props: IotToLambdaToDynamoDBProps = {
    deployVpc: true,
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    }
  };

  const construct = new IotToLambdaToDynamoDB(stack, 'test-iot-lambda-dynamodb-stack', props);

  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.dynamoTable).toBeDefined();
  expect(construct.iotTopicRule).toBeDefined();
  expect(construct.vpc).toBeDefined();
});

test('check exception for Missing existingObj from props for deploy = false', () => {
  const stack = new cdk.Stack();

  const props: IotToLambdaToDynamoDBProps = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    }
  };

  try {
    new IotToLambdaToDynamoDB(stack, 'test-iot-lambda-integration', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('Check incorrect table permission', () => {
  const stack = new cdk.Stack();

  const props: IotToLambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    },
    tablePermissions: 'Reed'
  };

  const app = () => {
    new IotToLambdaToDynamoDB(stack, 'test-iot-lambda-dynamodb-stack', props);
  };

  // Assertion
  expect(app).toThrowError(/Invalid table permission submitted - Reed/);
});

test('check lambda function custom environment variable', () => {
  const stack = new cdk.Stack();
  const props: IotToLambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    tableEnvironmentVariableName: 'CUSTOM_DYNAMODB_TABLE',
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    }
  };

  new IotToLambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_DYNAMODB_TABLE: {
          Ref: 'testlambdadynamodbstackLambdaToDynamoDBDynamoTable7E730A23'
        }
      }
    }
  });
});

test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new cdk.Stack();
  // Helper declaration
  new IotToLambdaToDynamoDB(stack, "lambda-to-dynamodb-stack", {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    deployVpc: true,
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatodynamodbstackLambdaToDynamoDBReplaceDefaultSecurityGroupsecuritygroup04A024BF",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "lambdatodynamodbstackVpcisolatedSubnet1Subnet90CC3593",
        },
        {
          Ref: "lambdatodynamodbstackVpcisolatedSubnet2Subnet4693DAE3",
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

test("Test minimal deployment that deploys a VPC w/vpcProps", () => {
  // Stack
  const stack = new cdk.Stack();
  // Helper declaration
  new IotToLambdaToDynamoDB(stack, "lambda-to-dynamodb-stack", {
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
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatodynamodbstackLambdaToDynamoDBReplaceDefaultSecurityGroupsecuritygroup04A024BF",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "lambdatodynamodbstackVpcisolatedSubnet1Subnet90CC3593",
        },
        {
          Ref: "lambdatodynamodbstackVpcisolatedSubnet2Subnet4693DAE3",
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

test("Test minimal deployment with an existing VPC", () => {
  // Stack
  const stack = new cdk.Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  new IotToLambdaToDynamoDB(stack, "lambda-to-dynamodb-stack", {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingVpc: testVpc,
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatodynamodbstackLambdaToDynamoDBReplaceDefaultSecurityGroupsecuritygroup04A024BF",
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

test("Test minimal deployment with an existing VPC and existing Lambda function not in a VPC", () => {
  // Stack
  const stack = new cdk.Stack();

  // buildLambdaFunction should throw an error if the Lambda function is not
  // attached to a VPC
  const testLambdaFunction = new lambda.Function(stack, 'test-lambda', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  const app = () => {
    // Helper declaration
    new IotToLambdaToDynamoDB(stack, "lambda-to-dynamodb-stack", {
      existingLambdaObj: testLambdaFunction,
      existingVpc: testVpc,
      iotTopicRuleProps: {
        topicRulePayload: {
          ruleDisabled: false,
          description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
          sql: "SELECT * FROM 'connectedcar/dtc/#'",
          actions: []
        }
      }
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
    new IotToLambdaToDynamoDB(stack, "lambda-to-dynamodb-stack", {
      lambdaFunctionProps: {
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      existingVpc: testVpc,
      deployVpc: true,
      iotTopicRuleProps: {
        topicRulePayload: {
          ruleDisabled: false,
          description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
          sql: "SELECT * FROM 'connectedcar/dtc/#'",
          actions: []
        }
      }
    });
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Confirm CheckLambdaProps is being called', () => {
  const stack = new cdk.Stack();
  const existingLambdaObj = new lambda.Function(stack, 'ExistingLambda', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: IotToLambdaToDynamoDBProps = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    },
    existingLambdaObj,
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    }
  };

  const app = () => {
    new IotToLambdaToDynamoDB(stack, 'test-iot-lambda-ddb', props);
  };
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});

// NOTE: existingTableObj was omitted from the interface for this construct,
// so this test cannot be run. Leaving it here so it can be used if/when existingTableObj
// is added to the interface
//
// test("Confirm CheckDynamoDBProps is getting called", () => {
//   const stack = new cdk.Stack();
//   const tableName = 'table-name';

//   const existingTable = new dynamodb.Table(stack, 'MyTablet', {
//     tableName,
//     partitionKey: {
//       name: 'id',
//       type: dynamodb.AttributeType.STRING
//     }
//   });

//   const props: IotToLambdaToDynamoDBProps = {
//     lambdaFunctionProps: {
//       code: lambda.Code.fromAsset(`${__dirname}/lambda`),
//       runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
//       handler: 'index.handler'
//     },
//     iotTopicRuleProps: {
//       topicRulePayload: {
//         ruleDisabled: false,
//         description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
//         sql: "SELECT * FROM 'connectedcar/dtc/#'",
//         actions: []
//       }
//     },
//     existingTableObj: existingTable,
//     dynamoTableProps: {
//       tableName,
//       partitionKey: {
//         name: 'id',
//         type: dynamodb.AttributeType.STRING
//       },
//     },
// };

//   const app = () => {
//     new IotToLambdaToDynamoDB(stack, 'test-iot-lambda-dynamodb-stack', props);
//   };

//   expect(app).toThrowError('Error - Either provide existingTableObj or dynamoTableProps, but not both.\n');
// });