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

import { Stack } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as defaults from "../index";
import { Template } from 'aws-cdk-lib/assertions';
import { Duration } from "aws-cdk-lib";
import * as iam from 'aws-cdk-lib/aws-iam';

test("test FunctionProps override code and runtime", () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda-test`),
    runtime: lambda.Runtime.PYTHON_3_6,
    handler: "index.handler",
  };

  defaults.deployLambdaFunction(stack, inProps);

  Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": ["LambdaFunctionServiceRole0C4CDE0B", "Arn"],
    },
    Runtime: "python3.6",
  });
});

test("test FunctionProps override timeout", () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    timeout: Duration.seconds(5),
  };

  defaults.deployLambdaFunction(stack, inProps);

  Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": ["LambdaFunctionServiceRole0C4CDE0B", "Arn"],
    },
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Timeout: 5,
  });
});

test("test FunctionProps for environment variable when runtime = NODEJS", () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
  };

  defaults.deployLambdaFunction(stack, inProps);

  Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": ["LambdaFunctionServiceRole0C4CDE0B", "Arn"],
    },
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
});

test("test FunctionProps when runtime = PYTHON", () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda-test`),
    runtime: lambda.Runtime.PYTHON_3_6,
    handler: "index.handler",
  };

  defaults.deployLambdaFunction(stack, inProps);

  Template.fromStack(stack).hasResourceProperties(
    "AWS::Lambda::Function",
    {
      Handler: "index.handler",
      Role: {
        "Fn::GetAtt": ["LambdaFunctionServiceRole0C4CDE0B", "Arn"],
      },
      Runtime: "python3.6",
      TracingConfig: {
        Mode: "Active",
      },
    }
  );
});

test("test buildLambdaFunction with deploy = true", () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda-test`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
  };

  defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: inProps,
  });

  Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": ["LambdaFunctionServiceRole0C4CDE0B", "Arn"],
    },
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
  });
});

test("test buildLambdaFunction with existing Lambda function (no VPC)", () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda-test`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
  };

  const newFunction = new lambda.Function(stack, "existingFunction", inProps);

  const construct = defaults.buildLambdaFunction(stack, {
    existingLambdaObj: newFunction
  });

  expect(construct).toBe(newFunction);

});

test("test buildLambdaFunction with FunctionProps", () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda-test`),
    runtime: lambda.Runtime.PYTHON_3_6,
    handler: "index.handler",
  };

  defaults.deployLambdaFunction(stack, inProps);

  Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": ["LambdaFunctionServiceRole0C4CDE0B", "Arn"],
    },
    Runtime: "python3.6",
  });
});

test("test exception", () => {
  const stack = new Stack();

  try {
    defaults.buildLambdaFunction(stack, {});
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test("test buildLambdaFunction with Tracing Disabled", () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda-test`),
    runtime: lambda.Runtime.PYTHON_3_6,
    handler: "index.handler",
    tracing: lambda.Tracing.DISABLED,
  };

  defaults.deployLambdaFunction(stack, inProps);

  Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": ["LambdaFunctionServiceRole0C4CDE0B", "Arn"],
    },
    Runtime: "python3.6",
  });
});

test("test buildLambdaFunction when Lambda properties includes a VPC", () => {
  const stack = new Stack();

  const fakeVpc = new ec2.Vpc(stack, "vpc", {});

  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    vpc: fakeVpc,
  };

  defaults.deployLambdaFunction(stack, lambdaFunctionProps);

  Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "ec2:CreateNetworkInterface",
            "ec2:DescribeNetworkInterfaces",
            "ec2:DeleteNetworkInterface",
            "ec2:AssignPrivateIpAddresses",
            "ec2:UnassignPrivateIpAddresses",
          ],
          Effect: "Allow",
          Resource: "*",
        },
        {
          Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
          Effect: "Allow",
          Resource: "*",
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("Test for error if VPC in arguments AND in Lambda Function properties", () => {
  const stack = new Stack();

  const fakeVpc = new ec2.Vpc(stack, "vpc", {});

  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    vpc: fakeVpc,
  };

  const app = () => {
    defaults.deployLambdaFunction(stack, lambdaFunctionProps, undefined, fakeVpc);
  };

  expect(app).toThrowError();
});

test("Test minimal deployment with an existing VPC and existing Lambda function not in a VPC", () => {
  // Stack
  const stack = new Stack();

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const app = () => {
    defaults.buildLambdaFunction(stack, {
      existingLambdaObj: testLambdaFunction,
      vpc: testVpc,
    });

  };

  // Assertion
  expect(app).toThrowError();

});

test("Test minimal deployment with an existing VPC and existing Lambda function in a VPC", () => {
  // Stack
  const stack = new Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    vpc: testVpc,
  });

  defaults.buildLambdaFunction(stack, {
    existingLambdaObj: testLambdaFunction,
    vpc: testVpc,
  });

  // All we're doing here is confirming that buildLambdaFunction does NOT
  // throw an exception when the existing Lambda function is in a VPCs

});

test("Test generating synthesized permission IDs", () => {
  // Stack
  const stack = new Stack();
  const coreName = "TestInvokePermission";

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  defaults.addPermission(testLambdaFunction, coreName, {
    principal: new iam.ServicePrincipal('iot.amazonaws.com'),
    sourceArn: 'fake:arn'
  });

  defaults.addPermission(testLambdaFunction, coreName, {
    principal: new iam.ServicePrincipal('iot.amazonaws.com'),
    sourceArn: 'fake:arn:two'
  });

  // Synth on this stack masks the information we're looking for in
  // a longer resource name, so we can't use expect.toHaveResource. We
  // need to look at the value in the CDK structure.
  expect(testLambdaFunction.permissionsNode.children.find(permission => permission.node.id === `${coreName}-1`)).toBeDefined();
  expect(testLambdaFunction.permissionsNode.children.find(permission => permission.node.id === `${coreName}-2`)).toBeDefined();

});

test("Test invalid synthesized permission names", () => {
  // Stack
  const stack = new Stack();
  const coreName = "TestInvokePermission";

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  testLambdaFunction.addPermission(coreName, {
    principal: new iam.ServicePrincipal('iot.amazonaws.com'),
    sourceArn: 'fake:arn'
  });

  const app = () => {
    defaults.addPermission(testLambdaFunction, coreName, {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      sourceArn: 'fake:arn:two'
    });
  };

  // Assertion
  expect(app).toThrowError();
});

test('Test environment variable for correct node version', () => {
  // Stack
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };

  defaults.deployLambdaFunction(stack, inProps);

  // Assertion
  Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Role: {
      'Fn::GetAtt': ['LambdaFunctionServiceRole0C4CDE0B', 'Arn']
    },
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
      }
    }
  });
});

test('Test minimum deployment with an existing VPC as a vpc parameter in deployLambdaFunction', () => {
  // Stack
  const stack = new Stack();
  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  };
  const fakeVpc: ec2.Vpc = new ec2.Vpc(stack, 'vpc', {});

  defaults.deployLambdaFunction(stack, inProps, undefined, fakeVpc);

  // Assertion
  Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
    VpcConfig: {
      SecurityGroupIds: [
        {
          'Fn::GetAtt': [
            'ReplaceDefaultSecurityGroupsecuritygroup8F9FCFA1',
            'GroupId'
          ]
        }
      ],
      SubnetIds: [
        {
          Ref: 'vpcPrivateSubnet1Subnet934893E8'
        },
        {
          Ref: 'vpcPrivateSubnet2Subnet7031C2BA'
        }
      ]
    }
  });
});

test("Test retrieving lambda vpc security group ids", () => {
  const stack = new Stack();

  const vpc = defaults.getTestVpc(stack);
  const securityGroup1 = new ec2.SecurityGroup(stack, 'SecurityGroup1', { vpc });
  const securityGroup2 = new ec2.SecurityGroup(stack, 'SecurityGroup2', { vpc });

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    securityGroups: [securityGroup1, securityGroup2],
    vpc
  });

  const securityGroups = defaults.getLambdaVpcSecurityGroupIds(testLambdaFunction);

  expect(securityGroups).toContain(securityGroup1.securityGroupId);
  expect(securityGroups).toContain(securityGroup2.securityGroupId);
});

test('test buildLambdaFunction with lambdaFunctionProps default id', () => {
  const stack = new Stack();

  defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    }
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
    Role: {
      'Fn::GetAtt': ['LambdaFunctionServiceRole0C4CDE0B', 'Arn'],
    },
  });
});

test('test buildLambdaFunction with lambdaFunctionProps custom id', () => {
  const stack = new Stack();

  defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      functionName: 'MyTestFunction',
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    }
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
    Role: {
      'Fn::GetAtt': ['MyTestFunctionServiceRole37517223', 'Arn'],
    },
  });
});

test('buildLambdaFunction uses constructId when specified', () => {
  const stack = new Stack();

  defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    }
  }, 'MyConstructId');

  Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
    Role: {
      'Fn::GetAtt': ['MyConstructIdServiceRole271C08FC', 'Arn'],
    },
  });
});

// specifying constructId takes precedence over functionName for setting the
// underlying lambda function and iam role construct ids.
test('buildLambdaFunction uses constructId when both constructId and functionName are specified', () => {
  const stack = new Stack();

  defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      functionName: 'MyTestFunction',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    }
  }, 'MyConstructId');

  Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
    Role: {
      'Fn::GetAtt': ['MyConstructIdServiceRole271C08FC', 'Arn'],
    },
  });
});

test('buildLambdaFunction uses functionName when constructId is not specified', () => {
  const stack = new Stack();

  defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      functionName: 'MyTestFunction',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    }
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
    Role: {
      'Fn::GetAtt': ['MyTestFunctionServiceRole37517223', 'Arn'],
    },
  });
});

test('buildLambdaFunction uses default name when neither constructId or functionName is specified', () => {
  const stack = new Stack();

  defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    }
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
    Role: {
      'Fn::GetAtt': ['LambdaFunctionServiceRole0C4CDE0B', 'Arn'],
    },
  });
});

// ---------------------------
// Prop Tests
// ---------------------------
test("Test fail Lambda function check", () => {
  const stack = new Stack();

  const props: defaults.LambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
    },
    existingLambdaObj: new lambda.Function(stack, "placeholder", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
    }),
  };

  const app = () => {
    defaults.CheckLambdaProps(props);
  };

  // Assertion
  expect(app).toThrowError(
    "Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n"
  );
});
