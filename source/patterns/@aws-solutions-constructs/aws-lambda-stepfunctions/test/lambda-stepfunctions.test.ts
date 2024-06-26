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
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sftasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { LambdaToStepfunctions, LambdaToStepfunctionsProps } from '../lib';
import { Template, Match } from "aws-cdk-lib/assertions";

test('Test deployment with new Lambda function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToStepfunctions(stack, 'lambda-to-step-function-stack', {
    lambdaFunctionProps: {
      runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deploy-function'
      }
    },
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
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

test('Test deployment with existing Lambda function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const lambdaFunctionProps = {
    runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
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
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        LAMBDA_NAME: 'existing-function'
      }
    }
  });
});

test('Test invocation permissions', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const lambdaFunctionProps = {
    runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
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
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    }
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
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

test('Test the properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const pattern = new LambdaToStepfunctions(stack, 'lambda-to-step-function-stack', {
    lambdaFunctionProps: {
      runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'existing-function'
      }
    },
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
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

test('Test the properties with no CW Alarms', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const pattern = new LambdaToStepfunctions(stack, 'lambda-to-step-function-stack', {
    lambdaFunctionProps: {
      runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'existing-function'
      }
    },
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
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

test('Test lambda function custom environment variable', () => {
  // Stack
  const stack = new Stack();

  // Helper declaration
  new LambdaToStepfunctions(stack, 'lambda-to-step-function-stack', {
    lambdaFunctionProps: {
      runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    },
    stateMachineEnvironmentVariableName: 'CUSTOM_STATE_MAHINCE'
  });

  // Assertion
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'nodejs20.x',
    Environment: {
      Variables: {
        CUSTOM_STATE_MAHINCE: {
          Ref: 'lambdatostepfunctionstackStateMachine98EE8EFB'
        }
      }
    }
  });
});

test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToStepfunctions(stack, "lambda-to-stepfunctions-stack", {
    lambdaFunctionProps: {
      runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    },
    deployVpc: true
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
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

  template.hasResourceProperties("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });

  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::InternetGateway", 0);
});

test("Test minimal deployment that deploys a VPC w/vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToStepfunctions(stack, "lambda-to-stepfunctions-stack", {
    lambdaFunctionProps: {
      runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
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

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: "192.68.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });

  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::InternetGateway", 0);
});

test("Test minimal deployment with an existing VPC", () => {
  // Stack
  const stack = new Stack();
  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  new LambdaToStepfunctions(stack, "lambda-to-stepfunctions-stack", {
    lambdaFunctionProps: {
      runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    },
    existingVpc: testVpc,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
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

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });
});

test("Test minimal deployment with an existing VPC and existing Lambda function not in a VPC", () => {
  // Stack
  const stack = new Stack();

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  const app = () => {
    // buildLambdaFunction should throw an error if the Lambda function is not
    // attached to a VPC
    new LambdaToStepfunctions(stack, "lambda-to-stepfunctions-stack", {
      existingLambdaObj: testLambdaFunction,
      stateMachineProps: {
        definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
      },
      existingVpc: testVpc,
    });
  };

  // Assertion
  expect(app).toThrowError();

});

test("Confirm CheckVpcProps is called", () => {
  // Stack
  const stack = new Stack();
  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const app = () => {
    // Helper declaration
    new LambdaToStepfunctions(stack, "lambda-to-stepfunctions-stack", {
      lambdaFunctionProps: {
        runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda`)
      },
      stateMachineProps: {
        definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
      },
      existingVpc: testVpc,
      deployVpc: true,
    });
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: LambdaToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    },
    lambdaFunctionProps: {
      runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToStepfunctions(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});

test('Test deployment a state machine that needs priveleges for tasks', () => {
  // Stack
  const stack = new Stack();

  const clientFunction = defaults.deployLambdaFunction(stack, {
    runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    environment: {
      LAMBDA_NAME: 'existing-function'
    }
  });

  const taskFunction = defaults.deployLambdaFunction(stack, {
    runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda-task`),
    environment: {
      LAMBDA_NAME: 'existing-function'
    }
  }, "taskFunction");

  // Launch the construct
  const startState = new sftasks.LambdaInvoke(stack, 'permission-test', {
    lambdaFunction: taskFunction
  });

  new LambdaToStepfunctions(stack, 'test-lambda-step-function-construct', {
    existingLambdaObj: clientFunction,
    stateMachineProps: {
      definitionBody: sfn.DefinitionBody.fromChainable(startState)
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: Match.arrayWith([Match.objectLike({
        Action: 'lambda:InvokeFunction',
        Effect: 'Allow'
      })])
    }
  });
});