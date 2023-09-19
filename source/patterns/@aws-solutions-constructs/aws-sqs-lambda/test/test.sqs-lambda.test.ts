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
import { SqsToLambda, SqsToLambdaProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Template } from 'aws-cdk-lib/assertions';
import * as kms from 'aws-cdk-lib/aws-kms';

test('Pattern deployment w/ new Lambda function and overridden props', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        OVERRIDE: "TRUE"
      }
    },
    queueProps: {
      fifo: true
    },
    deployDeadLetterQueue: false,
    maxReceiveCount: 0
  };
  const app = new SqsToLambda(stack, 'test-sqs-lambda', props);
  // Assertion 1
  expect(app.sqsQueue).toHaveProperty('fifo', true);
  // Assertion 2
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        OVERRIDE: "TRUE",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

test('Test getter methods', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    deployDeadLetterQueue: true,
    maxReceiveCount: 0,
    queueProps: {}
  };
  const app = new SqsToLambda(stack, 'sqs-lambda', props);
  // Assertion 1
  expect(app.lambdaFunction !== null);
  // Assertion 2
  expect(app.sqsQueue !== null);
  // Assertion 3
  expect(app.deadLetterQueue !== null);
});

// --------------------------------------------------------------
// Test error handling for existing Lambda function
// --------------------------------------------------------------
test('Test error handling for existing Lambda function', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    existingLambdaObj: undefined,
    deployDeadLetterQueue: false,
    maxReceiveCount: 0,
    queueProps: {}
  };
    // Assertion 1
  expect(() => {
    new SqsToLambda(stack, 'test-sqs-lambda', props);
  }).toThrowError();
});

test('Test error handling for new Lambda function w/o required properties', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    deployDeadLetterQueue: false,
    maxReceiveCount: 0,
    queueProps: {}
  };
    // Assertion 1
  expect(() => {
    new SqsToLambda(stack, 'test-sqs-lambda', props);
  }).toThrowError();
});

test('Pattern deployment w/ batch size', () => {
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    sqsEventSourceProps: {
      batchSize: 5
    }
  };
  new SqsToLambda(stack, 'test-sqs-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
    BatchSize: 5
  });
});

test('Queue is encrypted with imported CMK when set on encryptionKey prop', () => {
  const stack = new Stack();

  const cmk = new kms.Key(stack, 'cmk');
  new SqsToLambda(stack, 'test-construct', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deployed-function'
      }
    },
    encryptionKey: cmk
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Queue is encrypted with imported CMK when set on queueProps.encryptionMasterKey prop', () => {
  const stack = new Stack();

  const cmk = new kms.Key(stack, 'cmk');
  new SqsToLambda(stack, 'test-construct', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deployed-function'
      }
    },
    queueProps: {
      encryptionMasterKey: cmk
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Queue is encrypted with provided encryptionKeyProps', () => {
  const stack = new Stack();

  new SqsToLambda(stack, 'test-construct', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deployed-function'
      }
    },
    encryptionKeyProps: {
      alias: 'new-key-alias-from-props'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::Queue', {
    KmsMasterKeyId: {
      'Fn::GetAtt': [
        'testconstructEncryptionKey6153B053',
        'Arn'
      ]
    },
  });

  template.hasResourceProperties('AWS::KMS::Alias', {
    AliasName: 'alias/new-key-alias-from-props',
    TargetKeyId: {
      'Fn::GetAtt': [
        'testconstructEncryptionKey6153B053',
        'Arn'
      ]
    }
  });
});

test('Queue is encrypted by default with SQS-managed KMS key when no other encryption properties are set', () => {
  const stack = new Stack();

  new SqsToLambda(stack, 'test-construct', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deployed-function'
      }
    },
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::Queue', {
    KmsMasterKeyId: "alias/aws/sqs"
  });
});

test('Queue is encrypted with customer managed KMS Key when enable encryption flag is true', () => {
  const stack = new Stack();

  new SqsToLambda(stack, 'test-construct', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        LAMBDA_NAME: 'deployed-function'
      }
    },
    enableEncryptionWithCustomerManagedKey: true
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::Queue', {
    KmsMasterKeyId: {
      'Fn::GetAtt': [
        'testconstructEncryptionKey6153B053',
        'Arn'
      ]
    },
  });
});

test('Confirm CheckSqsProps is called', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    deployDeadLetterQueue: true,
    maxReceiveCount: 0,
    queueProps: {},
    existingQueueObj: new sqs.Queue(stack, 'test', {})
  };

  const app = () => {
    new SqsToLambda(stack, 'test-apigateway-lambda', props);
  };
  expect(app).toThrowError("Error - Either provide queueProps or existingQueueObj, but not both.\n");
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: lambda.Runtime.NODEJS_16_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: SqsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new SqsToLambda(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
