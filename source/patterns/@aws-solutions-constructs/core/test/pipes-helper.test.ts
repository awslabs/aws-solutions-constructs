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

import { buildQueue } from "../lib/sqs-helper";
import { buildStateMachine } from "../lib/step-function-helper";
import { Stack } from "aws-cdk-lib";
import * as defaults from '../';
import * as pipes from 'aws-cdk-lib/aws-pipes';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Match, Template } from "aws-cdk-lib/assertions";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

test('Create a default SQS Source', () => {
  // Stack
  const stack = new Stack();

  const buildQueueResponse = buildQueue(stack, 'test-queue', {});
  const sqsSource = defaults.CreateSqsSource(buildQueueResponse.queue);

  expect(sqsSource.sourceArn).toEqual(buildQueueResponse.queue.queueArn);
  expect(Object.keys(sqsSource.sourceParameters).length).toEqual(0);
  // best we can do here, confirm values when we instantiate the actual pipe
  expect(sqsSource.sourcePolicy.statementCount).toEqual(1);
  Template.fromStack(stack);
});

test('Create an SQS Source with overrides', () => {
  // Stack
  const stack = new Stack();

  const buildQueueResponse = buildQueue(stack, 'test-queue', {});
  const sqsSource = defaults.CreateSqsSource(buildQueueResponse.queue, {
    sqsQueueParameters: {
      batchSize: 123,
    },
  });

  expect(sqsSource.sourceArn).toEqual(buildQueueResponse.queue.queueArn);
  // Because sqsQueueParameters type include 'IDurable |', we need to extract the property this way
  const batchSizeProp =
    (sqsSource.sourceParameters.sqsQueueParameters as pipes.CfnPipe.PipeSourceSqsQueueParametersProperty)!.batchSize;
  expect(batchSizeProp).toEqual(123);
  // best we can do here, confirm values when we instantiate the actual pipe
  expect(sqsSource.sourcePolicy.statementCount).toEqual(1);
});

test('Create a default Step Functions Target', () => {

  // Stack
  const stack = new Stack();

  const buildStateMachineResponse = buildStateMachine(stack, 'test-state-machine', {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'stub-state-machine')
    }
  });
  const stateMachineTarget = defaults.CreateStateMachineTarget(buildStateMachineResponse.stateMachine);

  expect(stateMachineTarget.targetArn).toEqual(buildStateMachineResponse.stateMachine.stateMachineArn);
  expect(stateMachineTarget.targetParameters.stepFunctionStateMachineParameters).toBeDefined();
  const invocationType: string | undefined =
    (stateMachineTarget.targetParameters.stepFunctionStateMachineParameters as pipes.CfnPipe.PipeTargetStateMachineParametersProperty).invocationType;
  expect(invocationType).toEqual('FIRE_AND_FORGET');
  expect(Object.keys(stateMachineTarget.targetParameters).length).toEqual(1);
  // best we can do here, confirm values when we instantiate the actual pipe
  expect(stateMachineTarget.targetPolicy.statementCount).toEqual(1);
  Template.fromStack(stack);

});

test('Create a Step Functions Target with overrides', () => {

  // Stack
  const stack = new Stack();

  const buildStateMachineResponse = buildStateMachine(stack, 'test-state-machine', {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'stub-state-machine')
    }
  });
  const stateMachineTarget = defaults.CreateStateMachineTarget(buildStateMachineResponse.stateMachine, {
    stepFunctionStateMachineParameters: {
      invocationType: 'REQUEST_RESPONSE'
    }
  });

  expect(stateMachineTarget.targetArn).toEqual(buildStateMachineResponse.stateMachine.stateMachineArn);
  expect(stateMachineTarget.targetParameters.stepFunctionStateMachineParameters).toBeDefined();
  const invocationType: string | undefined =
    (stateMachineTarget.targetParameters.stepFunctionStateMachineParameters as pipes.CfnPipe.PipeTargetStateMachineParametersProperty).invocationType;
  expect(invocationType).toEqual('REQUEST_RESPONSE');
  expect(Object.keys(stateMachineTarget.targetParameters).length).toEqual(1);
  // best we can do here, confirm values when we instantiate the actual pipe
  expect(stateMachineTarget.targetPolicy.statementCount).toEqual(1);
});

test('Create a default pipe', () => {

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'default-test');

  const pipeResponse = defaults.BuildPipe(stack, 'test-pipe', {
    source: prerequisites.source,
    target: prerequisites.target,
    clientProps: {}
  });

  expect(pipeResponse.pipe).toBeDefined();
  expect(pipeResponse.pipe.source).toEqual(prerequisites.source.sourceArn);
  expect(pipeResponse.pipe.target).toEqual(prerequisites.target.targetArn);
  expect(pipeResponse.pipeRole).toBeDefined();
  expect(pipeResponse.pipeRole.node).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::Pipes::Pipe', 1);
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
                  Match.stringLikeRegexp("defaulttestsourcequeue.*"),
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
                Ref: Match.stringLikeRegexp("StateMachinedefaulttesttargetstatemachine.*")
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "targetPolicy"
      }
    ]
  });
  template.hasResourceProperties('AWS::Logs::LogGroup', {
    LogGroupName: {
      "Fn::Join": [
        "",
        [
          Match.stringLikeRegexp('\/aws\/vendedlogs\/pipes\/constructs'),
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
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Source: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp('defaulttestsourcequeue.*'),
        "Arn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp('StateMachinedefaulttesttargetstatemachine.*'),
    },
    LogConfiguration: {
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp('LogGrouptestpipe.*'),
            "Arn"
          ]
        }
      }
    }
  });
});

test('Create a pipe with overrides', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'overrides-test');

  const testDescription = 'test-description';
  const pipeResponse = defaults.BuildPipe(stack, 'test-pipe', {
    source: prerequisites.source,
    target: prerequisites.target,
    clientProps: {
      description: testDescription
    }
  });
  expect(pipeResponse.pipe).toBeDefined();
  expect(pipeResponse.pipe.source).toEqual(prerequisites.source.sourceArn);
  expect(pipeResponse.pipe.target).toEqual(prerequisites.target.targetArn);
  expect(pipeResponse.pipeRole).toBeDefined();
  expect(pipeResponse.pipeRole.node).toBeDefined();

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Source: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp('overridestestsourcequeue.*'),
        "Arn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp('StateMachineoverridestesttargetstatemachine.*'),
    },
    LogConfiguration: {
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp('LogGrouptestpipe.*'),
            "Arn"
          ]
        }
      }
    },
    Description: testDescription
  });

});

test('Create a pipe with a filter', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'filter-test');

  const testFilterPattern = `{
    "body": {
      "state": ["open"]
    }
  }`;

  const pipeResponse = defaults.BuildPipe(stack, 'test-pipe', {
    source: prerequisites.source,
    target: prerequisites.target,
    clientProps: {
      sourceParameters: {
        filterCriteria: {
          filters: [{ pattern: testFilterPattern }],
        },
      }
    },
  });
  expect(pipeResponse.pipe).toBeDefined();
  expect(pipeResponse.pipe.source).toEqual(prerequisites.source.sourceArn);
  expect(pipeResponse.pipe.target).toEqual(prerequisites.target.targetArn);
  expect(pipeResponse.pipeRole).toBeDefined();
  expect(pipeResponse.pipeRole.node).toBeDefined();

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Source: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp('filtertestsourcequeue.*'),
        "Arn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp('StateMachinefiltertesttargetstatemachine.*'),
    },
    LogConfiguration: {
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp('LogGrouptestpipe.*'),
            "Arn"
          ]
        }
      }
    },
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

test('Create a pipe with Lambda function enrichment', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'enrichment-test');

  const enrichmentFunction = new lambda.Function(stack, 'enrichment-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda-test`),
    handler: "index.handler",
    runtime: lambda.Runtime.NODEJS_20_X,
  });

  defaults.BuildPipe(stack, 'test-pipe', {
    source: prerequisites.source,
    target: prerequisites.target,
    enrichmentFunction
  });
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::Pipes::Pipe', 1);
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
                  Match.stringLikeRegexp('enrichmenttestsourcequeue.*'),
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
                Ref: Match.stringLikeRegexp('StateMachineenrichmenttesttargetstatemachine.*')
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "targetPolicy"
      }
    ]
  });
  template.hasResourceProperties('AWS::Logs::LogGroup', {
    LogGroupName: {
      "Fn::Join": [
        "",
        [
          Match.stringLikeRegexp('\/aws\/vendedlogs\/pipes\/constructs'),
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
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Enrichment: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp('enrichmentfunction.*'),
        "Arn"
      ]
    },
    Source: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp('enrichmenttestsourcequeue.*'),
        "Arn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp('StateMachineenrichmenttesttargetstatemachine.*'),
    },
    LogConfiguration: {
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp('LogGrouptestpipe.*'),
            "Arn"
          ]
        }
      }
    }
  });
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
    PolicyName: Match.stringLikeRegexp('enrichmentpolicytestpipe.*'),
    Roles: [
      {
        Ref: Match.stringLikeRegexp('PipeRoletestpipeF634866B.*')
      }
    ]
  });
});

test('Create a pipe with state machine enrichment', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'enrichment-test');

  const enrichmentStateMachine = new sfn.StateMachine(stack, 'state-machine-enrichment', {
    definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'pipes-test')
  });

  defaults.BuildPipe(stack, 'test-pipe', {
    source: prerequisites.source,
    target: prerequisites.target,
    enrichmentStateMachine
  });
  const template = Template.fromStack(stack);
  defaults.printWarning(`\n\n==dbg==\n${JSON.stringify(template)}\n\n==dbg===\n\n`);

  template.resourceCountIs('AWS::Pipes::Pipe', 1);
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
                  Match.stringLikeRegexp('enrichmenttestsourcequeue.*'),
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
                Ref: Match.stringLikeRegexp('StateMachineenrichmenttesttargetstatemachine.*')
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "targetPolicy"
      }
    ]
  });
  template.hasResourceProperties('AWS::Logs::LogGroup', {
    LogGroupName: {
      "Fn::Join": [
        "",
        [
          Match.stringLikeRegexp('\/aws\/vendedlogs\/pipes\/constructs'),
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
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Enrichment: {
      Ref: Match.stringLikeRegexp("statemachineenrichment.*")
    },
    Source: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp('enrichmenttestsourcequeue.*'),
        "Arn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp('StateMachineenrichmenttesttargetstatemachine.*'),
    },
    LogConfiguration: {
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp('LogGrouptestpipe.*'),
            "Arn"
          ]
        }
      }
    }
  });
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: "states:StartExecution",
          Effect: "Allow",
          Resource: {
            Ref: Match.stringLikeRegexp('statemachineenrichment.*'),
          }
        }
      ],
      Version: "2012-10-17"
    },
    PolicyName: Match.stringLikeRegexp('enrichmentpolicytestpipe.*'),
    Roles: [
      {
        Ref: Match.stringLikeRegexp('PipeRoletestpipeF634866B.*')
      }
    ]
  });
});

test('Provide replacement LogConfiguration', () => {

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'default-test');

  const customLogConfiguration: pipes.CfnPipe.PipeLogConfigurationProperty = {
    s3LogDestination: {
      bucketName: new s3.Bucket(stack, 'test').bucketName,
    },
    level: defaults.PipesLogLevel.ERROR
  };
  const pipeResponse = defaults.BuildPipe(stack, 'test-pipe', {
    source: prerequisites.source,
    target: prerequisites.target,
    clientProps: {
      logConfiguration: customLogConfiguration
    }
  });
  expect(pipeResponse.pipe).toBeDefined();
  expect(pipeResponse.pipe.source).toEqual(prerequisites.source.sourceArn);
  expect(pipeResponse.pipe.target).toEqual(prerequisites.target.targetArn);
  expect(pipeResponse.pipeRole).toBeDefined();
  expect(pipeResponse.pipeRole.node).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::Pipes::Pipe', 1);
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
                  Match.stringLikeRegexp("defaulttestsourcequeue.*"),
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
                Ref: Match.stringLikeRegexp("StateMachinedefaulttesttargetstatemachine.*")
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
        Match.stringLikeRegexp('defaulttestsourcequeue.*'),
        "Arn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp('StateMachinedefaulttesttargetstatemachine.*'),
    },
    LogConfiguration: {
      Level: "ERROR",
      S3LogDestination: {
        BucketName: {
          Ref: Match.stringLikeRegexp("test.*")
        }
      }
    }
  });
});

test('Override the default log level', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'log-level-test');

  defaults.BuildPipe(stack, 'test-pipe', {
    source: prerequisites.source,
    target: prerequisites.target,
    logLevel: defaults.PipesLogLevel.ERROR
  });
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::Pipes::Pipe', 1);
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
                  Match.stringLikeRegexp("logleveltestsourcequeue.*"),
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
                Ref: Match.stringLikeRegexp("StateMachinelogleveltesttargetstatemachine.*")
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "targetPolicy"
      }
    ]
  });
  template.hasResourceProperties('AWS::Logs::LogGroup', {
    LogGroupName: {
      "Fn::Join": [
        "",
        [
          Match.stringLikeRegexp('\/aws\/vendedlogs\/pipes\/constructs'),
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
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Source: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp('logleveltestsourcequeue.*'),
        "Arn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp('StateMachinelogleveltesttargetstatemachine.*'),
    },
    LogConfiguration: {
      Level: defaults.PipesLogLevel.ERROR,
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp('LogGrouptestpipe.*'),
            "Arn"
          ]
        }
      }
    }
  });
});

test('Check for error when providing source in CfnProps', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'log-level-test');

  const app = () => {
    defaults.BuildPipe(stack, 'test-pipe', {
      source: prerequisites.source,
      target: prerequisites.target,
      clientProps: {
        source: prerequisites.source.sourceArn
      }
    });
  };
  // Assertion
  expect(app).toThrowError('ERROR - BuildPipeProps cannot specify source, target, roleArn, or enrichment');
});

interface Prerequisites {
  source: defaults.CreateSourceResponse,
  target: defaults.CreateTargetResponse,
}

function CreatePrerequisites(scope: Stack, id: string): Prerequisites {
  const buildQueueResponse = buildQueue(scope, `${id}-source-queue`, {});
  const sqsSource = defaults.CreateSqsSource(buildQueueResponse.queue);

  const buildStateMachineResponse = buildStateMachine(scope, `${id}-target-state-machine`, {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(scope, `${id}-steps`)
    }
  });
  const stateMachineTarget = defaults.CreateStateMachineTarget(buildStateMachineResponse.stateMachine, {
    stepFunctionStateMachineParameters: {
      invocationType: 'REQUEST_RESPONSE'
    }
  });
  return {
    source: sqsSource,
    target: stateMachineTarget
  };
}

test('Test no logging', () => {

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'no-logs');

  defaults.BuildPipe(stack, 'test-pipe', {
    source: prerequisites.source,
    target: prerequisites.target,
    logLevel: defaults.PipesLogLevel.OFF
  });
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::Pipes::Pipe', 1);

  // One log group for the state machine, none for the pipe
  template.resourceCountIs('AWS::Logs::LogGroup', 1);
});

test('Override a subset of SQS source paramters', () => {
  const testBatchSize = 7;

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'default-test');

  const pipeResponse = defaults.BuildPipe(stack, 'test-pipe', {
    source: prerequisites.source,
    target: prerequisites.target,
    clientProps: {
      sourceParameters: {
        sqsQueueParameters: {
          batchSize: testBatchSize,
        }
      }
    }
  });

  expect(pipeResponse.pipe).toBeDefined();
  expect(pipeResponse.pipe.source).toEqual(prerequisites.source.sourceArn);
  expect(pipeResponse.pipe.target).toEqual(prerequisites.target.targetArn);
  expect(pipeResponse.pipeRole).toBeDefined();
  expect(pipeResponse.pipeRole.node).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::Pipes::Pipe', 1);
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Source: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp('defaulttestsourcequeue.*'),
        "Arn"
      ]
    },
    SourceParameters: {
      SqsQueueParameters: {
        BatchSize: testBatchSize
      }
    },
    Target: {
      Ref: Match.stringLikeRegexp('StateMachinedefaulttesttargetstatemachine.*'),
    },
    LogConfiguration: {
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp('LogGrouptestpipe.*'),
            "Arn"
          ]
        }
      }
    }
  });
});

test('Provide pipeLogProps', () => {
  // While this is an enum we need to use, in the template
  // it is converted to days, in this case 120
  const testRetention = RetentionDays.FOUR_MONTHS;

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'default-test');

  const pipeResponse = defaults.BuildPipe(stack, 'test-pipe', {
    source: prerequisites.source,
    target: prerequisites.target,
    pipeLogProps: {
      retention: testRetention
    }
  });

  expect(pipeResponse.pipe).toBeDefined();
  expect(pipeResponse.pipe.source).toEqual(prerequisites.source.sourceArn);
  expect(pipeResponse.pipe.target).toEqual(prerequisites.target.targetArn);
  expect(pipeResponse.pipeRole).toBeDefined();
  expect(pipeResponse.pipeRole.node).toBeDefined();

  const template = Template.fromStack(stack);
  defaults.printWarning(`\n\n==dbg==\n${JSON.stringify(template)}\n\n==dbg===\n\n`);

  template.resourceCountIs('AWS::Pipes::Pipe', 1);
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Source: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp('defaulttestsourcequeue.*'),
        "Arn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp('StateMachinedefaulttesttargetstatemachine.*'),
    },
    LogConfiguration: {
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp('LogGrouptestpipe.*'),
            "Arn"
          ]
        }
      }
    }
  });
  template.hasResourceProperties('AWS::Logs::LogGroup', {
    RetentionInDays: 120,
    LogGroupName: {
      "Fn::Join": [
        "",
        [
          Match.stringLikeRegexp('\/aws\/vendedlogs\/pipes\/constructs'),
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

test('Check for error when providing destination in CfnProps', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'log-level-test');

  const app = () => {
    defaults.BuildPipe(stack, 'test-pipe', {
      source: prerequisites.source,
      target: prerequisites.target,
      clientProps: {
        target: prerequisites.target.targetArn,
      }
    });
  };
  // Assertion
  expect(app).toThrowError('ERROR - BuildPipeProps cannot specify source, target, roleArn, or enrichment');
});

test('Check for error when providing a roleArn', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'log-level-test');

  const app = () => {
    defaults.BuildPipe(stack, 'test-pipe', {
      source: prerequisites.source,
      target: prerequisites.target,
      clientProps: {
        roleArn: "some-arn",
      }
    });
  };
  // Assertion
  expect(app).toThrowError('ERROR - BuildPipeProps cannot specify source, target, roleArn, or enrichment');
});

test('Check for error when providing enrichment', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'log-level-test');

  const app = () => {
    defaults.BuildPipe(stack, 'test-pipe', {
      source: prerequisites.source,
      target: prerequisites.target,
      clientProps: {
        enrichment: "functionArn",
      }
    });
  };
  // Assertion
  expect(app).toThrowError('ERROR - BuildPipeProps cannot specify source, target, roleArn, or enrichment');
});

test('Check for error when log level and log configuration are both provided', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'log-level-test');

  const app = () => {
    defaults.BuildPipe(stack, 'test-pipe', {
      source: prerequisites.source,
      target: prerequisites.target,
      logLevel: defaults.PipesLogLevel.ERROR,
      clientProps: {
        logConfiguration: { some: "object" },
      }
    });
  };
  // Assertion
  expect(app).toThrowError('ERROR - BuildPipeProps cannot specify logLevel and logConfiguration');
});

test('Check for error when pipeLogProps and log configuration are both provided', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'log-level-test');

  const app = () => {
    defaults.BuildPipe(stack, 'test-pipe', {
      source: prerequisites.source,
      target: prerequisites.target,
      pipeLogProps: { logGroupName: "anyvalue" },
      clientProps: {
        logConfiguration: { some: "object" },
      }
    });
  };
  // Assertion
  expect(app).toThrowError('ERROR - BuildPipeProps cannot specify pipeLogProps and logConfiguration');
});

test('Check for error when enrichmentFunction and enrichmentStateMachine are both provided', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'log-level-test');

  const app = () => {
    defaults.BuildPipe(stack, 'test-pipe', {
      source: prerequisites.source,
      target: prerequisites.target,
      enrichmentFunction: { place: "holder" } as unknown as lambda.Function,
      enrichmentStateMachine: { place: "holder" } as unknown as sfn.StateMachine
    });
  };
  // Assertion
  expect(app).toThrowError('ERROR - Only one of enrichmentFunction or enrichmentStateMachine can be provided');
});

test('Check for error when pipeLogProps and log level is set to OFF', () => {
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, 'log-level-test');

  const app = () => {
    defaults.BuildPipe(stack, 'test-pipe', {
      source: prerequisites.source,
      target: prerequisites.target,
      logLevel: defaults.PipesLogLevel.OFF,
      pipeLogProps: { logGroupName: "anyvalue" },
    });
  };
  // Assertion
  expect(app).toThrowError('ERROR - BuildPipeProps cannot specify pipeLogProps and log level OFF');
});

test('Test all of CheckPipesProps', () => {
  const app = () => {
    defaults.CheckPipesProps({
      pipesProps: { source: "value" },
    });
  };
  // Assertion
  expect(app).toThrowError('Do not set source in pipesProps. It is set by the construct.\n');

  const appTwo = () => {
    defaults.CheckPipesProps({
      pipesProps: { target: "value" },
    });
  };
  // Assertion
  expect(appTwo).toThrowError('Do not set target in pipesProps. It is set by the construct.\n');

});
