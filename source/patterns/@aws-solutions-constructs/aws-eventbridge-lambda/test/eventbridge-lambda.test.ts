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

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import { EventbridgeToLambdaProps, EventbridgeToLambda } from '../lib/index';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as defaults from '@aws-solutions-constructs/core';

function deployNewFunc(stack: cdk.Stack) {
  const props: EventbridgeToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };

  return new EventbridgeToLambda(stack, 'test-eventbridge-lambda', props);
}

function deployNewEventBus(stack: cdk.Stack) {
  const props: EventbridgeToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    eventBusProps: { eventBusName: 'test' },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    }
  };
  return new EventbridgeToLambda(stack, 'test-new-eventbridge-lambda', props);
}

test('check lambda function properties for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "testeventbridgelambdaLambdaFunctionServiceRole6D02CEEE",
        "Arn"
      ]
    },
    Runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

test('check lambda function permission for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Permission', {
    Action: "lambda:InvokeFunction",
    FunctionName: {
      "Fn::GetAtt": [
        "testeventbridgelambdaLambdaFunction475423FD",
        "Arn"
      ]
    },
    Principal: "events.amazonaws.com",
    SourceArn: {
      "Fn::GetAtt": [
        "testeventbridgelambdaEventsRule7DB0954D",
        "Arn"
      ]
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

test('check events rule properties for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Events::Rule', {
    ScheduleExpression: "rate(5 minutes)",
    State: "ENABLED",
    Targets: [
      {
        Arn: {
          "Fn::GetAtt": [
            "testeventbridgelambdaLambdaFunction475423FD",
            "Arn"
          ]
        },
        Id: "Target0"
      }
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: EventbridgeToLambda = deployNewFunc(stack);

  expect(construct.eventsRule).toBeDefined();
  expect(construct.lambdaFunction).toBeDefined();
});

test('check exception for Missing existingObj from props', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToLambdaProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };

  try {
    new EventbridgeToLambda(stack, 'test-eventbridge-lambda', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check eventbus property, snapshot & eventbus exists', () => {
  const stack = new cdk.Stack();

  const construct: EventbridgeToLambda = deployNewEventBus(stack);

  expect(construct.eventsRule).toBeDefined();
  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.eventBus).toBeDefined();
  // Check whether eventbus exists
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Events::EventBus', 1);
});

test('check custom event bus resource with props when deploy:true', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    eventBusProps: {
      eventBusName: `testeventbus`
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    }
  };
  new EventbridgeToLambda(stack, 'test-new-eventbridge-with-props-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Events::EventBus', {
    Name: `testeventbus`
  });
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: EventbridgeToLambdaProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new EventbridgeToLambda(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});

test('Confirm CheckEventBridgeProps is being called', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: { eventBusName: 'test' },
    existingEventBusInterface: new events.EventBus(stack, `test-existing-eventbus`, { eventBusName: 'test' })
  };

  const app = () => {
    new EventbridgeToLambda(stack, 'test-eventbridge-lambda', props);
  };
  expect(app).toThrowError('Error - Either provide existingEventBusInterface or eventBusProps, but not both.\n');
});
