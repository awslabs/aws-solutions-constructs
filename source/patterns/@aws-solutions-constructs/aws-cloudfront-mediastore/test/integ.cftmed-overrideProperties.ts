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
import { App, Aws, RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as mediastore from 'aws-cdk-lib/aws-mediastore';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { CloudFrontToMediaStore } from '../lib';
import { generateIntegStackName, suppressCustomHandlerCfnNagWarnings, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration test for aws-cloudfront-mediastore override properties';
const mediaStoreContainerProps: mediastore.CfnContainerProps = {
  containerName: 'MyOwnMediaStoreContainer',
  policy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Sid: 'OverridePolicy',
      Effect: 'Allow',
      Principal: '*',
      Action: 'mediastore:*',
      Resource: `arn:aws:mediastore:${Aws.REGION}:${Aws.ACCOUNT_ID}:container/MyOwnMediaStoreContainer/*`,
      Condition: {
        Bool: { "aws:SecureTransport": "true" }
      }
    }]
  })
};
const cloudFrontDistributionProps = {
  defaultBehavior: {
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD
  }
};

// Instantiate construct
new CloudFrontToMediaStore(stack, 'test-cloudfront-mediastore', {
  mediaStoreContainerProps,
  cloudFrontDistributionProps,
  cloudFrontLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  }
});

suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');
// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
