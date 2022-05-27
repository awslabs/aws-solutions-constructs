#!/usr/bin/env node

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

import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { S3StaticWebsiteStack } from '../lib/s3-static-site-stack';
import { ServerlessBackendStack } from '../lib/serverless-backend-stack';

const app = new App();
const stack1 = new S3StaticWebsiteStack(app, 'S3StaticWebsiteStack');
const stack2 = new ServerlessBackendStack(app, 'ServerlessBackendStack');
stack2.addDependency(stack1);
stack1.templateOptions.description = 'Creates a static website using AWS S3 and Amazon Cloudfront';
stack2.templateOptions.description = 'Creates a serverless backend using Amazon Cognito, Amazon API Gateway, AWS Lambda function and Amazon DynamoDB table';