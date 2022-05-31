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

import { App } from 'aws-cdk-lib';
import { ServerlessBackendStack } from '../lib/serverless-backend-stack';
import { Template } from 'aws-cdk-lib/assertions';

test('default stack', () => {
  const app = new App();
  const stack = new ServerlessBackendStack(app, 'ServerlessBackendStack');
  const template = Template.fromStack(stack);

  expect(template).toMatchSnapshot();
});

test('check Api Method CORS setting for HTTP OPTIONS method', () => {
  const app = new App();
  const stack = new ServerlessBackendStack(app, 'ServerlessBackendStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "OPTIONS",
    AuthorizationType: "NONE",
    MethodResponses: [
      {
        ResponseParameters: {
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Methods": true
        },
        StatusCode: "204"
      }
    ]
  });
});

test('check lambda permissions', () => {
  const app = new App();
  const stack = new ServerlessBackendStack(app, 'ServerlessBackendStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Lambda::Permission", {
    Action: "lambda:InvokeFunction",
    Principal: "apigateway.amazonaws.com",
    SourceArn: {
      "Fn::Join": [
        "",
        [
          "arn:",
          {
            Ref: "AWS::Partition"
          },
          ":execute-api:",
          {
            Ref: "AWS::Region"
          },
          ":",
          {
            Ref: "AWS::AccountId"
          },
          ":",
          {
            Ref: "CognitoToApiGatewayToLambdaLambdaRestApi31103AF0"
          },
          "/",
          {
            Ref: "CognitoToApiGatewayToLambdaLambdaRestApiDeploymentStageprod743A20E1"
          },
          "/*/"
        ]
      ]
    }
  });
});