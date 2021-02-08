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
import * as iam from '@aws-cdk/aws-iam';
import * as ec2 from "@aws-cdk/aws-ec2";
import { DefaultLambdaFunctionProps } from './lambda-defaults';
import * as cdk from '@aws-cdk/core';
import { overrideProps } from './utils';

export interface BuildLambdaFunctionProps {
  /**
   * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * A VPC where the Lambda function will access internal resources
   *
   * @default - none
   */
  readonly vpc?: ec2.IVpc;
}

export function buildLambdaFunction(scope: cdk.Construct, props: BuildLambdaFunctionProps): lambda.Function {
  // Conditional lambda function creation
  if (!props.existingLambdaObj) {
    if (props.lambdaFunctionProps) {
      return deployLambdaFunction(scope, props.lambdaFunctionProps, undefined, props.vpc);
    } else {
      throw Error('Either existingLambdaObj or lambdaFunctionProps is required');
    }
  } else {
    if (props.vpc) {
      if (!props.existingLambdaObj.isBoundToVpc) {
        throw Error('A Lambda function must be bound to a VPC upon creation, it cannot be added to a VPC in a subsequent construct');
      }
    }
    return props.existingLambdaObj;
  }
}

export function deployLambdaFunction(scope: cdk.Construct,
  lambdaFunctionProps: lambda.FunctionProps,
  functionId?: string,
  vpc?: ec2.IVpc): lambda.Function {

  const _functionId = functionId ? functionId : 'LambdaFunction';
  const _functionRoleId = _functionId + 'ServiceRole';

  if (vpc && lambdaFunctionProps.vpc) {
    throw new Error(
      "Cannot provide a VPC in both the lambdaFunctionProps and the function argument"
    );
  }

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

  // If this Lambda function is going to access resoures in a
  // VPC, then it needs privileges to access an ENI in that VPC
  if (lambdaFunctionProps.vpc || vpc) {
    lambdaServiceRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface",
        "ec2:AssignPrivateIpAddresses",
        "ec2:UnassignPrivateIpAddresses"
      ],
      resources: ["*"]
    }));
  }

  // Override the DefaultFunctionProps with user provided  lambdaFunctionProps
  let finalLambdaFunctionProps: lambda.FunctionProps = overrideProps(DefaultLambdaFunctionProps(lambdaServiceRole), lambdaFunctionProps);

  if (vpc) {

    // This is literally setting up what would be the default SG, but
    // we need to to it explicitly to disable the cfn_nag error
    const lambdaSecurityGroup = new ec2.SecurityGroup(
      scope,
      "ReplaceDefaultSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
      }
    );

    const cfnSecurityGroup = lambdaSecurityGroup.node.findChild(
      "Resource"
    ) as ec2.CfnSecurityGroup;
    cfnSecurityGroup.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W5",
            reason:
              "Egress of 0.0.0.0/0 is default and generally considered OK",
          },
          {
            id: "W40",
            reason:
              "Egress IPProtocol of -1 is default and generally considered OK",
          },
        ],
      },
    };

    finalLambdaFunctionProps = overrideProps(finalLambdaFunctionProps, {
      securityGroups: [ lambdaSecurityGroup ],
      vpc,
    });
  }

  const lambdafunction = new lambda.Function(scope, _functionId, finalLambdaFunctionProps);

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
          reason: `Lambda needs the following minimum required permissions to send trace data to X-Ray and access ENIs in a VPC.`
        }]
      }
    };
  }

  return lambdafunction;
}

// A wrapper above Function.addPermision that
// prevents two different calls to addPermission using
// the same construct id.
export function addPermission(targetFunction: lambda.Function, name: string, permission: lambda.Permission): any {
  targetFunction.addPermission(GetNextId(targetFunction.permissionsNode.children, name), permission);
}

// Scan the current permissions for any entries with this core name and
// return the first available synthesized name. Names are coreName-suffix.
function GetNextId(children: cdk.IConstruct[], coreName: string): string {
  let lastSuffix: number = 0;

  children.forEach(child => {

    // if (compare right side of string)
    if (child.node.id.indexOf(coreName) === 0) {
      const components = child.node.id.split('-');
      if (components.length !== 2) {
        throw new Error("Incorrectly formatted synthesized construct ID");
      }

      const usedSuffix = Number(components[1]);
      if (usedSuffix > lastSuffix) {
        lastSuffix = usedSuffix;
      }
    }

  });

  return `${coreName}-${lastSuffix + 1}`;
}