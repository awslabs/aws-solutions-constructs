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

import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as cft from "aws-cdk-lib/aws-cloudfront";
import * as cfto from "aws-cdk-lib/aws-cloudfront-origins";
import { createKeyPolicyUpdaterCustomResource } from "../lib/key-policy-updater";
import { addCfnSuppressRules } from "../../core/lib/utils";

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for Key Policy Updater Resource';

const key = new kms.Key(stack, 'test key', {
  removalPolicy: RemovalPolicy.DESTROY,
  enableKeyRotation: true
});

const bucket = new s3.Bucket(stack, 'test bucket', {
  removalPolicy: RemovalPolicy.DESTROY,
  encryption: s3.BucketEncryption.S3_MANAGED,
});

addCfnSuppressRules(bucket, [{
  id: "W35",
  reason: "Test resource"
}, {
  id: "41",
  reason: "Test resource"
}
]);

const distribution = new cft.Distribution(stack, 'test dist', {
  defaultBehavior: {
    origin: new cfto.S3Origin(bucket),
  }
});

addCfnSuppressRules(distribution, [{
  id: "W10",
  reason: "Test resource"
}, {
  id: "W70",
  reason: "Test resource"
}
]);

createKeyPolicyUpdaterCustomResource(stack, 'Test', {
  encryptionKey: key,
  distribution
}
);

new IntegTest(stack, 'Integ', {
  testCases: [
    stack
  ]
});
