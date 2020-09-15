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

/// !cdk-integ *
import { App, Stack } from "@aws-cdk/core";
import { LambdaToSagemaker, LambdaToSagemakerProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
const app = new App();

// No encryption key
const stack = new Stack(app, 'test-lambda-sagemaker-stack');

const props: LambdaToSagemakerProps = {
    lambdaFunctionProps: {
        code: lambda.Code.asset(`${__dirname}/lambda`),
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler'
    },
    enableEncryption: false,
};

new LambdaToSagemaker(stack, 'test-lambda-sagemaker-stack', props);
app.synth();