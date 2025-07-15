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

import { App, Duration, Stack } from "aws-cdk-lib";
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as path from 'path';
import { TemplateValue, createTemplateWriterCustomResource } from "../lib/template-writer";

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for Template Writer Resource';

const templateAsset = new Asset(stack, 'TemplateAsset', {
  path: path.join(__dirname, 'template/large-sample-template')
});

// this test will do a total of 5,760 substitutions across a 9.4MB text file
// Last integration test run used 286MB of memory with a function duration of 1.5 seconds

const templateValues: TemplateValue[] = new Array(
  {
    id: 'Lorem', // 768 occurrences in large-sample-template
    value: 'LOREM_2'
  },
  {
    id: 'Velit', // 640 occurrences in large-sample-template
    value: 'VELIT_2'
  },
  {
    id: 'Ornare', // 1024 occurrences in large-sample-template
    value: 'ORNARE_2'
  },
  {
    id: 'Ullamcorper', // 1152 occurrences in large-sample-template
    value: 'ULLAMCORPER_2'
  },
  {
    id: 'Blandit', // 896 occurrences in large-sample-template
    value: 'BLANDIT_2'
  },
  {
    id: 'Bibendum', // 1280 occurrences in large-sample-template
    value: 'BIBENDUM_2'
  }
);

createTemplateWriterCustomResource(stack, 'Test', {
  templateBucket: templateAsset.bucket,
  templateKey: templateAsset.s3ObjectKey,
  templateValues,
  timeout: Duration.minutes(1),
  memorySize: 1024
});

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
