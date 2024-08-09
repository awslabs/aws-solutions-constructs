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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { DefaultLambdaFunctionProps } from './lambda-defaults';
import * as cdk from 'aws-cdk-lib';
import { overrideProps, addCfnSuppressRules } from './utils';
import { buildSecurityGroup } from "./security-group-helper";
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct, IConstruct } from 'constructs';
import * as defaults from '../index';
export interface BuildLambdaFunctionProps {
  /**
   * Existing instance of Lambda Function object, Providing both this and lambdaFunctionProps will cause an error.
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

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildLambdaFunction(scope: Construct, props: BuildLambdaFunctionProps, constructId?: string): lambda.Function {
  // Conditional lambda function creation
  if (!props.existingLambdaObj) {
    if (props.lambdaFunctionProps) {
      // constructId may be specified by the calling code, but if not, fallback to the original behavior of using the
      // function name as the construct id used when creating the underlying lambda function and iam role.
      constructId = constructId ?? props.lambdaFunctionProps.functionName;
      return deployLambdaFunction(scope, props.lambdaFunctionProps, constructId, props.vpc);
    } else {
      throw Error('Either existingLambdaObj or lambdaFunctionProps is required');
    }
  } else {
    if (props.vpc) {
      const levelOneFunction: lambda.CfnFunction = props.existingLambdaObj.node.defaultChild as lambda.CfnFunction;
      if (props.lambdaFunctionProps?.securityGroups) {
        let ctr = 20;
        props.lambdaFunctionProps?.securityGroups.forEach(sg => {
          // It appears we can't get R/O access to VpcConfigSecurityGroupIds, such access would make this cleaner
          levelOneFunction.addOverride(`Properties.VpcConfig.SecurityGroupIds.${ctr++}`, sg.securityGroupId);
        });
      }
      if (!props.existingLambdaObj.isBoundToVpc) {
        throw Error('A Lambda function must be bound to a VPC upon creation, it cannot be added to a VPC in a subsequent construct');
      }
    }
    return props.existingLambdaObj;
  }
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function deployLambdaFunction(scope: Construct,
  lambdaFunctionProps: lambda.FunctionProps,
  constructId?: string,
  vpc?: ec2.IVpc): lambda.Function {

  const functionId = constructId ?? 'LambdaFunction';
  const functionRoleId = functionId + 'ServiceRole';

  if (vpc && lambdaFunctionProps.vpc) {
    throw new Error(
      "Cannot provide a VPC in both the lambdaFunctionProps and the function argument"
    );
  }

  // Setup the IAM Role for Lambda Service
  const lambdaServiceRole = new iam.Role(scope, functionRoleId, {
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

  // If this Lambda function is going to access resources in a
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

  defaults.addCfnGuardSuppressRules(lambdaServiceRole, ["IAM_NO_INLINE_POLICY_CHECK"]);

  // Override the DefaultFunctionProps with user provided  lambdaFunctionProps
  let finalLambdaFunctionProps: lambda.FunctionProps = overrideProps(DefaultLambdaFunctionProps(lambdaServiceRole), lambdaFunctionProps);

  if (vpc) {

    // This is literally setting up what would be the default SG, but
    // we need to to it explicitly to disable the cfn_nag error
    const lambdaSecurityGroup = buildSecurityGroup(
      scope,
      "ReplaceDefaultSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
      },
      [],
      []
    );

    finalLambdaFunctionProps = overrideProps(finalLambdaFunctionProps, {
      securityGroups: [lambdaSecurityGroup],
      vpc,
    }, true);
  }

  const lambdafunction = new lambda.Function(scope, functionId, finalLambdaFunctionProps);

  if (lambdaFunctionProps.runtime === defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME) {
    lambdafunction.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1', { removeInEdge: true });
  }

  const cfnLambdafunction: lambda.CfnFunction = lambdafunction.node.findChild('Resource') as lambda.CfnFunction;

  addCfnSuppressRules(lambdafunction, [
    {
      id: 'W58',
      reason: `Lambda functions has the required permission to write CloudWatch Logs. It uses custom policy instead of arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole with tighter permissions.`
    },
    {
      id: 'W89',
      reason: `This is not a rule for the general case, just for specific use cases/industries`
    },
    {
      id: 'W92',
      reason: `Impossible for us to define the correct concurrency for clients`
    }
  ]);

  if (cfnLambdafunction.tracingConfig) {
    // Find the X-Ray IAM Policy
    const cfnLambdafunctionDefPolicy = lambdafunction.role?.node.tryFindChild('DefaultPolicy')?.node.findChild('Resource') as iam.CfnPolicy;

    if (cfnLambdafunctionDefPolicy) {
      // Add the CFN NAG suppress to allow for "Resource": "*" for AWS X-Ray
      addCfnSuppressRules(cfnLambdafunctionDefPolicy, [
        {
          id: 'W12',
          reason: `Lambda needs the following minimum required permissions to send trace data to X-Ray and access ENIs in a VPC.`
        }
      ]);
    }
  }

  return lambdafunction;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * A wrapper above Function.addPermission that
 * prevents two different calls to addPermission using
 * the same construct id.
 */
export function addPermission(targetFunction: lambda.Function, name: string, permission: lambda.Permission): any {
  targetFunction.addPermission(GetNextId(targetFunction.permissionsNode.children, name), permission);
}

// Scan the current permissions for any entries with this core name and
// return the first available synthesized name. Names are coreName-suffix.
function GetNextId(children: IConstruct[], coreName: string): string {
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

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function getLambdaVpcSecurityGroupIds(lambdaFunction: lambda.Function): string[] {
  const securityGroupIds: string[] = [];

  lambdaFunction.connections.securityGroups.forEach(element => securityGroupIds.push(element.securityGroupId));

  return securityGroupIds;
}

export interface LambdaProps {
  readonly existingLambdaObj?: lambda.Function,
  readonly lambdaFunctionProps?: lambda.FunctionProps,
}

export function CheckLambdaProps(propsObject: LambdaProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.existingLambdaObj && propsObject.lambdaFunctionProps) {
    errorMessages += 'Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
