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

// Imports
import {App, Duration, Stack} from 'aws-cdk-lib';
import { CloudFrontToMediaStore } from '../lib';
import { generateIntegStackName, suppressAutoDeleteHandlerWarnings } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration test for aws-cloudfront-mediastore with default properties';

// Instantiate construct
new CloudFrontToMediaStore(stack, 'test-cloudfront-mediastore', {
  insertHttpSecurityHeaders: false,
  responseHeadersPolicyProps: {
    securityHeadersBehavior: {
      strictTransportSecurity: {
        accessControlMaxAge: Duration.seconds(63072),
        includeSubdomains: true,
        override: true,
        preload: true
      },
      contentSecurityPolicy: {
        contentSecurityPolicy: "upgrade-insecure-requests; default-src 'none';",
        override: true
      },
    }
  }
});

suppressAutoDeleteHandlerWarnings(stack);
// Synth
app.synth();