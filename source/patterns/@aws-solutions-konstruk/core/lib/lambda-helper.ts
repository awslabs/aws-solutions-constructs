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

import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import { DefaultLambdaFunctionProps, DefaultLambdaFunctionPropsForNodeJS } from './lambda-defaults';
import * as cdk from '@aws-cdk/core';
import { overrideProps } from './utils';

export interface BuildLambdaFunctionProps {
  /**
   * Whether to create a new Lambda function or use an existing Lambda function.
   * If set to false, you must provide a lambda function object as `existingLambdaObj`
   *
   * @default - true
   */
  readonly deployLambda: boolean,
  /**
   * Existing instance of Lambda Function object.
   * If `deploy` is set to false only then this property is required
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * Optional user provided props to override the default props for the Lambda function.
   * If `deploy` is set to true only then this property is required
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps
}

export function buildLambdaFunction(scope: cdk.Construct, props: BuildLambdaFunctionProps): lambda.Function {
  // Conditional lambda function creation
  // If deployLambda == false
  if (props.hasOwnProperty('deployLambda') && props.deployLambda === false) {
    if (props.existingLambdaObj) {
      return props.existingLambdaObj;
    } else {
      throw Error('Missing existingObj from props for deployLambda = false');
    }
    // If deployLambda == true
  } else {
    if (props.lambdaFunctionProps) {
      return deployLambdaFunction(scope, props.lambdaFunctionProps);
    } else {
      throw Error('Missing lambdaFunctionProps from props for deployLambda = true');
    }
  }
}

export function deployLambdaFunction(scope: cdk.Construct, lambdaFunctionProps: lambda.FunctionProps): lambda.Function {
  // Setup the IAM Role for Lambda Service
  const lambdaServiceRole = new iam.Role(scope, 'LambdaFunctionServiceRole', {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    inlinePolicies: {
      LambdaFunctionServiceRolePolicy: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: [`arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/*`]
        })]
      })
    }
  });

  // Override the DefaultFunctionProps with user provided  lambdaFunctionProps
  let _lambdaFunctionProps = overrideProps(DefaultLambdaFunctionProps(lambdaServiceRole), lambdaFunctionProps);

  if (lambdaFunctionProps.runtime === lambda.Runtime.NODEJS_10_X ||
    lambdaFunctionProps.runtime === lambda.Runtime.NODEJS_12_X) {
      _lambdaFunctionProps = overrideProps(DefaultLambdaFunctionPropsForNodeJS(lambdaServiceRole), lambdaFunctionProps);
  }

  const lambdafunction = new lambda.Function(scope, 'LambdaFunction', _lambdaFunctionProps);

  const cfnLambdafunction = lambdafunction.node.findChild('Resource') as lambda.CfnFunction;

  cfnLambdafunction.cfnOptions.metadata = {
    cfn_nag: {
        rules_to_suppress: [{
            id: 'W58',
            reason: `Lambda functions has the required permission to write CloudWatch Logs. It uses custom policy instead of arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole with more tighter permissions.`
        }]
    }
  };

  return lambdafunction;
}
