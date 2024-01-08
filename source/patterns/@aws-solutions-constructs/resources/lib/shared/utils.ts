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

import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Provider } from "aws-cdk-lib/custom-resources";
import { addCfnSuppressRules } from "@aws-solutions-constructs/core";

export const addCfnSuppressRulesForCustomResourceProvider = (provider: Provider) => {
  const providerFrameworkFunction = provider.node.children[0].node.findChild('Resource') as lambda.CfnFunction;
  addCfnSuppressRules(providerFrameworkFunction, [
    {
      id: 'W58',
      reason: `The CDK-provided lambda function that backs their Custom Resource Provider framework has an IAM role with the arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole Managed Policy attached, which grants permission to write to CloudWatch Logs`
    },
    {
      id: 'W89',
      reason: `The CDK-provided lambda function that backs their Custom Resource Provider framework does not access VPC resources`
    },
    {
      id: 'W92',
      reason: `The CDK-provided lambda function that backs their Custom Resource Provider framework does not define ReservedConcurrentExecutions`
    }
  ]);
};
