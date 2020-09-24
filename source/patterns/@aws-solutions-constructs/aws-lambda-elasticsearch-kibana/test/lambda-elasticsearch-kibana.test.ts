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

import { SynthUtils } from '@aws-cdk/assert';
import { LambdaToElasticSearchAndKibana, LambdaToElasticSearchAndKibanaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from "@aws-cdk/core";
import '@aws-cdk/assert/jest';

function deployNewFunc(stack: cdk.Stack) {
  const props: LambdaToElasticSearchAndKibanaProps = {
    lambdaFunctionProps: {
          code: lambda.Code.fromAsset(`${__dirname}/lambda`),
          runtime: lambda.Runtime.NODEJS_10_X,
          handler: 'index.handler'
    },
    domainName: 'test-domain'
  };

  return new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-stack', props);
}

test('snapshot test default params', () => {
  const stack = new cdk.Stack();
  deployNewFunc(stack);

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check domain names', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  expect(stack).toHaveResource('AWS::Cognito::UserPoolDomain', {
    Domain: "test-domain",
    UserPoolId: {
      Ref: "testlambdaelasticsearchstackCognitoUserPool05D1387E"
    }
  });

  expect(stack).toHaveResource('AWS::Elasticsearch::Domain', {
    DomainName: "test-domain",
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: LambdaToElasticSearchAndKibana = deployNewFunc(stack);

  expect(construct.lambdaFunction !== null);
  expect(construct.elasticsearchDomain !== null);
  expect(construct.identityPool !== null);
  expect(construct.userPool !== null);
  expect(construct.userPoolClient !== null);
  expect(construct.cloudwatchAlarms !== null);
  expect(construct.elasticsearchRole !== null);
});

test('check exception for Missing existingObj from props for deploy = false', () => {
  const stack = new cdk.Stack();

  const props: LambdaToElasticSearchAndKibanaProps = {
    domainName: 'test-domain'
  };

  try {
    new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-stack', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});