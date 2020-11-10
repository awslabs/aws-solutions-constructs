/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { DefaultLambdaFunctionProps } from './lambda-defaults';
import * as cdk from '@aws-cdk/core';
import { overrideProps } from './utils';

export interface BuildLambdaFunctionProps {
  /**
   * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps
}

export function buildLambdaFunction(scope: cdk.Construct, props: BuildLambdaFunctionProps): lambda.Function {
  // Conditional lambda function creation
  if (!props.existingLambdaObj) {
    if (props.lambdaFunctionProps) {
      return deployLambdaFunction(scope, props.lambdaFunctionProps);
    } else {
      throw Error('Either existingLambdaObj or lambdaFunctionProps is required');
    }
  } else {
    return props.existingLambdaObj;
  }
}

export function deployLambdaFunction(scope: cdk.Construct,
                                     lambdaFunctionProps: lambda.FunctionProps,
                                     functionId?: string): lambda.Function {

  const _functionId = functionId ? functionId : 'LambdaFunction';
  const _functionRoleId = _functionId + 'ServiceRole';

  // Setup the IAM Role for Lambda Service
  const lambdaServiceRole = new iam.Role(scope, _functionRoleId, {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    inlinePolicies: {
      LambdaFunctionServiceRolePolicy: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/*`]
        })]
      })
    }
  });

  // Override the DefaultFunctionProps with user provided  lambdaFunctionProps
  const _lambdaFunctionProps = overrideProps(DefaultLambdaFunctionProps(lambdaServiceRole), lambdaFunctionProps);

  const lambdafunction = new lambda.Function(scope, _functionId, _lambdaFunctionProps);

  if (lambdaFunctionProps.runtime === lambda.Runtime.NODEJS_10_X ||
    lambdaFunctionProps.runtime === lambda.Runtime.NODEJS_12_X) {
      lambdafunction.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1', { removeInEdge: true });
  }

  const cfnLambdafunction: lambda.CfnFunction = lambdafunction.node.findChild('Resource') as lambda.CfnFunction;

  cfnLambdafunction.cfnOptions.metadata = {
    cfn_nag: {
        rules_to_suppress: [{
            id: 'W58',
            reason: `Lambda functions has the required permission to write CloudWatch Logs. It uses custom policy instead of arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole with more tighter permissions.`
        }]
    }
  };

  if (cfnLambdafunction.tracingConfig) {
    // Find the X-Ray IAM Policy
    const cfnLambdafunctionDefPolicy = lambdafunction.role?.node.tryFindChild('DefaultPolicy')?.node.findChild('Resource') as iam.CfnPolicy;

    // Add the CFN NAG suppress to allow for "Resource": "*" for AWS X-Ray
    cfnLambdafunctionDefPolicy.cfnOptions.metadata = {
      cfn_nag: {
          rules_to_suppress: [{
              id: 'W12',
              reason: `Lambda needs the following minimum required permissions to send trace data to X-Ray.`
          }]
      }
    };
  }

  return lambdafunction;
}
