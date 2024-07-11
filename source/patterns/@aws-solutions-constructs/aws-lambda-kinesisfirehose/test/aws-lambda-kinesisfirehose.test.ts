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
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaToKinesisFirehose, LambdaToKinesisFirehoseProps } from '../lib';
import * as defaults from '@aws-solutions-constructs/core';
import { GetTestFirehoseDestination } from './test-helper';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

test('Test that properties are set correctly', () => {
  // Stack
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  const construct = new LambdaToKinesisFirehose(stack, 'test-target', {
    existingKinesisFirehose: destination.kinesisFirehose,
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    }
  });

  expect(construct.kinesisFirehose).toBeDefined();
  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.vpc).not.toBeDefined();
});

test('Test existing function is utilized correctly', () => {
  // Stack
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');
  const testName = 'test-name';
  const existingFunction = new lambda.Function(stack, 'test-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    functionName: testName
  });

  new LambdaToKinesisFirehose(stack, 'test-target', {
    existingKinesisFirehose: destination.kinesisFirehose,
    existingLambdaObj: existingFunction
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: testName
  });

  // This is 2 because there's a lambda function in the custom resource to
  // delete all the objects when cleaning up the s3 bucket in kinesisfirehose-s3
  template.resourceCountIs('AWS::Lambda::Function', 2);
});

test('Test that lambda function props are incorporated', () => {
  // Stack
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');
  const testName = 'test-name';

  new LambdaToKinesisFirehose(stack, 'test-target', {
    existingKinesisFirehose: destination.kinesisFirehose,
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      functionName: testName
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: testName
  });
});

test('Test that new VPC is created', () => {
  // Stack
  const stack = new cdk.Stack();
  const cidrRange = '172.0.0.0/16';

  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  const construct = new LambdaToKinesisFirehose(stack, 'test-target', {
    existingKinesisFirehose: destination.kinesisFirehose,
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    deployVpc: true,
    vpcProps: {
      ipAddresses: ec2.IpAddresses.cidr(cidrRange)
    }
  });

  expect(construct.vpc).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: cidrRange
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".kinesis-firehose"
        ]
      ]
    },
  });
});

test('Test that existing VPC is used', () => {
  // Stack
  const stack = new cdk.Stack();
  const cidrInGetTestVpc = '172.168.0.0/16';

  const destination = GetTestFirehoseDestination(stack, 'test-destination');
  const myVpc = defaults.getTestVpc(stack, false);
  const construct = new LambdaToKinesisFirehose(stack, 'test-target', {
    existingKinesisFirehose: destination.kinesisFirehose,
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingVpc: myVpc
  });

  expect(construct.vpc).toBeDefined();

  // Make sure we didn't deploy a new one anyway
  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::EC2::VPC", 1);

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: cidrInGetTestVpc
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".kinesis-firehose"
        ]
      ]
    },
  });
});

test('Test fail if existingFirehose does not have a stream name', () => {
  // Stack
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');
  const testName = 'test-name';

  const mutatedFirehose = defaults.overrideProps(destination.kinesisFirehose, {});
  mutatedFirehose.deliveryStreamName = undefined;

  const app = () => {
    new LambdaToKinesisFirehose(stack, 'test-target', {
      existingKinesisFirehose: mutatedFirehose,
      lambdaFunctionProps: {
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        functionName: testName
      }
    });
  };

  expect(app).toThrowError(/existingKinesisFirehose must have a defined deliveryStreamName/);
});

test('Test fail Vpc check with vpcProps yet deployVpc is false', () => {
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  const app = () => {
    new LambdaToKinesisFirehose(stack, 'test-target', {
      existingKinesisFirehose: destination.kinesisFirehose,
      lambdaFunctionProps: {
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      deployVpc: false,
      vpcProps: {
        ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      },
    });
  };

  // Assertion
  expect(app).toThrowError('Error - If deployVpc is not true, then vpcProps is ignored');
});

test('Test fail Vpc check with vpcProps yet deployVpc is undefined', () => {
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  const app = () => {
    new LambdaToKinesisFirehose(stack, 'test-target', {
      existingKinesisFirehose: destination.kinesisFirehose,
      lambdaFunctionProps: {
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      vpcProps: {
        ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      },
    });
  };

  // Assertion
  expect(app).toThrowError('Error - If deployVpc is not true, then vpcProps is ignored');
});

test('Confirm CheckVpcProps() is being called', () => {
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  const app = () => {
    // Helper declaration
    new LambdaToKinesisFirehose(stack, 'test-lambda-kinesisfirehose', {
      existingKinesisFirehose: destination.kinesisFirehose,
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: 'index.handler'
      },
      deployVpc: true,
      existingVpc: vpc
    });
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  const props: LambdaToKinesisFirehoseProps = {
    existingKinesisFirehose: destination.kinesisFirehose,
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToKinesisFirehose(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
