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

// Imports
import { App, Stack, RemovalPolicy } from "@aws-cdk/core";
import { CloudFrontToS3, CloudFrontToS3Props } from "../lib";

// Setup
const app = new App();
const stack = new Stack(app, 'test-cloudfront-s3-no-security-headers');
stack.templateOptions.description = 'Integration Test for aws-cloudfront-s3';

// Definitions
const props: CloudFrontToS3Props = {
  insertHttpSecurityHeaders: false,
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  }
};

new CloudFrontToS3(stack, 'test-cloudfront-s3-no-security-headers', props);

// Synth
app.synth();
