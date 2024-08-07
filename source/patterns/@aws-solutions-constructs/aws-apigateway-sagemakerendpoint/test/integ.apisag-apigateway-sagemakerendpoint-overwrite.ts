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

// Imports
import { App, Stack, Aws } from 'aws-cdk-lib';
import { ApiGatewayToSageMakerEndpoint, ApiGatewayToSageMakerEndpointProps } from '../lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { addCfnGuardSuppressRules, generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-apigateway-sagemakerendpoint';

const existingRole = new iam.Role(stack, 'api-gateway-role', {
  assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
  description: 'existing role for SageMaker integration',
  inlinePolicies: {
    InvokePolicy: new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        resources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:endpoint/my-endpoint`],
        actions: ['sagemaker:InvokeEndpoint']
      })]
    })
  }
});
addCfnGuardSuppressRules(existingRole, ["IAM_NO_INLINE_POLICY_CHECK"]);

// Definitions
const requestTemplate =
`{
    "instances": [
#set( $user_id = $input.params("user_id") )
#set( $items = $input.params("items") )
#foreach( $item in $items.split(",") )
    {"in0": [$user_id], "in1": [$item]}#if( $foreach.hasNext ),#end
    $esc.newline
#end
    ]
}`;

const responseTemplate =
`{
    "ratings": [
#set( $predictions = $input.path("$.predictions") )
#foreach( $item in $predictions )
    $item.scores[0]#if( $foreach.hasNext ),#end
    $esc.newline
#end
    ]
}`;

const props: ApiGatewayToSageMakerEndpointProps = {
  endpointName: 'my-endpoint',
  resourcePath: '{user_id}',
  resourceName: 'predicted-ratings',
  requestMappingTemplate: requestTemplate,
  responseMappingTemplate: responseTemplate,
  apiGatewayExecutionRole: existingRole
};

new ApiGatewayToSageMakerEndpoint(stack, 'test-apigateway-sagemakerendpoint-overwrite', props);

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
