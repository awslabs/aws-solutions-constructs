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
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as defaults from '@aws-solutions-constructs/core';
import { LambdaToSqsToLambda, LambdaToSqsToLambdaProps } from '../lib';
import { Template } from 'aws-cdk-lib/assertions';

test('Test minimal deployment', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
      functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
    }
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);

  // Assertion 2: test for an producer function
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'producer-function'
  });
  // Assertion 3: test for a consumer function
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'consumer-function'
  });
  // Assertion 4: test for a queue (queue and DLQ)
  template.resourceCountIs('AWS::SQS::Queue', 2);
  // Assertion 5: test for send-message permissions (only) on the producer function
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
            "sqs:SendMessage",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "lambdasqslambdalambdatosqsqueue49588D68",
              "Arn"
            ]
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
  // Assertion 6: test for consume-message permissions (only) on the consumer function
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
            "sqs:ReceiveMessage",
            "sqs:ChangeMessageVisibility",
            "sqs:GetQueueUrl",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "lambdasqslambdalambdatosqsqueue49588D68",
              "Arn"
            ]
          }
        }
      ],
      Version: "2012-10-17"
    },
  });
});

test('Test deployment w/ existing producer function', () => {
  // Stack
  const stack = new Stack();
  // Define existing resources
  const existingProducerFn = defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
      functionName: 'existing-producer-function'
    }
  });
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    existingProducerLambdaObj: existingProducerFn,
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
      functionName: 'deployed-consumer-function'
    }
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);

  // Assertion 2: test for the existing producer function
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'existing-producer-function'
  });
  // Assertion 3: test for the deployed consumer function
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'deployed-consumer-function'
  });
});

test('Test deployment w/ existing consumer function', () => {
  // Stack
  const stack = new Stack();
  // Define existing resources
  const existingConsumerFn = defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
      functionName: 'existing-consumer-function'
    }
  });
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
      functionName: 'deployed-producer-function'
    },
    existingConsumerLambdaObj: existingConsumerFn
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);

  // Assertion 2: test for the deployed producer function
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'deployed-producer-function'
  });
  // Assertion 3: test for the existing consumer function
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'existing-consumer-function'
  });
});

test('Test deployment w/ existing queue', () => {
  // Stack
  const stack = new Stack();
  // Define existing resources
  const buildQueueResponse = defaults.buildQueue(stack, 'existing-queue', {
    queueProps: {
      queueName: 'existing-queue'
    }
  });
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
      functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
    },
    existingQueueObj: buildQueueResponse.queue
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);

  // Assertion 2: test for the existing queue
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::Queue', {
    QueueName: 'existing-queue'
  });
});

test('Test deployment w/ DLQ explicitly disabled', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`)
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`)
    },
    deployDeadLetterQueue: false,
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);

  // Assertion 2: test for a non-existing DLQ
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::SQS::Queue', 1);
  defaults.expectNonexistence(stack, 'AWS::SQS::Queue', {
    RedrivePolicy: {
    }
  });
});

test('Test deployment w/ DLQ explicitly enabled and w/ MRC override', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`)
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`)
    },
    deployDeadLetterQueue: true,
    maxReceiveCount: 6
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);

  const template = Template.fromStack(stack);
  // Assertion 2: test for an existing DLQ
  template.resourceCountIs('AWS::SQS::Queue', 2);
  template.hasResourceProperties('AWS::SQS::Queue', {
    RedrivePolicy: {
    }
  });
  // Assertion 3: test for the overridden max receive count
  template.hasResourceProperties('AWS::SQS::Queue', {
    RedrivePolicy: {
      maxReceiveCount: 6
    }
  });
});

test('Test overrides for producer and consumer functions', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
      functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
    }
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);

  // Assertion 2: test for updated runtime on producer function
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING
  });
  // Assertion 3: test for updated runtime on consumer function
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING
  });
});

test('Test the public pattern props', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
      functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
    }
  };
  const pattern = new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);
  // Assertion 1: get the producer function
  expect(pattern.producerLambdaFunction).toBeDefined();
  // Assertion 2: get the queue
  expect(pattern.sqsQueue).toBeDefined();
  // Assertion 3: get the dead letter queue
  expect(pattern.deadLetterQueue).toBeDefined();
  // Assertion 4: get the consumer function
  expect(pattern.consumerLambdaFunction).toBeDefined();
});

test('Test lambda function custom environment variable', () => {
  // Stack
  const stack = new Stack();

  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
      functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
    },
    queueEnvironmentVariableName: 'CUSTOM_QUEUE_NAME'
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);

  // Assertion
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'producer-function',
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_QUEUE_NAME: {
          Ref: 'lambdasqslambdalambdatosqsqueue49588D68'
        }
      }
    }
  });
});

test('Pattern deployment w/ batch size', () => {
  const stack = new Stack();
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
      functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
    },
    sqsEventSourceProps: {
      batchSize: 5
    }
  };
  new LambdaToSqsToLambda(stack, 'test-lambda-sqs-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
    BatchSize: 5
  });
});

test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSqsToLambda(stack, "lambda-to-sqs-to-lambda-stack", {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
      functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
    },
    deployVpc: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatosqstolambdastacklambdatosqsReplaceDefaultSecurityGroupsecuritygroup90A497DF",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "lambdatosqstolambdastackVpcisolatedSubnet1Subnet70F24179",
        },
        {
          Ref: "lambdatosqstolambdastackVpcisolatedSubnet2Subnet1D6A3FAF",
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
  new LambdaToSqsToLambda(stack, "lambda-to-sqs-to-lambda-stack", {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
      functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
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
            "lambdatosqstolambdastacklambdatosqsReplaceDefaultSecurityGroupsecuritygroup90A497DF",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "lambdatosqstolambdastackVpcisolatedSubnet1Subnet70F24179",
        },
        {
          Ref: "lambdatosqstolambdastackVpcisolatedSubnet2Subnet1D6A3FAF",
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
  new LambdaToSqsToLambda(stack, "lambda-to-sqs-to-lambda-stack", {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
      functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
    },
    existingVpc: testVpc,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatosqstolambdastacklambdatosqsReplaceDefaultSecurityGroupsecuritygroup90A497DF",
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

test("Test bad call with existingVpc and deployVpc", () => {
  // Stack
  const stack = new Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const app = () => {
    // Helper declaration
    new LambdaToSqsToLambda(stack, "lambda-to-sqs-to-lambda-stack", {
      producerLambdaFunctionProps: {
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`),
        functionName: 'producer-function'
      },
      consumerLambdaFunctionProps: {
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`),
        functionName: 'consumer-function'
      },
      existingVpc: testVpc,
      deployVpc: true,
    });
  };
  // Assertion
  expect(app).toThrowError();
});

test('Confirm CheckSqsProps is being called', () => {
  // NOTE: CheckSqsProps is called from both lambda-sqs and sqs-lambda internally
  // Stack
  const stack = new Stack();
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    queueProps: {},
    existingQueueObj: new sqs.Queue(stack, 'test', {})
  };

  const app = () => {
    new LambdaToSqsToLambda(stack, 'test-eventbridge-sqs', props);
  };
  expect(app).toThrowError("Error - Either provide queueProps or existingQueueObj, but not both.\n");
});

test('Confirm CheckLambdaProps is being called', () => {
  const stack = new Stack();
  const existingLambdaObj = new lambda.Function(stack, 'ExistingLambda', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: LambdaToSqsToLambdaProps = {
    existingProducerLambdaObj: existingLambdaObj,
    producerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    consumerLambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
  };

  const app = () => {
    new LambdaToSqsToLambda(stack, 'test-lambda-sqs-lambda', props);
  };
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
