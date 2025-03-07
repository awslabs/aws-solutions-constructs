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
import { DynamoDBStreamsToPipesToStepfunctions, DynamoDBStreamsToPipesToStepfunctionsProps } from "../lib";
import * as defaults from '@aws-solutions-constructs/core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from "aws-cdk-lib/aws-logs";

test('Test default behaviors', () => {
  // Initial Setup
  const stack = new Stack();
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    }
  };
  const construct = new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-ddbs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();
  expect(construct.stateMachine).toBeDefined();
  expect(construct.stateMachineLogGroup).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
  expect(construct.dynamoTable).toBeDefined();
  expect(construct.dlq).toBeDefined();

  template.resourceCountIs('AWS::SQS::Queue', 1);
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
                "dynamodb:DescribeStream",
                "dynamodb:GetRecords",
                "dynamodb:GetShardIterator",
                "dynamodb:ListStreams"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::GetAtt": [
                  Match.stringLikeRegexp(`testddbspipesstatesDynamoTable.*`),
                  "StreamArn"
                ]
              }
            },
            {
              Action: "sqs:SendMessage",
              Effect: "Allow",
              Resource: {
                "Fn::GetAtt": [
                  Match.stringLikeRegexp(`testddbspipesstatesdlq.*`),
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
                Ref: Match.stringLikeRegexp(`testddbspipesstatesStateMachine.*`)
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
        Match.stringLikeRegexp(`testddbspipesstatesDynamoTable.*`),
        "StreamArn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp(`testddbspipesstatesStateMachine.*`),
    },
    SourceParameters: {
      DynamoDBStreamParameters: {
        DeadLetterConfig: {
          Arn: {
            "Fn::GetAtt": [
              Match.stringLikeRegexp(`testddbspipesstatesdlq.*`),
              "Arn"
            ]
          }
        }
      }
    },
  });

  template.hasResourceProperties('AWS::Pipes::Pipe', {
    LogConfiguration: {
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp(`testddbspipesstatesLogGrouptestddbspipesstates.*`),
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

test('Test no DLQ', () => {
  // Initial Setup
  const stack = new Stack();
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    deploySqsDlqQueue: false
  };
  const construct = new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-ddbs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();
  expect(construct.stateMachine).toBeDefined();
  expect(construct.stateMachineLogGroup).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
  expect(construct.dynamoTable).toBeDefined();
  expect(construct.dlq).toBeUndefined();

  template.resourceCountIs('AWS::SQS::Queue', 0);
});

test('Test existing state machine', () => {
  // Initial Setup
  const stack = new Stack();
  const stateMachine = defaults.CreateTestStateMachine(stack, 'state-machine');
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    existingStateMachineObj: stateMachine
  };
  const construct = new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-dbs-pipes-states', props);
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
                "dynamodb:DescribeStream",
                "dynamodb:GetRecords",
                "dynamodb:GetShardIterator",
                "dynamodb:ListStreams"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::GetAtt": [
                  Match.stringLikeRegexp(`testdbspipesstatesDynamoTable.*`),
                  "StreamArn"
                ]
              }
            },
            {
              Action: "sqs:SendMessage",
              Effect: "Allow",
              Resource: {
                "Fn::GetAtt": [
                  Match.stringLikeRegexp(`testdbspipesstatesdlq.*`),
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
        Match.stringLikeRegexp(`testdbspipesstatesDynamoTable11606343.*`),
        "StreamArn"
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
            Match.stringLikeRegexp(`testdbspipesstatesLogGrouptestdbspipesstates.*`),
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

test('Test table and state machine aspects of construct', () => {
  // Initial Setup
  const stack = new Stack();
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    }
  };
  const construct = new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-dbs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.dynamoTable).toBeDefined();
  template.resourceCountIs("AWS::DynamoDB::Table", 1);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    StreamSpecification: {
      StreamViewType: "NEW_AND_OLD_IMAGES"
    }
  });

  const stateMachine = construct.stateMachine;
  expect(stateMachine).toBeDefined();
  const cwAlarm = construct.cloudwatchAlarms;
  expect(cwAlarm).toBeDefined();
  expect(construct.stateMachineLogGroup).toBeDefined();
});

test('Test existing table', () => {
  const stack = new Stack();
  const existingTable: dynamodb.ITable = new dynamodb.Table(stack, 'table', {
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING
    },
    stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
  });

  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    },
    existingTableInterface: existingTable
  };
  const construct = new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-dbs-pipes-states', props);
  expect(construct.dynamoTableInterface.tableArn).toEqual(existingTable.tableArn);
});

test('Test filter', () => {
  // Stack
  const stack = new Stack();
  const testFilterPattern = `{
    "body": {
      "state": ["open"]
    }
  }`;
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
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
  new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-ddbs-pipes-states', props);
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
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
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
  new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-ddbs-pipes-states', props);
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
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    enrichmentStateMachine,
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    }
  };
  const construct = new DynamoDBStreamsToPipesToStepfunctions(stack, 'test', props);

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
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'index.handler',
    code: lambda.Code.fromInline(`exports.handler = async (event) => {return;}`)
  });

  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    enrichmentFunction
  };
  const construct = new DynamoDBStreamsToPipesToStepfunctions(stack, 'enrichment-function-test', props);
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
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    logLevel: defaults.PipesLogLevel.TRACE
  };
  const construct = new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-dbs-pipes-states', props);
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
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    logLevel: defaults.PipesLogLevel.OFF
  };
  const construct = new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-dbs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();

  // Should be no LogConfiguration
  template.resourcePropertiesCountIs('AWS::Pipes::Pipe', { LogConfiguration: {} }, 0);

  // One log group for the state machine, none for the pipe
  template.resourceCountIs('AWS::Logs::LogGroup', 1);
});

test('Test custom pipe log props', () => {
  const testRetention = RetentionDays.FOUR_MONTHS;
  const stack = new Stack();
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    pipeLogProps: {
      retention: testRetention
    }
  };
  const construct = new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-dbs-pipes-states', props);
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
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    pipeProps: {
      sourceParameters: {
        dynamoDbStreamParameters: {
          batchSize: testBatchSize
        }
      }
    }
  };
  const construct = new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-dbs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.pipe).toBeDefined();
  expect(construct.pipeRole).toBeDefined();
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    SourceParameters: {
      DynamoDBStreamParameters: {
        BatchSize: testBatchSize,
      }
    }
  });
});

test('Test sending state machine props and existing state machine is an error', () => {
  // These are all tested in CheckStateMachineProps, so this is just checking that CheckStateMachineProps is called.

  // Stack
  const stack = new Stack();
  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
    },
    existingStateMachineObj: { pretend: "I'm A State Machine :-)" } as unknown as sfn.StateMachine,
  };

  const app = () => {
    new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-dbs-pipes-states', props);
  };
  // Assertion
  expect(app).toThrowError('ERROR - If existingStateMachine is provided, no other state machine props are allowed\n');
});

test('Test sending existing table and table props is an error', () => {
  const stack = new Stack();
  const existingTable: dynamodb.ITable = new dynamodb.Table(stack, 'table', {
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING
    },
    stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
  });

  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    },
    existingTableInterface: existingTable,
    dynamoTableProps: {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      }
    }
  };
  const app = () => {
    new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-dbs-pipes-states', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide existingTableInterface or dynamoTableProps, but not both.\n');
});

test('Test sending max retry or age restraints with no DLQ is an error', () => {
  const stack = new Stack();

  const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    },
    deploySqsDlqQueue: false,
    pipeProps: {
      sourceParameters: {
        dynamoDbStreamParameters: {
          startingPosition: 'LATEST',
          maximumRetryAttempts: 2,
        }
      }
    }
  };
  const app = () => {
    new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-dbs-pipes-states', props);
  };
  // Assertion
  expect(app).toThrowError('ERROR - Cannot define maximumRecordAgeInSeconds and maximumRetryAttempts when deploySqsDlqQueue is false\n');
});
