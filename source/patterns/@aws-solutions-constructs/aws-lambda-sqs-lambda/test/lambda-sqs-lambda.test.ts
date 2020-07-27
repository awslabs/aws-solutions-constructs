/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Stack } from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as defaults from '@aws-solutions-constructs/core';
import { LambdaToSqsToLambda, LambdaToSqsToLambdaProps } from '../lib';
import { SynthUtils, haveResourceLike } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test minimal deployment
// --------------------------------------------------------------
test('Test minimal deployment', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.asset(`${__dirname}/lambda/producer-function`),
        functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.asset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
    }
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);
  // Assertion 1: snapshot test
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2: test for an producer function
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    FunctionName: 'producer-function'
  });
  // Assertion 3: test for a consumer function
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    FunctionName: 'consumer-function'
  });
  // Assertion 4: test for a queue
  expect(stack).toHaveResource('AWS::SQS::Queue');
  // Assertion 5: test for send-message permissions (only) on the producer function
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        { Action: [
          "sqs:SendMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]}
      ]
    }
  });
  // Assertion 6: test for consume-message permissions (only) on the consumer function
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        { Action: [
          "sqs:ReceiveMessage",
          "sqs:ChangeMessageVisibility",
          "sqs:GetQueueUrl",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]}
      ]
    }
  });
});

// --------------------------------------------------------------
// Test deployment w/ existing producer function
// --------------------------------------------------------------
test('Test deployment w/ existing producer function', () => {
  // Stack
  const stack = new Stack();
  // Define existing resources
  const existingProducerFn = defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.asset(`${__dirname}/lambda/producer-function`),
      functionName: 'existing-producer-function'
    }
  });
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    existingProducerLambdaObj: existingProducerFn,
    consumerLambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.asset(`${__dirname}/lambda/consumer-function`),
      functionName: 'deployed-consumer-function'
    }
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);
  // Assertion 1: snapshot test
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2: test for the existing producer function
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    FunctionName: 'existing-producer-function'
  });
  // Assertion 3: test for the deployed consumer function
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    FunctionName: 'deployed-consumer-function'
  });
});

// --------------------------------------------------------------
// Test deployment w/ existing consumer function
// --------------------------------------------------------------
test('Test deployment w/ existing consumer function', () => {
  // Stack
  const stack = new Stack();
  // Define existing resources
  const existingConsumerFn = defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.asset(`${__dirname}/lambda/consumer-function`),
      functionName: 'existing-consumer-function'
    }
  });
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.asset(`${__dirname}/lambda/producer-function`),
      functionName: 'deployed-producer-function'
    },
    existingConsumerLambdaObj: existingConsumerFn
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);
  // Assertion 1: snapshot test
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2: test for the deployed producer function
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    FunctionName: 'deployed-producer-function'
  });
  // Assertion 3: test for the existing consumer function
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    FunctionName: 'existing-consumer-function'
  });
});

// --------------------------------------------------------------
// Test deployment w/ existing queue
// --------------------------------------------------------------
test('Test deployment w/ existing queue', () => {
  // Stack
  const stack = new Stack();
  // Define existing resources
  const existingQueue = defaults.buildQueue(stack, 'existing-queue', {
    queueProps: {
      queueName: 'existing-queue'
    }
  });
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.asset(`${__dirname}/lambda/producer-function`),
        functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.asset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
    },
    existingQueueObj: existingQueue
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);
  // Assertion 1: snapshot test
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2: test for the existing queue
  expect(stack).toHaveResource('AWS::SQS::Queue', {
    QueueName: 'existing-queue'
  });
});

// --------------------------------------------------------------
// Test deployment w/ DLQ explicitly disabled
// --------------------------------------------------------------
test('Test deployment w/ DLQ explicitly disabled', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.asset(`${__dirname}/lambda/producer-function`)
    },
    consumerLambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.asset(`${__dirname}/lambda/consumer-function`)
    },
    deployDeadLetterQueue: false,
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);
  // Assertion 1: snapshot test
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2: test for a non-existing DLQ
  expect(!haveResourceLike('AWS::SQS::Queue', {
    RedrivePolicy: {
      deadLetterTargetArn: "a-target-arn"
    }
  }));
});

// --------------------------------------------------------------
// Test deployment w/ DLQ explicitly enabled and w/ MRC override
// --------------------------------------------------------------
test('Test deployment w/ DLQ explicitly enabled and w/ MRC override', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.asset(`${__dirname}/lambda/producer-function`)
    },
    consumerLambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.asset(`${__dirname}/lambda/consumer-function`)
    },
    deployDeadLetterQueue: true,
    maxReceiveCount: 6
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);
  // Assertion 1: snapshot test
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2: test for an existing DLQ
  expect(haveResourceLike('AWS::SQS::Queue', {
    RedrivePolicy: {
      deadLetterTargetArn: "a-target-arn"
    }
  }));
  // Assertion 3: test for the overridden max receive count
  expect(haveResourceLike('AWS::SQS::Queue', {
    RedrivePolicy: {
      maxReceiveCount: 6
    }
  }));
});

// --------------------------------------------------------------
// Test overrides for producer and consumer functions
// --------------------------------------------------------------
test('Test overrides for producer and consumer functions', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler',
        code: lambda.Code.asset(`${__dirname}/lambda/producer-function`),
        functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.asset(`${__dirname}/lambda/consumer-function`),
      functionName: 'consumer-function'
    }
  };
  new LambdaToSqsToLambda(stack, 'lambda-sqs-lambda', props);
  // Assertion 1: snapshot test
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2: test for updated runtime on producer function
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Runtime: "nodejs12.x"
  });
  // Assertion 3: test for updated runtime on consumer function
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Runtime: "nodejs12.x"
  });
});

// --------------------------------------------------------------
// Test the public pattern props
// --------------------------------------------------------------
test('Test the public pattern props', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const props: LambdaToSqsToLambdaProps = {
    producerLambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.asset(`${__dirname}/lambda/producer-function`),
        functionName: 'producer-function'
    },
    consumerLambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.asset(`${__dirname}/lambda/consumer-function`),
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