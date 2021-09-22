/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

/// !cdk-integ *
import { App, Stack } from "@aws-cdk/core";
import { WafwebaclToCloudFront } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const cloudfrontToS3One = new CloudFrontToS3(stack, 'cloudfront-one', {});
const cloudfrontToS3Two = new CloudFrontToS3(stack, 'cloudfront-two', {});

const ownsWaf = new WafwebaclToCloudFront(stack, 'first-construct', {
  existingCloudFrontWebDistribution: cloudfrontToS3One.cloudFrontWebDistribution,
});

new WafwebaclToCloudFront(stack, 'second-construct', {
  existingCloudFrontWebDistribution: cloudfrontToS3Two.cloudFrontWebDistribution,
  existingWebaclObj: ownsWaf.webacl
});

app.synth();