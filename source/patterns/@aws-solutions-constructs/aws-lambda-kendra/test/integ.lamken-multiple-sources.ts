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
import { App, Stack } from "aws-cdk-lib";
import { LambdaToKendra } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as defaults from '@aws-solutions-constructs/core';
import { generateIntegStackName, suppressCustomHandlerCfnNagWarnings, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-lambda-kendra';
stack.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

const testBucket = defaults.CreateScrapBucket(stack, "scrapBucket");
const secondTestBucket = defaults.CreateScrapBucket(stack, "secondScrapBucket");
const existingIamRole = new iam.Role(stack, 'existingRole', {
  assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com')
});

const sourceProps: kendra.CfnDataSource.WebCrawlerConfigurationProperty = {
  urls: {
    seedUrlConfiguration: {
      seedUrls: ["https://aws.amazon.com"]
    }
  },
  crawlDepth: 1,
};

const webCrawlerSource = {
  name: "web-source",
  roleArn: existingIamRole.roleArn,
  type: "WEBCRAWLER",
  dataSourceConfiguration: {
    webCrawlerConfiguration: sourceProps
  }
};

new LambdaToKendra(stack, 'multiple-sources', {
  lambdaFunctionProps: {
    code: lambda.Code.fromAsset(`lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
  },
  kendraDataSourcesProps: [{
    type: 'S3',
    dataSourceConfiguration: {
      s3Configuration: {
        bucketName: testBucket.bucketName,
      }
    }
  },
  {
    type: 'S3',
    dataSourceConfiguration: {
      s3Configuration: {
        bucketName: secondTestBucket.bucketName,
      }
    }
  },
  webCrawlerSource ],
});

suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');
// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
