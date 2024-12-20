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

// import * as pipes from 'aws-cdk-lib/aws-pipes';

export function defaultPipesProps(): any {
  return {};
}

export function defaultSqsSourceProps(): any {
  return {
  };
}

export function defaultDynamoDBStreamsSourceProps(deployDlq: boolean): any {
  return {
    dynamoDbStreamParameters: {
      startingPosition: "LATEST",
      maximumRetryAttempts: deployDlq ? 3 : undefined,
    }
  };
}

export function defaultStateMachineTargetProps(): any {
  return {
    stepFunctionStateMachineParameters: {
      invocationType: 'FIRE_AND_FORGET'
    }
  };
}
