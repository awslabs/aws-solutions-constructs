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

// Imports
import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { CloudFrontToS3 } from "../lib";
import { generateIntegStackName, suppressCustomHandlerCfnNagWarnings, SetConsistentFeatureFlags  } from '@aws-solutions-constructs/core';
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-cloudfront-s3';
SetConsistentFeatureFlags(stack);

// custom cloudfront function
const cloudfrontFunction = new cloudfront.Function(stack, "MyFunction", {
  code: cloudfront.FunctionCode.fromInline("function handler(event) { var response = event.response; \
    var headers = response.headers; \
    headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload'}; \
    headers['content-security-policy'] = { value: \"default-src 'none'; base-uri 'self'; img-src 'self'; script-src 'self'; style-src 'self' https:; object-src 'none'; frame-ancestors 'none'; font-src 'self' https:; form-action 'self'; manifest-src 'self'; connect-src 'self'\" }; \
    headers['x-content-type-options'] = { value: 'nosniff'}; \
    headers['x-frame-options'] = {value: 'DENY'}; \
    headers['x-xss-protection'] = {value: '1; mode=block'}; \
    headers['referrer-policy'] = { value: 'same-origin' }; \
    return response; \
  }")
});

new CloudFrontToS3(stack, 'test-cloudfront-s3', {
  cloudFrontLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
  cloudFrontDistributionProps: {
    defaultBehavior: {
      functionAssociations: [
        {
          eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
          function: cloudfrontFunction
        }
      ],
    }
  },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
  cloudFrontLoggingBucketAccessLogBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
});

suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');
// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
