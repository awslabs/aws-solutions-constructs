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
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { LambdaToEventbridge, LambdaToEventbridgeProps } from '../lib';
import '@aws-cdk/assert/jest';

const xrayPolicyStatement = {
  Action: [
    "xray:PutTraceSegments",
    "xray:PutTelemetryRecords"
  ],
  Effect: "Allow",
  Resource: "*"
};
const defaultEventBusPolicyStatement = {
  Action: "events:PutEvents",
  Effect: "Allow",
  Resource: {
    "Fn::Join": [
      "",
      [
        "arn:",
        {
          Ref: "AWS::Partition"
        },
        ":events:",
        {
          Ref: "AWS::Region"
        },
        ":",
        {
          Ref: "AWS::AccountId"
        },
        ":event-bus/default"
      ]
    ]
  }
};

const vpcConfig = {
  VpcConfig: {
    SecurityGroupIds: [
      {
        "Fn::GetAtt": [
          "lambdatoeventbridgestackReplaceDefaultSecurityGroupsecuritygroup59EF0706",
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
};

// --------------------------------------------------------------
// Tests minimal deployment with new Lambda function
// --------------------------------------------------------------
test('Test minimal deployment with new Lambda function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const construct = new LambdaToEventbridge(stack, 'lambda-to-eventbridge-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  });

  // Check Props
  const lambdaFunction = construct.lambdaFunction;
  const vpc = construct.vpc;
  const eventBus = construct.eventBus;
  expect(lambdaFunction).toBeDefined();
  expect(vpc).toBeUndefined();
  expect(eventBus).toBeUndefined();

  // Check EVENTBUS_NAME Env variable
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        EVENTBUS_NAME: "default"
      }
    }
  });

  // Since using default event bus, there shouldn't be any eventbus
  expect(stack).not.toHaveResource('AWS::Events::EventBus');

  // Check Lambda Function permissions to access default Event Bridge
  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        xrayPolicyStatement,
        defaultEventBusPolicyStatement
      ]
    }
  });
});

// --------------------------------------------------------------
// Test bad call with existingVpc and deployVpc
// --------------------------------------------------------------
test("Test bad call with existingVpc and deployVpc", () => {
  // Stack
  const stack = new Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const app = () => {
    // Helper declaration
    new LambdaToEventbridge(stack, "lambda-to-eventbridge-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      existingVpc: testVpc,
      deployVpc: true,
    });
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// Test exception while passing existingEventBus & eventBusProps
// --------------------------------------------------------------
test("Test bad call with existingVpc and deployVpc", () => {
  // Stack
  const stack = new Stack();

  const app = () => {
    // Helper declaration
    new LambdaToEventbridge(stack, 'lambda-to-eventbridge-stack', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda`)
      },
      eventBusProps: { eventBusName: 'test' },
      existingEventBusInterface: new events.EventBus(stack, `new-event-bus`, {  eventBusName: 'test'  })
    });
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// Test deployment w/ existing eventbus
// --------------------------------------------------------------
test('Test deployment w/ existing eventbus', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const existingEventBus = new events.EventBus(stack, 'existing-eventbus', {
    eventBusName: 'customeventbus'
  });

  new LambdaToEventbridge(stack, 'lambda-to-eventbridge-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    existingEventBusInterface: existingEventBus
  });

  // Check Lambda Permissions
  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        xrayPolicyStatement,
        {
          Action: "events:PutEvents",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "existingeventbus2A99FA49",
              "Arn"
            ]
          }
        }
      ]
    }
  });
  expect(stack).toHaveResource('AWS::Events::EventBus', {
    Name: `customeventbus`
  });
});

// --------------------------------------------------------------
// Test minimal deployment that deploys a VPC without vpcProps
// --------------------------------------------------------------
test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToEventbridge(stack, "lambda-to-eventbridge-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    deployVpc: true,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", vpcConfig);

  expect(stack).toHaveResource("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });

  expect(stack).toCountResources("AWS::EC2::Subnet", 2);
  expect(stack).toCountResources("AWS::EC2::InternetGateway", 0);
});

// --------------------------------------------------------------
// Test minimal deployment that deploys a VPC w/vpcProps
// --------------------------------------------------------------
test("Test minimal deployment that deploys a VPC w/vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToEventbridge(stack, "lambda-to-eventbridge-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
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

  expect(stack).toHaveResource("AWS::Lambda::Function", vpcConfig);

  expect(stack).toHaveResource("AWS::EC2::VPC", {
    CidrBlock: "192.68.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });

  expect(stack).toCountResources("AWS::EC2::Subnet", 2);
  expect(stack).toCountResources("AWS::EC2::InternetGateway", 0);
});

// --------------------------------------------------------------
// Test minimal deployment with an existing VPC
// --------------------------------------------------------------
test("Test minimal deployment with an existing VPC", () => {
  // Stack
  const stack = new Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  new LambdaToEventbridge(stack, "lambda-to-eventbridge-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingVpc: testVpc,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatoeventbridgestackReplaceDefaultSecurityGroupsecuritygroup59EF0706",
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

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });

  // Check Lambda Function permissions to access default Event Bridge
  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "ec2:CreateNetworkInterface",
            "ec2:DescribeNetworkInterfaces",
            "ec2:DeleteNetworkInterface",
            "ec2:AssignPrivateIpAddresses",
            "ec2:UnassignPrivateIpAddresses"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        xrayPolicyStatement,
        defaultEventBusPolicyStatement
      ]
    }
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
  const stack = new Stack();

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  const app = () => {
    // Helper declaration
    new LambdaToEventbridge(stack, "lambda-to-eventbridge-stack", {
      existingLambdaObj: testLambdaFunction,
      existingVpc: testVpc,
    });
  };

  // Assertion
  expect(app).toThrowError();

});

// ----------------------------------------------------------------------------------
// Test lambda function custom environment variable and custom event bus permissions
// ----------------------------------------------------------------------------------
test('Test lambda function custom environment variable', () => {
  // Stack
  const stack = new Stack();

  // Helper declaration
  new LambdaToEventbridge(stack, 'lambda-to-eventbridge-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    eventBusProps: {eventBusName: 'customeventbus'},
    eventBusEnvironmentVariableName: 'CUSTOM_EVENTBUS_NAME'
  });

  // Check environment variables
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'nodejs14.x',
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_EVENTBUS_NAME: {
          Ref: "lambdatoeventbridgestackcustomeventbus25825BEF"
        }
      }
    }
  });

  expect(stack).toHaveResource('AWS::Events::EventBus', {
    Name: `customeventbus`
  });

  // Check lambda permissions to custom event bus
  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        xrayPolicyStatement,
        {
          Action: "events:PutEvents",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "lambdatoeventbridgestackcustomeventbus25825BEF",
              "Arn"
            ]
          }
        }
      ]
    }
  });
});

test('check multiple constructs in a single stack', () => {
  const stack = new Stack();

  const props: LambdaToEventbridgeProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    eventBusProps: { eventBusName: 'test' }
  };
  new LambdaToEventbridge(stack, 'test-new-lambda-eventbridge1', props);
  new LambdaToEventbridge(stack, 'test-new-lambda-eventbridge2', props);
  expect(stack).toCountResources('AWS::Events::EventBus', 2);
});

test('check multiple lambda functions publishing to single event bus', () => {
  const stack = new Stack();

  const props1: LambdaToEventbridgeProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    eventBusProps: { eventBusName: 'test' }
  };
  const construct = new LambdaToEventbridge(stack, 'test-new-lambda-eventbridge1', props1);

  const props2: LambdaToEventbridgeProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    existingEventBusInterface: construct.eventBus
  };
  new LambdaToEventbridge(stack, 'test-new-lambda-eventbridge2', props2);

  // Make sure only single event bus exists
  expect(stack).toCountResources('AWS::Events::EventBus', 1);

  // Make sure 2 lambda functions exist
  expect(stack).toCountResources('AWS::Lambda::Function', 2);

  // Check whether lambdas have permisison to publish to the event bus
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        xrayPolicyStatement,
        {
          Action: "events:PutEvents",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testnewlambdaeventbridge1test13E0B622",
              "Arn"
            ]
          }
        }
      ]
    }
  });

  // Check environment variables
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'nodejs14.x',
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        EVENTBUS_NAME: {
          Ref: "testnewlambdaeventbridge1test13E0B622"
        }
      }
    }
  });
});