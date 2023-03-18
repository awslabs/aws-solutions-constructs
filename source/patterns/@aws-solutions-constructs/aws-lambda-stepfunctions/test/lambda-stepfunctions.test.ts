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
import * as defaults from '@aws-solutions-constructs/core';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { LambdaToStepfunctions } from '../lib';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test deployment with new Lambda function
// --------------------------------------------------------------
test('Test deployment with new Lambda function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const startState = new stepfunctions.Pass(stack, 'StartState');
  new LambdaToStepfunctions(stack, 'lambda-to-step-function-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deploy-function'
      }
    },
    stateMachineProps: {
      definition: startState
    }
  });

  expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        LAMBDA_NAME: 'deploy-function',
        STATE_MACHINE_ARN: {
          Ref: 'lambdatostepfunctionstackStateMachine98EE8EFB'
        }
      }
    }
  });
});

// --------------------------------------------------------------
// Test deployment with existing Lambda function
// --------------------------------------------------------------
test('Test deployment with existing Lambda function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const startState = new stepfunctions.Pass(stack, 'StartState');
  const lambdaFunctionProps = {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    environment: {
      LAMBDA_NAME: 'existing-function'
    }
  };
  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);
  // Add the pattern
  new LambdaToStepfunctions(stack, 'test-lambda-step-function-construct', {
    existingLambdaObj: fn,
    stateMachineProps: {
      definition: startState
    }
  });

  expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        LAMBDA_NAME: 'existing-function'
      }
    }
  });
});

// --------------------------------------------------------------
// Test invocation permissions
// --------------------------------------------------------------
test('Test invocation permissions', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const startState = new stepfunctions.Pass(stack, 'StartState');
  const lambdaFunctionProps = {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    environment: {
      LAMBDA_NAME: 'existing-function'
    }
  };
  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);
  // Add the pattern
  new LambdaToStepfunctions(stack, 'test-lambda-step-function-stack', {
    existingLambdaObj: fn,
    stateMachineProps: {
      definition: startState
    }
  });
  // Assertion 1
  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
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
          Action: "states:StartExecution",
          Effect: "Allow",
          Resource: {
            Ref: "testlambdastepfunctionstackStateMachine373C0BB9"
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

// --------------------------------------------------------------
// Test the properties
// --------------------------------------------------------------
test('Test the properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const startState = new stepfunctions.Pass(stack, 'StartState');
  const pattern = new LambdaToStepfunctions(stack, 'lambda-to-step-function-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'existing-function'
      }
    },
    stateMachineProps: {
      definition: startState
    }
  });
    // Assertion 1
  const func = pattern.lambdaFunction;
  expect(func).toBeDefined();
  // Assertion 2
  const stateMachine = pattern.stateMachine;
  expect(stateMachine).toBeDefined();
  // Assertion 3
  const cwAlarm = pattern.cloudwatchAlarms;
  expect(cwAlarm).toBeDefined();
  expect(pattern.stateMachineLogGroup).toBeDefined();
});

// --------------------------------------------------------------
// Test the properties
// --------------------------------------------------------------
test('Test the properties with no CW Alarms', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const startState = new stepfunctions.Pass(stack, 'StartState');
  const pattern = new LambdaToStepfunctions(stack, 'lambda-to-step-function-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'existing-function'
      }
    },
    stateMachineProps: {
      definition: startState
    },
    createCloudWatchAlarms: false
  });
  // Assertion 1
  expect(pattern.lambdaFunction).toBeDefined();
  // Assertion 2
  expect(pattern.stateMachine).toBeDefined();
  // Assertion 3
  expect(pattern.cloudwatchAlarms).toBeUndefined();
  expect(pattern.stateMachineLogGroup).toBeDefined();
});

// --------------------------------------------------------------
// Test lambda function custom environment variable
// --------------------------------------------------------------
test('Test lambda function custom environment variable', () => {
  // Stack
  const stack = new Stack();

  // Helper declaration
  const startState = new stepfunctions.Pass(stack, 'StartState');
  new LambdaToStepfunctions(stack, 'lambda-to-step-function-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stateMachineProps: {
      definition: startState
    },
    stateMachineEnvironmentVariableName: 'CUSTOM_STATE_MAHINCE'
  });

  // Assertion
  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'nodejs14.x',
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_STATE_MAHINCE: {
          Ref: 'lambdatostepfunctionstackStateMachine98EE8EFB'
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
  const stack = new Stack();
  const startState = new stepfunctions.Pass(stack, 'StartState');
  // Helper declaration
  new LambdaToStepfunctions(stack, "lambda-to-stepfunctions-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stateMachineProps: {
      definition: startState
    },
    deployVpc: true
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatostepfunctionsstackReplaceDefaultSecurityGroupsecuritygroup0F25B19B",
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
  const startState = new stepfunctions.Pass(stack, 'StartState');
  // Helper declaration
  new LambdaToStepfunctions(stack, "lambda-to-stepfunctions-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stateMachineProps: {
      definition: startState
    },
    vpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      ipAddresses: ec2.IpAddresses.cidr("192.68.0.0/16"),
    },
    deployVpc: true,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatostepfunctionsstackReplaceDefaultSecurityGroupsecuritygroup0F25B19B",
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
  const startState = new stepfunctions.Pass(stack, 'StartState');
  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  new LambdaToStepfunctions(stack, "lambda-to-stepfunctions-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stateMachineProps: {
      definition: startState
    },
    existingVpc: testVpc,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatostepfunctionsstackReplaceDefaultSecurityGroupsecuritygroup0F25B19B",
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
  const startState = new stepfunctions.Pass(stack, 'StartState');

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  const app = () => {
    // Helper declaration
    new LambdaToStepfunctions(stack, "lambda-to-stepfunctions-stack", {
      existingLambdaObj: testLambdaFunction,
      stateMachineProps: {
        definition: startState
      },
      existingVpc: testVpc,
    });
  };

  // Assertion
  expect(app).toThrowError();

});

// --------------------------------------------------------------
// Test bad call with existingVpc and deployVpc
// --------------------------------------------------------------
test("Test bad call with existingVpc and deployVpc", () => {
  // Stack
  const stack = new Stack();
  const startState = new stepfunctions.Pass(stack, 'StartState');
  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const app = () => {
    // Helper declaration
    new LambdaToStepfunctions(stack, "lambda-to-stepfunctions-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda`)
      },
      stateMachineProps: {
        definition: startState
      },
      existingVpc: testVpc,
      deployVpc: true,
    });
  };
  // Assertion
  expect(app).toThrowError();
});