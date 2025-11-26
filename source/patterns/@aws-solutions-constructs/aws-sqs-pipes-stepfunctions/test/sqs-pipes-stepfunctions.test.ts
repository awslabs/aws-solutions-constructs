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
import { SqsToPipesToStepfunctions, SqsToPipesToStepfunctionsProps } from "../lib";
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as defaults from '@aws-solutions-constructs/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from "aws-cdk-lib/aws-logs";

test('Test default behaviors', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    }
  };
  const construct = new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();

  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "pipes.amazonaws.com"
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
                "sqs:ReceiveMessage",
                "sqs:DeleteMessage",
                "sqs:GetQueueAttributes"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::GetAtt": [
                  Match.stringLikeRegexp(`testsqspipesstatesqueue.*`),
                  "Arn"
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "sourcePolicy"
      },
      {
        PolicyDocument: {
          Statement: [
            {
              Action: "states:StartExecution",
              Effect: "Allow",
              Resource: {
                Ref: Match.stringLikeRegexp(`testsqspipesstatesStateMachine.*`)
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "targetPolicy"
      }
    ]
  });
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Source: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp(`testsqspipesstatesqueue.*`),
        "Arn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp(`testsqspipesstatesStateMachine.*`),
    },
  });

  template.hasResourceProperties('AWS::Pipes::Pipe', {
    LogConfiguration: {
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp(`testsqspipesstatesLogGrouptestsqspipesstates.*`),
            "Arn"
          ]
        }
      },
      Level: "INFO"
    }
  });
  template.hasResourceProperties('AWS::Logs::LogGroup', {
    LogGroupName: {
      "Fn::Join": [
        "",
        [
          Match.stringLikeRegexp('/aws/vendedlogs/pipes/constructs'),
          {
            "Fn::Select": [
              2,
              Match.anyValue()
            ]
          }
        ]
      ]
    },
  });

});

test('Test existing state machine', () => {
  // Initial Setup
  const stack = new Stack();
  const stateMachine = defaults.CreateTestStateMachine(stack, 'state-machine');
  const props: SqsToPipesToStepfunctionsProps = {
    existingStateMachineObj: stateMachine
  };
  const construct = new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();

  template.resourceCountIs("AWS::StepFunctions::StateMachine", 1);

  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "pipes.amazonaws.com"
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
                "sqs:ReceiveMessage",
                "sqs:DeleteMessage",
                "sqs:GetQueueAttributes"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::GetAtt": [
                  Match.stringLikeRegexp(`testsqspipesstatesqueue.*`),
                  "Arn"
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "sourcePolicy"
      },
      {
        PolicyDocument: {
          Statement: [
            {
              Action: "states:StartExecution",
              Effect: "Allow",
              Resource: {
                Ref: Match.stringLikeRegexp(`statemachine.*`)
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "targetPolicy"
      }
    ]
  });
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Source: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp(`testsqspipesstatesqueue.*`),
        "Arn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp(`statemachine.*`),
    },
  });

  template.hasResourceProperties('AWS::Pipes::Pipe', {
    LogConfiguration: {
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp(`testsqspipesstatesLogGrouptestsqspipesstates.*`),
            "Arn"
          ]
        }
      },
      Level: "INFO"
    }
  });
  template.hasResourceProperties('AWS::Logs::LogGroup', {
    LogGroupName: {
      "Fn::Join": [
        "",
        [
          Match.stringLikeRegexp('/aws/vendedlogs/pipes/constructs'),
          {
            "Fn::Select": [
              2,
              Match.anyValue()
            ]
          }
        ]
      ]
    },
  });

});

test('Test queue and state machine aspects of construct', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    }
  };
  const construct = new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.sqsQueue).toBeDefined();
  expect(construct.deadLetterQueue).toBeDefined();
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.hasResourceProperties('AWS::SQS::Queue', {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  const stateMachine = construct.stateMachine;
  expect(stateMachine).toBeDefined();
  const cwAlarm = construct.cloudwatchAlarms;
  expect(cwAlarm).toBeDefined();
  expect(construct.stateMachineLogGroup).toBeDefined();
});

test('Test existing queue', () => {
  const stack = new Stack();
  const existingQueue = new sqs.Queue(stack, 'existing-queue', {});

  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    },
    existingQueueObj: existingQueue,
  };
  const construct = new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  expect(construct.sqsQueue.queueArn).toEqual(existingQueue.queueArn);
});

test('Test filter', () => {
  // Stack
  const stack = new Stack();
  const testFilterPattern = `{
    "body": {
      "state": ["open"]
    }
  }`;
  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    },
    pipeProps: {
      sourceParameters: {
        filterCriteria: {
          filters: [{ pattern: testFilterPattern }],
        },
      }
    }
  };
  new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    SourceParameters: {
      FilterCriteria: {
        Filters: [
          {
            Pattern: testFilterPattern
          }
        ]
      }
    }
  });

});

test('Test target parameters?', () => {
  const testMessageGroupId = "test-id";
  // Stack
  const stack = new Stack();
  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    },
    pipeProps: {
      // We realize that this would not launch because the target is not
      // a queue, but it tests the functionality
      targetParameters: {
        sqsQueueParameters: {
          messageGroupId: testMessageGroupId,
        }
      }
    }
  };
  new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Pipes::Pipe', {
    TargetParameters: {
      SqsQueueParameters: {
        MessageGroupId: testMessageGroupId,
      }
    }
  });
});

test('test state machine enrichment', () => {
  const stack = new Stack();
  const enrichmentStateMachine = defaults.CreateTestStateMachine(stack, 'enrichment-state-machine');
  const props: SqsToPipesToStepfunctionsProps = {
    enrichmentStateMachine,
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    }
  };
  const construct = new SqsToPipesToStepfunctions(stack, 'test', props);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();

  const template = Template.fromStack(stack);

  // Look for additional enrichment permision
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: "states:StartSyncExecution",
          Effect: "Allow",
          Resource: {
            Ref: Match.stringLikeRegexp('enrichmentstatemachine.*'),
          }
        }
      ],
      Version: "2012-10-17"
    },
    PolicyName: Match.stringLikeRegexp(`testenrichmentpolicytest.*`),
    Roles: [
      {
        Ref: Match.stringLikeRegexp(`testPipeRoletest.*`)
      }
    ]
  });
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Enrichment: {
      Ref: Match.stringLikeRegexp("enrichmentstatemachine.*")
    },
  });
});

test('Test lambda function enrichment', () => {
  const stack = new Stack();
  const enrichmentFunction = new lambda.Function(stack, 'enrichment-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromInline(`exports.handler = async (event) => {return;}`)
  });

  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    enrichmentFunction
  };
  const construct = new SqsToPipesToStepfunctions(stack, 'enrichment-function-test', props);
  const template = Template.fromStack(stack);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: "lambda:InvokeFunction",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              Match.stringLikeRegexp('enrichmentfunction.*'),
              "Arn"
            ]
          }
        }
      ],
      Version: "2012-10-17"
    },
    PolicyName: Match.stringLikeRegexp(`enrichmentfunctiontestenrichmentpolicyenrichmentfunctiontest.*`),
    Roles: [
      {
        Ref: Match.stringLikeRegexp(`enrichmentfunctiontestPipeRoleenrichmentfunctiontest.*`)
      }
    ]
  });
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Enrichment: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp("enrichmentfunction.*"),
        "Arn"
      ]
    },
  });
});

test('Test custom log level', () => {
  const stack = new Stack();
  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    logLevel: defaults.PipesLogLevel.TRACE
  };
  const construct = new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();

  template.hasResourceProperties('AWS::Pipes::Pipe', {
    LogConfiguration: {
      Level: "TRACE",
    }
  });
});

test('Test log level OFF', () => {
  const stack = new Stack();
  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    logLevel: defaults.PipesLogLevel.OFF
  };
  const construct = new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();

  // Should be no LogConfiguration
  template.resourcePropertiesCountIs('AWS::Pipes::Pipe', { LogConfiguration: {}}, 0);

  // One log group for the state machine, none for the pipe
  template.resourceCountIs('AWS::Logs::LogGroup', 1);
});

test('Test custom pipe log props', () => {
  const testRetention = RetentionDays.FOUR_MONTHS;
  const stack = new Stack();
  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    pipeLogProps: {
      retention: testRetention
    }
  };
  const construct = new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();
  template.hasResourceProperties('AWS::Logs::LogGroup', {
    RetentionInDays: 120,
  });
});

test('Test setting source parameters like batchSize', () => {
  const testBatchSize = 123;
  const stack = new Stack();
  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    pipeProps: {
      sourceParameters: {
        sqsQueueParameters: {
          batchSize: testBatchSize,
        },
      }
    }
  };
  const construct = new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    SourceParameters: {
      SqsQueueParameters: {
        BatchSize: testBatchSize,
      }
    }
  });
});

test('Test sending state machine props and existing state machine is an error', () => {
  // These are all tested in CheckStateMachineProps, so this is just checking that CheckStateMachineProps is called.

  // Stack
  const stack = new Stack();
  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    existingStateMachineObj: { pretend: "I'm A State Machine :-)"} as unknown as sfn.StateMachine,
  };

  const app = () => {
    new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  };
  // Assertion
  expect(app).toThrowError('ERROR - If existingStateMachine is provided, no other state machine props are allowed\n');
});
