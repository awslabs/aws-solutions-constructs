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

// Imports
import { Stack } from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sagemaker from "@aws-cdk/aws-sagemaker";
import * as iam from "@aws-cdk/aws-iam";
import { LambdaToSagemaker } from '../lib';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test deployment with new Lambda function
// --------------------------------------------------------------
test('Test deployment with new Lambda function', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    new LambdaToSagemaker(stack, 'lambda-to-sagemaker-stack', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/lambda`),
            environment: {
                LAMBDA_NAME: 'deployed-function'
            }
        }
    });
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
        Environment: {
            Variables: {
                LAMBDA_NAME: 'deployed-function'
            }
        }
    });
    // Assertion 3
    expect(stack).toHaveResource("AWS::KMS::Key", {
        EnableKeyRotation: true
    });
});

// --------------------------------------------------------------
// Test deployment with override
// --------------------------------------------------------------
test('Test deployment with override', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    new LambdaToSagemaker(stack, 'lambda-to-sagemaker-stack', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        },
        deployInsideVpc: true,
        sagemakerNotebookProps: {
            subnetId: 'subnet-deadbeef',
            securityGroupIds: ['sg-deadbeef']
        }
    });
    expect(stack).toHaveResource("AWS::SageMaker::NotebookInstance", {
        DirectInternetAccess: "Disabled",
        SecurityGroupIds: [
          "sg-deadbeef"
        ],
        SubnetId: "subnet-deadbeef"
    });
});

// --------------------------------------------------------------
// Test deployment with existingNotebookObj
// --------------------------------------------------------------
test('Test deployment with existingNotebookObj', () => {
    // Stack
    const stack = new Stack();
    const sagemakerRole = new iam.Role(stack, "SagemakerRole", {
        assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
    });
    const _sagemaker = new sagemaker.CfnNotebookInstance(stack, 'MyNotebookInstance', {
        instanceType: 'ml.c4.2xlarge',
        roleArn: sagemakerRole.roleArn
    });

    const construct = new LambdaToSagemaker(stack, 'lambda-to-sagemaker-stack', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        },
        existingNotebookObj: _sagemaker
    });
    expect(stack).toHaveResource("AWS::SageMaker::NotebookInstance", {
        InstanceType: "ml.c4.2xlarge",
    });
    expect(construct.vpc).toBeUndefined();
    expect(construct.securityGroup).toBeUndefined();
});

// --------------------------------------------------------------
// Test the properties
// --------------------------------------------------------------
test('Test the properties', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    const pattern = new LambdaToSagemaker(stack, 'lambda-to-sagemaker-stack', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/lambda`)
        }
    });
    // Assertion 1
    expect(pattern.lambdaFunction !== null);
    // Assertion 2
    expect(pattern.sagemakerNotebook !== null);
    // Assertion 3
    expect(pattern.sagemakerRole !== null);
    // Assertion 4
    expect(pattern.vpc !== null);
    // Assertion 5
    expect(pattern.securityGroup !== null);
});