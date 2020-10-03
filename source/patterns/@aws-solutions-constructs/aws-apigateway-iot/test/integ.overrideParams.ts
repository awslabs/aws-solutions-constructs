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

// Imports
import * as cdk from "@aws-cdk/core";
import { ApiGatewayToIot, ApiGatewayToIotProps } from "../lib";
import * as api from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';

// App setup
const app = new cdk.App();
const stack = new cdk.Stack(app, 'test-apigateway-iot-overriden-params');
stack.templateOptions.description = 'Integration Test for aws-apigateway-iot with overriden params';

const apiGatewayProps = {
    restApiName: 'RestApi-Regional',
    description: 'Description for the Regional Rest Api',
    endpointConfiguration: {types: [api.EndpointType.REGIONAL]},
    apiKeySourceType: api.ApiKeySourceType.HEADER,
    defaultMethodOptions: {
      authorizationType: api.AuthorizationType.NONE,
    }
};

const policyJSON = {
    Version: "2012-10-17",
    Statement: [
        {
            Action: [
                "iot:UpdateThingShadow"
            ],
            Resource: `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:thing/*`,
            Effect: "Allow"
        },
        {
            Action: [
                "iot:Publish"
            ],
            Resource: `arn:aws:iot:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:topic/*`,
            Effect: "Allow"
        }
    ]
};
const policyDocument: iam.PolicyDocument = iam.PolicyDocument.fromJson(policyJSON);
const iamRoleProps: iam.RoleProps = {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    path: '/',
    inlinePolicies: {testPolicy: policyDocument}
};

// Create a policy that overrides the default policy that gets created with the construct
const apiGatewayExecutionRole: iam.Role = new iam.Role(stack, 'apigateway-iot-role', iamRoleProps);

// Api gateway setup
const props: ApiGatewayToIotProps = {
    iotEndpoint: 'a1234567890123-ats', // `a1234567890123-ats`,
    apiGatewayCreateApiKey: true,
    apiGatewayExecutionRole,
    apiGatewayProps
};

// Instantiate construct
new ApiGatewayToIot(stack, 'test-apigateway-iot', props);

// Synth
app.synth();
