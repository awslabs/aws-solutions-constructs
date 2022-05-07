/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Aws, App, Stack } from "@aws-cdk/core";
import { FargateToSsmstringparameter, FargateToSsmstringparameterProps } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as ecs from '@aws-cdk/aws-ecs';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});
stack.templateOptions.description = 'Integration Test with new VPC, Service and SSM String Parameter';

const image = ecs.ContainerImage.fromRegistry('nginx');

const testProps: FargateToSsmstringparameterProps = {
  publicApi: true,
  containerDefinitionProps: {
    image
  },
  stringParameterProps: {
    parameterName: "FooParameter",
    stringValue: "Foo"
  }
};

new FargateToSsmstringparameter(stack, 'test-construct', testProps);

// Synth
app.synth();
