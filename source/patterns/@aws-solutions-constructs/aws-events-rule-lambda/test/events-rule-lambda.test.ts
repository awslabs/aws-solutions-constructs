/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as lambda from '@aws-cdk/aws-lambda';
import * as events from '@aws-cdk/aws-events';
import { EventsRuleToLambdaProps, EventsRuleToLambda } from '../lib/index';
import '@aws-cdk/assert/jest';
import * as cdk from '@aws-cdk/core';

function deployNewFunc(stack: cdk.Stack) {
  const props: EventsRuleToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler'
    },
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };

  return new EventsRuleToLambda(stack, 'test-events-rule-lambda', props);
}

function deployNewEventBus(stack: cdk.Stack) {
  const props: EventsRuleToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler'
    },
    eventBusProps: { eventBusName: 'test' },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    }
  };
  return new EventsRuleToLambda(stack, 'test-new-eventsrule-lambda', props);
}

test('check lambda function properties for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "testeventsrulelambdatesteventsrulelambdaWLambdaFunctionServiceRoleFF9B9BDB",
        "Arn"
      ]
    },
    Runtime: "nodejs12.x",
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

  expect(stack).toHaveResource('AWS::Lambda::Permission', {
    Action: "lambda:InvokeFunction",
    FunctionName: {
      "Fn::GetAtt": [
        "testeventsrulelambdatesteventsrulelambdaWLambdaFunction5EE557E8",
        "Arn"
      ]
    },
    Principal: "events.amazonaws.com",
    SourceArn: {
      "Fn::GetAtt": [
        "testeventsrulelambdatesteventsrulelambdaWEventsRule1B328BFB",
        "Arn"
      ]
    }
  });
});

test('check lambda function role for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  expect(stack).toHaveResource('AWS::IAM::Role', {
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

  expect(stack).toHaveResource('AWS::Events::Rule', {
    ScheduleExpression: "rate(5 minutes)",
    State: "ENABLED",
    Targets: [
      {
        Arn: {
          "Fn::GetAtt": [
            "testeventsrulelambdatesteventsrulelambdaWLambdaFunction5EE557E8",
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

  const construct: EventsRuleToLambda = deployNewFunc(stack);

  expect(construct.eventsRule !== null);
  expect(construct.lambdaFunction !== null);
});

test('check exception for Missing existingObj from props', () => {
  const stack = new cdk.Stack();

  const props: EventsRuleToLambdaProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };

  try {
    new EventsRuleToLambda(stack, 'test-events-rule-lambda', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check eventbus property, snapshot & eventbus exists', () => {
  const stack = new cdk.Stack();

  const construct: EventsRuleToLambda = deployNewEventBus(stack);

  expect(construct.eventsRule !== null);
  expect(construct.lambdaFunction !== null);
  expect(construct.eventBus !== null);

  // Check whether eventbus exists
  expect(stack).toHaveResource('AWS::Events::EventBus');
});

test('check exception while passing existingEventBus & eventBusProps', () => {
  const stack = new cdk.Stack();

  const props: EventsRuleToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler'
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: { eventBusName: 'test' },
    existingEventBusInterface: new events.EventBus(stack, `test-existing-eventbus`, {  eventBusName: 'test'  })
  };

  const app = () => {
    new EventsRuleToLambda(stack, 'test-eventsrule-lambda', props);
  };
  expect(app).toThrowError();
});

test('check custom event bus resource with props when deploy:true', () => {
  const stack = new cdk.Stack();

  const props: EventsRuleToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
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
  new EventsRuleToLambda(stack, 'test-new-eventsrule-with-props-lambda', props);

  expect(stack).toHaveResource('AWS::Events::EventBus', {
    Name: `testeventbus`
  });
});