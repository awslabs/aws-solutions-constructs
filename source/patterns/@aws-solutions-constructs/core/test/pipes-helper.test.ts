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
import { buildDynamoDBTableWithStream } from "../lib/dynamodb-table-helper";
import { Stack } from "aws-cdk-lib";
import * as defaults from '../';
import * as pipes from 'aws-cdk-lib/aws-pipes';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Match, Template } from "aws-cdk-lib/assertions";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

// =================================
// Test sources and targets generation
// =================================

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
  // Because sqsQueueParameters type include 'IResolvable |', we need to extract the property this way
  const batchSizeProp =
    (sqsSource.sourceParameters.sqsQueueParameters as pipes.CfnPipe.PipeSourceSqsQueueParametersProperty)!.batchSize;
  expect(batchSizeProp).toEqual(123);
  // best we can do here, confirm values when we instantiate the actual pipe
  expect(sqsSource.sourcePolicy.statementCount).toEqual(1);
});

test('Create a default DDB Streams Source', () => {
  // Stack
  const stack = new Stack();

  const buildTableResponse = buildDynamoDBTableWithStream(stack, {});
  const tableSource = defaults.CreateDynamoDBStreamsSource(stack, {
    table: buildTableResponse.tableObject!
  });

  expect(tableSource.sourceArn).toEqual(buildTableResponse.tableObject?.tableStreamArn);
  expect(Object.keys(tableSource.sourceParameters).length).toEqual(1);
  expect(tableSource.sourcePolicy.statementCount).toEqual(2);
  expect(tableSource.dlq).toBeDefined();
  const streamParamters = (tableSource.sourceParameters.dynamoDbStreamParameters! as pipes.CfnPipe.PipeSourceDynamoDBStreamParametersProperty);
  expect(streamParamters.deadLetterConfig).toBeDefined();
});

test('Confirm that we use custom DLQ props', () => {
  const queueName = 'something-unique-asdf';
  // Stack
  const stack = new Stack();

  const buildTableResponse = buildDynamoDBTableWithStream(stack, {});
  defaults.CreateDynamoDBStreamsSource(stack, {
    table: buildTableResponse.tableObject!,
    sqsDlqQueueProps: {
      queueName,
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: queueName
  });
});

test('Create DDB Streams Source with no DLQ', () => {
  // Stack
  const stack = new Stack();

  const buildTableResponse = buildDynamoDBTableWithStream(stack, {});
  const tableSource = defaults.CreateDynamoDBStreamsSource(stack, {
    table: buildTableResponse.tableObject!,
    deploySqsDlqQueue: false
  });

  expect(tableSource.sourceArn).toEqual(buildTableResponse.tableObject?.tableStreamArn);
  expect(Object.keys(tableSource.sourceParameters).length).toEqual(1);
  expect(tableSource.sourcePolicy.statementCount).toEqual(1);
  expect(tableSource.dlq).toBeUndefined();
  const streamParamters = (tableSource.sourceParameters.dynamoDbStreamParameters! as pipes.CfnPipe.PipeSourceDynamoDBStreamParametersProperty);
  expect(streamParamters.maximumRetryAttempts).toBeUndefined();
  expect(streamParamters.deadLetterConfig).toBeUndefined();
  expect(streamParamters.startingPosition).toBeDefined();

});

test('Create an DDB Streams Source with overrides', () => {
  const batchSizeValue = 4642;
  // Stack
  const stack = new Stack();

  const buildTableResponse = buildDynamoDBTableWithStream(stack, {});
  const tableSource = defaults.CreateDynamoDBStreamsSource(stack, {
    table: buildTableResponse.tableObject!,
    clientProps: {
      dynamoDbStreamParameters: {
        startingPosition: 'LATEST',
        batchSize: batchSizeValue
      }
    }
  });

  expect(tableSource.sourceArn).toEqual(buildTableResponse.tableObject?.tableStreamArn);
  // Because sqsQueueParameters type include 'IResolvable |', we need to extract the property this way
  const batchSizeProp =
    (tableSource.sourceParameters.dynamoDbStreamParameters as pipes.CfnPipe.PipeSourceDynamoDBStreamParametersProperty)!.batchSize;
  expect(batchSizeProp).toEqual(batchSizeValue);
  // best we can do here, confirm values when we instantiate the actual pipe
  expect(tableSource.sourcePolicy.statementCount).toEqual(2);

  const streamParamters = (tableSource.sourceParameters.dynamoDbStreamParameters! as pipes.CfnPipe.PipeSourceDynamoDBStreamParametersProperty);
  expect(streamParamters.maximumRetryAttempts).toEqual(3);
  expect(streamParamters.deadLetterConfig).toBeDefined();
  expect(streamParamters.startingPosition).toBeDefined();
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

test('Check for error when DLQ is off but max constraint set', () => {
  // Stack
  const stack = new Stack();

  const buildTableResponse = buildDynamoDBTableWithStream(stack, {});

  const app = () => {
    defaults.CreateDynamoDBStreamsSource(stack, {
      clientProps: {
        dynamoDbStreamParameters: {
          startingPosition: 'LATEST',
          maximumRecordAgeInSeconds: 100
        }
      },
      table: buildTableResponse.tableObject!,
      deploySqsDlqQueue: false
    });
  };
  // Assertion
  expect(app).toThrowError('ERROR - retry and record age constraints cannot be specified with no DLQ\n');
});

// =================================
// Test pipe creation
// =================================

test('Create a default pipe', () => {
  const prerequisiteId = 'alldefault';
  const pipeId = 'defaultpipe';

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, prerequisiteId);

  const pipeResponse = defaults.BuildPipe(stack, pipeId, {
    source: prerequisites.source,
    target: prerequisites.target,
    clientProps: {}
  });

  CheckPipeResponseProperties(pipeResponse, prerequisites);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Pipes::Pipe', 1);
  CheckPipeResource(template, pipeId, prerequisiteId);
  CheckPipeRole(template, prerequisiteId);
  CheckLogGroup(template);
});

test('Create a pipe with overrides', () => {
  const prerequisiteId = 'overridestest';
  const pipeId = 'overridespipe';
  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, prerequisiteId);

  const testDescription = 'test-description';
  const pipeResponse = defaults.BuildPipe(stack, pipeId, {
    source: prerequisites.source,
    target: prerequisites.target,
    clientProps: {
      description: testDescription
    }
  });
  CheckPipeResponseProperties(pipeResponse, prerequisites);

  const template = Template.fromStack(stack);
  CheckPipeResource(template, pipeId, prerequisiteId);
  CheckPipeRole(template, prerequisiteId);
  CheckLogGroup(template);

  // The description is unique to this test, so check it here
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Description: testDescription
  });

});

test('Create a pipe with a filter', () => {
  const prerequisiteId = 'filtertest';
  const pipeId = 'filterpipe';

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, prerequisiteId);

  const testFilterPattern = `{
    "body": {
      "state": ["open"]
    }
  }`;

  const pipeResponse = defaults.BuildPipe(stack, pipeId, {
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
  CheckPipeResponseProperties(pipeResponse, prerequisites);

  const template = Template.fromStack(stack);
  CheckPipeResource(template, pipeId, prerequisiteId);
  CheckPipeRole(template, prerequisiteId);
  CheckLogGroup(template);

  // SourceParameters is unique to this test, so check it here
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

test('Create a pipe with Lambda function enrichment', () => {
  const prerequisiteId = 'lambdaenrichtest';
  const pipeId = 'lambdaenrichpipe';

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, prerequisiteId);

  const enrichmentFunction = new lambda.Function(stack, 'enrichment-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda-test`),
    handler: "index.handler",
    runtime: lambda.Runtime.NODEJS_20_X,
  });

  const pipeResponse = defaults.BuildPipe(stack, pipeId, {
    source: prerequisites.source,
    target: prerequisites.target,
    enrichmentFunction
  });
  CheckPipeResponseProperties(pipeResponse, prerequisites);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Pipes::Pipe', 1);
  CheckPipeResource(template, pipeId, prerequisiteId);
  CheckLogGroup(template);

  // Enrichment is unique to this test so check it here
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Enrichment: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp('enrichmentfunction.*'),
        "Arn"
      ]
    },
  });
  // This checks for everything but enrichment
  CheckPipeRole(template, prerequisiteId);
  // This checks for enrichment permissions
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
    PolicyName: Match.stringLikeRegexp(`enrichmentpolicy${pipeId}.*`),
    Roles: [
      {
        Ref: Match.stringLikeRegexp(`PipeRole${pipeId}.*`)
      }
    ]
  });
});

test('Create a pipe with state machine enrichment', () => {
  const prerequisiteId = 'smenrichtest';
  const pipeId = 'smenrichpipe';

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, prerequisiteId);

  const enrichmentStateMachine = defaults.CreateTestStateMachine(stack, 'state-machine-enrichment');

  const pipeResponse = defaults.BuildPipe(stack, pipeId, {
    source: prerequisites.source,
    target: prerequisites.target,
    enrichmentStateMachine
  });
  CheckPipeResponseProperties(pipeResponse, prerequisites);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Pipes::Pipe', 1);
  CheckPipeResource(template, pipeId, prerequisiteId);
  CheckPipeRole(template, prerequisiteId);
  CheckLogGroup(template);

  // Look for additional enrichment permision
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          // This won't run if we actually launched it as the enrichmentStateMachine is not EXPRESS
          Action: "states:StartSyncExecution",
          Effect: "Allow",
          Resource: {
            Ref: Match.stringLikeRegexp('statemachineenrichment.*'),
          }
        }
      ],
      Version: "2012-10-17"
    },
    PolicyName: Match.stringLikeRegexp(`enrichmentpolicy${pipeId}.*`),
    Roles: [
      {
        Ref: Match.stringLikeRegexp(`PipeRole${pipeId}.*`)
      }
    ]
  });
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Enrichment: {
      Ref: Match.stringLikeRegexp("statemachineenrichment.*")
    },
  });
});

test('Provide replacement LogConfiguration', () => {
  const prerequisiteId = 'logconfigtest';
  const pipeId = 'logconfigpipe';

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, prerequisiteId);

  const customLogConfiguration: pipes.CfnPipe.PipeLogConfigurationProperty = {
    s3LogDestination: {
      bucketName: new s3.Bucket(stack, 'test').bucketName,
    },
    level: defaults.PipesLogLevel.ERROR
  };
  const pipeResponse = defaults.BuildPipe(stack, pipeId, {
    source: prerequisites.source,
    target: prerequisites.target,
    clientProps: {
      logConfiguration: customLogConfiguration
    }
  });
  CheckPipeResponseProperties(pipeResponse, prerequisites);

  const template = Template.fromStack(stack);
  CheckPipeSourceAndTarget(template, prerequisiteId);

  template.hasResourceProperties('AWS::Pipes::Pipe', {
    LogConfiguration: {
      Level: "ERROR",
      S3LogDestination: {
        BucketName: {
          Ref: Match.stringLikeRegexp("test.*")
        }
      }
    }
  });

  template.resourceCountIs('AWS::Pipes::Pipe', 1);
  CheckPipeRole(template, prerequisiteId);
});

test('Override the default log level', () => {
  const prerequisiteId = 'loglevelttest';
  const pipeId = 'loglevelpipe';

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, prerequisiteId);

  const pipeResponse = defaults.BuildPipe(stack, pipeId, {
    source: prerequisites.source,
    target: prerequisites.target,
    logLevel: defaults.PipesLogLevel.ERROR
  });
  CheckPipeResponseProperties(pipeResponse, prerequisites);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Pipes::Pipe', 1);
  CheckPipeResource(template, pipeId, prerequisiteId);
  CheckPipeRole(template, prerequisiteId);
  CheckLogGroup(template);

  // Level is unique to this test
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    LogConfiguration: {
      Level: defaults.PipesLogLevel.ERROR,
    }
  });
});

test('Test no logging', () => {
  const prerequisiteId = 'nologs';
  const pipeId = 'testpipe';

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, prerequisiteId);

  const pipeResponse = defaults.BuildPipe(stack, pipeId, {
    source: prerequisites.source,
    target: prerequisites.target,
    logLevel: defaults.PipesLogLevel.OFF
  });
  CheckPipeResponseProperties(pipeResponse, prerequisites);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Pipes::Pipe', 1);
  CheckPipeSourceAndTarget(template, prerequisiteId);
  CheckPipeRole(template, prerequisiteId);

  // One log group for the state machine, none for the pipe
  template.resourceCountIs("AWS::Logs::LogGroup", 1);
});

test('Override a subset of SQS source paramters', () => {
  const prerequisiteId = 'srcparamtest';
  const pipeId = 'srcparampipe';
  const testBatchSize = 7;

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, prerequisiteId);

  const pipeResponse = defaults.BuildPipe(stack, pipeId, {
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

  CheckPipeResponseProperties(pipeResponse, prerequisites);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Pipes::Pipe', 1);
  CheckPipeResource(template, pipeId, prerequisiteId);
  CheckPipeRole(template, prerequisiteId);
  CheckLogGroup(template);

  template.resourceCountIs('AWS::Pipes::Pipe', 1);
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    SourceParameters: {
      SqsQueueParameters: {
        BatchSize: testBatchSize
      }
    },
  });
});

test('Provide pipeLogProps', () => {
  const prerequisiteId = 'pipelogpropstest';
  const pipeId = 'pipelogpropspipe';
  // While this is an enum we need to use, in the template
  // it is converted to days, in this case 120
  const testRetention = RetentionDays.FOUR_MONTHS;

  // Stack
  const stack = new Stack();
  const prerequisites = CreatePrerequisites(stack, prerequisiteId);

  const pipeResponse = defaults.BuildPipe(stack, pipeId, {
    source: prerequisites.source,
    target: prerequisites.target,
    pipeLogProps: {
      retention: testRetention
    }
  });

  CheckPipeResponseProperties(pipeResponse, prerequisites);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Pipes::Pipe', 1);
  CheckPipeResource(template, pipeId, prerequisiteId);
  CheckPipeRole(template, prerequisiteId);
  CheckLogGroup(template);
  CheckPipeLogConfiguration(template, pipeId);

  // Look for additional property we passed in pipeLogProps
  template.hasResourceProperties('AWS::Logs::LogGroup', {
    RetentionInDays: 120,
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

test('Check for error when providing target in CfnProps', () => {
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

// ==============================
// Shared setup function
// ==============================

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

// ==============================
// Shared functions that check default settings
// ==============================

function CheckPipeResponseProperties(pipeResponse: defaults.BuildPipesResponse, prerequisites: Prerequisites) {
  expect(pipeResponse.pipe).toBeDefined();
  expect(pipeResponse.pipe.source).toEqual(prerequisites.source.sourceArn);
  expect(pipeResponse.pipe.target).toEqual(prerequisites.target.targetArn);
  expect(pipeResponse.pipeRole).toBeDefined();
  expect(pipeResponse.pipeRole.node).toBeDefined();
}

function CheckPipeResource(template: Template,
  pipeId: string,
  prerequisiteId: string
) {
  CheckPipeSourceAndTarget(template, prerequisiteId);
  CheckPipeLogConfiguration(template, pipeId);
}

function CheckPipeSourceAndTarget(template: Template, prerequisiteId: string) {
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    Source: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp(`${prerequisiteId}sourcequeue.*`),
        "Arn"
      ]
    },
    Target: {
      Ref: Match.stringLikeRegexp(`StateMachine${prerequisiteId}targetstatemachine.*`),
    },
  });
}

function CheckPipeLogConfiguration(template: Template, pipeId: string) {
  template.hasResourceProperties('AWS::Pipes::Pipe', {
    LogConfiguration: {
      CloudwatchLogsLogDestination: {
        LogGroupArn: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp(`LogGroup${pipeId}.*`),
            "Arn"
          ]
        }
      }
    }
  });
}

function CheckPipeRole(template: Template, prerequisiteId: string) {
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
                  Match.stringLikeRegexp(`${prerequisiteId}sourcequeue.*`),
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
                Ref: Match.stringLikeRegexp(`StateMachine${prerequisiteId}targetstatemachine.*`)
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "targetPolicy"
      }
    ]
  });
}

function CheckLogGroup(template: Template) {
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
}