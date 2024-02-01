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

import { App, Stack } from "aws-cdk-lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as path from 'path';
import { TemplateValue, createTemplateWriterCustomResource } from "../lib/template-writer";

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for Template Writer Resource';

const templateAsset = new Asset(stack, 'TemplateAsset', {
  path: path.join(__dirname, 'template/sample-template')
});

const templateValues: TemplateValue[] = new Array(
  {
    id: 'placeholder',
    value: 'resolved_value'
  }
);

createTemplateWriterCustomResource(stack, 'Test', {
  templateBucket: templateAsset.bucket,
  templateKey: templateAsset.s3ObjectKey,
  templateValues
});

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
