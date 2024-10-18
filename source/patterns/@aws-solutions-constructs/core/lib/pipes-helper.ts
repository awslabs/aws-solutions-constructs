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

import * as pipes from 'aws-cdk-lib/aws-pipes';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as defaults from "..";
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export enum PipesLogLevel {
  OFF = "OFF",
  TRACE = "TRACE",
  INFO = "INFO",
  ERROR = "ERROR",
}

export interface CreateSourceResponse {
  readonly sourceParameters: pipes.CfnPipe.PipeSourceParametersProperty,
  readonly sourceArn: string,
  readonly sourcePolicy: iam.PolicyDocument
}

export interface BuildPipesProps {
  readonly source: CreateSourceResponse,
  readonly target: CreateTargetResponse,
  readonly enrichmentFunction?: lambda.Function,
  readonly enrichmentStateMachine?: sfn.StateMachine,
  readonly clientProps?: any | pipes.CfnPipeProps
  readonly logLevel?: string,
  readonly pipeLogProps?: logs.LogGroupProps
}

interface BuildPipesResponse {
  readonly pipe: pipes.CfnPipe,
  readonly pipeRole: iam.Role
}

export function BuildPipe(scope: Construct, id: string, props: BuildPipesProps): BuildPipesResponse {
  CheckBuildPipeProps(props);

  const pipeRole = new iam.Role(scope, `PipeRole--${id}`, {
    assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com'),
    inlinePolicies: {
      sourcePolicy: props.source.sourcePolicy,
      targetPolicy: props.target.targetPolicy,
    },
  });

  // At this point we have the minimum values for CfnPipeProps - let's
  // create it and fold in any additional values as we go along
  let constructProps: pipes.CfnPipeProps = {
    roleArn: pipeRole.roleArn,
    source: props.source.sourceArn,
    target: props.target.targetArn,
    sourceParameters: props.source.sourceParameters,
    targetParameters: props.target.targetParameters,
  };

  // Do we have any enrichment functionality?
  if (props.enrichmentFunction) {
    const enrichmentSettings = createLambdaEnrichment(scope, id, props.enrichmentFunction);
    pipeRole.attachInlinePolicy(enrichmentSettings.pipeRolePolicy);
    constructProps = defaults.consolidateProps(constructProps, { enrichment: enrichmentSettings.enrichmentArn });
  } else if (props.enrichmentStateMachine) {
    const enrichmentSettings = createStateMachineEnrichment(scope, id, props.enrichmentStateMachine);
    pipeRole.attachInlinePolicy(enrichmentSettings.pipeRolePolicy);
    constructProps = defaults.consolidateProps(constructProps, { enrichment: enrichmentSettings.enrichmentArn });
  }

  // Are we responsible to create the logging mechanism?
  if (!props.clientProps?.logConfiguration) {

    const logLevel = defaults.CheckStringWithDefault(props.logLevel, PipesLogLevel.INFO);
    if (logLevel !== PipesLogLevel.OFF) {

      const defaultLogGroupProps = {
        logGroupName: createPipesLogGroupName(scope, id),
      };
      const consolidatedGroupProps = defaults.consolidateProps(defaultLogGroupProps, props.pipeLogProps);
      const newLogGroup = new logs.LogGroup(scope, `LogGroup-${id}`, consolidatedGroupProps);
      const logConfiguration = {
        cloudwatchLogsLogDestination: {
          logGroupArn: newLogGroup.logGroupArn
        },
        level: logLevel
      };

      constructProps = defaults.consolidateProps(constructProps, {
        logConfiguration,
      });
    }
  }

  const consolidateProps = defaults.consolidateProps(defaults.defaultPipesProps(), props.clientProps, constructProps);

  const newPipe = new pipes.CfnPipe(scope, `pipe-${id}`, consolidateProps);

  return {
    pipe: newPipe,
    pipeRole
  };
}

interface CreateEnrichmentResponse {
  readonly enrichmentArn: string,
  readonly pipeRolePolicy: iam.Policy
}

function createLambdaEnrichment(scope: Construct, id: string, lambdaFunction: lambda.Function): CreateEnrichmentResponse {
  return {
    enrichmentArn: lambdaFunction.functionArn,
    pipeRolePolicy: new iam.Policy(scope, `enrichmentpolicy${id}`, {
      statements: [
        new iam.PolicyStatement({
          resources: [lambdaFunction.functionArn],
          actions: ['lambda:InvokeFunction'],
          effect: iam.Effect.ALLOW,
        })
      ]
    })
  };
}

function createStateMachineEnrichment(scope: Construct, id: string, stateMachine: sfn.StateMachine): CreateEnrichmentResponse {
  return {
    enrichmentArn: stateMachine.stateMachineArn,
    pipeRolePolicy: new iam.Policy(scope, `enrichmentpolicy${id}`, {
      statements: [
        new iam.PolicyStatement({
          resources: [stateMachine.stateMachineArn],
          actions: ['states:StartExecution'],
          effect: iam.Effect.ALLOW,
        })
      ]
    })
  };
}

function createPipesLogGroupName(scope: Construct, id: string): string {
  const logGroupPrefix = '/aws/vendedlogs/pipes/constructs/';
  const nameParts: string[] = [
    cdk.Stack.of(scope).stackName,
    id,
    'PipesLog'
  ];
  return defaults.generatePhysicalLogGroupName(logGroupPrefix, nameParts);
}

// ==========================
// Source and Target code - as new sources and targets are required, implement them
// here and test the new functions.

export function CreateSqsSource(queue: sqs.IQueue, clientProps?: pipes.CfnPipe.PipeSourceParametersProperty): CreateSourceResponse {
  const sourceParameters: pipes.CfnPipe.PipeSourceParametersProperty = defaults.consolidateProps(defaults.defaultSqsSourceProps(), clientProps);
  return {
    sourceParameters,
    sourceArn: queue.queueArn,
    sourcePolicy: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: [queue.queueArn!],
          actions: [
            "sqs:ReceiveMessage",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes",
          ],
          effect: iam.Effect.ALLOW,
        })
      ]
    })
  };
}

export interface CreateTargetResponse {
  readonly targetParameters: pipes.CfnPipe.PipeTargetParametersProperty,
  readonly targetArn: string,
  readonly targetPolicy: iam.PolicyDocument
}

export function CreateStateMachineTarget(stateMachine: sfn.IStateMachine,
  clientProps?: pipes.CfnPipe.PipeTargetParametersProperty): CreateTargetResponse {

  const targetParameters: pipes.CfnPipe.PipeTargetParametersProperty =
    defaults.consolidateProps(defaults.defaultStateMachineTargetProps(), clientProps);
  return {
    targetParameters,
    targetArn: stateMachine.stateMachineArn,
    targetPolicy: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: [stateMachine.stateMachineArn],
          actions: ['states:StartExecution'],
          effect: iam.Effect.ALLOW,
        }),
      ],
    })
  };
}

// This is called by BuildPipe to validate arguments sent to BuildPipe
function CheckBuildPipeProps(props: BuildPipesProps) {
  if (props.enrichmentFunction && props.enrichmentStateMachine) {
    throw new Error("ERROR - Only one of enrichmentFunction or enrichmentStateMachine can be provided");
  }

  if (props.clientProps && (props.clientProps.source || props.clientProps.target || props.clientProps.roleArn || props.clientProps.enrichment)) {
    throw new Error("ERROR - BuildPipeProps cannot specify source, target, roleArn, or enrichment");
  }

  if (props.logLevel && props.clientProps?.logConfiguration) {
    throw new Error('ERROR - BuildPipeProps cannot specify logLevel and logConfiguration');
  }
  if (props.pipeLogProps && props.clientProps?.logConfiguration) {
    throw new Error('ERROR - BuildPipeProps cannot specify pipeLogProps and logConfiguration');
  }
  if (props.pipeLogProps && (props.logLevel === PipesLogLevel.OFF)) {
    throw new Error('ERROR - BuildPipeProps cannot specify pipeLogProps and log level OFF');
  }
}

export interface PipesProps {
  readonly pipesProps?: pipes.CfnPipeProps
}

// This is called by constructs to validate inputs to the construct
export function CheckPipesProps(propsObject: PipesProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.pipesProps?.source) {
    errorMessages += 'Do not set source in pipesProps. It is set by the construct.\n';
    errorFound = true;
  }

  if (propsObject.pipesProps?.target) {
    errorMessages += 'Do not set target in pipesProps. It is set by the construct.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
