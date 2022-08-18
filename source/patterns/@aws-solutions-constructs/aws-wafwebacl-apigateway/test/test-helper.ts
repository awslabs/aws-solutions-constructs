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

import { Stack } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as api from "aws-cdk-lib/aws-apigateway";
import { addCfnSuppressRules } from "@aws-solutions-constructs/core";

export function CreateTestApi(stack: Stack, id: string): api.LambdaRestApi {
  const lamdaFunction = new lambda.Function(stack, `${id}Function`, {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: ".handler",
  });
  addCfnSuppressRules(lamdaFunction, [{ id: "W58", reason: "Test Resource" }]);
  addCfnSuppressRules(lamdaFunction, [{ id: "W89", reason: "Test Resource" }]);
  addCfnSuppressRules(lamdaFunction, [{ id: "W92", reason: "Test Resource" }]);

  const restApi = new api.LambdaRestApi(stack, `${id}Api`, {
    handler: lamdaFunction,
  });

  const newDeployment = restApi.latestDeployment;
  if (newDeployment) {
    addCfnSuppressRules(newDeployment, [
      { id: "W68", reason: "Test Resource" },
    ]);
  }

  const newMethod = restApi.methods[0];
  addCfnSuppressRules(newMethod, [{ id: "W59", reason: "Test Resource" }]);
  const newMethodTwo = restApi.methods[1];
  addCfnSuppressRules(newMethodTwo, [{ id: "W59", reason: "Test Resource" }]);

  const newStage = restApi.deploymentStage;
  addCfnSuppressRules(newStage, [{ id: "W64", reason: "Test Resource" }]);
  addCfnSuppressRules(newStage, [{ id: "W69", reason: "Test Resource" }]);

  return restApi;
}
