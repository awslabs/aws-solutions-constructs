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
import * as defaults from '@aws-solutions-constructs/core';
import { createTemplateWriterCustomResource } from "../lib/template-writer";
import * as s3deployment from "aws-cdk-lib/aws-s3-deployment";

const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for Tempalte Writer Resource';

const templateBucket = defaults.CreateScrapBucket(stack);

new s3deployment.BucketDeployment(stack, 'TemplateFile', {
  sources: [ s3deployment.Source.asset('./template') ],
  destinationBucket: templateBucket
});

const templateValues = [
  {
    id: 'placeholder',
    value: 'resolved_value'
  }
];

createTemplateWriterCustomResource(stack, 'TemplateWriter', templateBucket.bucketName, 'sample-template', templateValues);

app.synth();
