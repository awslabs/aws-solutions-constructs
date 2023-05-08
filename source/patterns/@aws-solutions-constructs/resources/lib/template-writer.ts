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

import { Construct } from "constructs";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Aws, CustomResource } from 'aws-cdk-lib';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as path from 'path';
import { Provider } from "aws-cdk-lib/custom-resources";
import { addCfnSuppressRules, buildLambdaFunction } from "@aws-solutions-constructs/core";

export interface TemplateWriterResponse {
  readonly s3Bucket: s3.IBucket;
  readonly s3Key: string;
  readonly customResource: CustomResource;
}

export function createTemplateWriterCustomResource(
  scope: Construct,
  id: string,
  inputTemplateBucket: string,
  inputTemplateKey: string,
  templateValues: Array<{ id: string; value: string; }>
): TemplateWriterResponse {

  const outputAsset = new Asset(scope, `${id}OutputAsset`, {
    path: path.join(__dirname, 'placeholder')
  });

  const templateWriterLambda = buildLambdaFunction(scope, {
    lambdaFunctionProps: {
      functionName: `${id}TemplateWriterLambda`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/template-writer-custom-resource`),
      role: new iam.Role(scope, `${id}TemplateWriterLambdaRole`, {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        description: 'Role used by the TemplateWriterLambda to transform the incoming asset',
        inlinePolicies: {
          CloudWatchLogs: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents'
                ],
                resources: [ `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:/aws/lambda/*` ]
              })
            ]
          }),
          ReadInputAssetPolicy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: [ 's3:GetObject' ],
                effect: iam.Effect.ALLOW,
                resources: [ `arn:${Aws.PARTITION}:s3:::${inputTemplateBucket}/${inputTemplateKey}`]
              })
            ]
          }),
          WriteOutputAssetPolicy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: [ 's3:PutObject' ],
                effect: iam.Effect.ALLOW,
                resources: [ `arn:${Aws.PARTITION}:s3:::${outputAsset.s3BucketName}/*`]
              })
            ]
          })
        }
      })
    }
  });

  const templateWriterProvider = new Provider(scope, `${id}Provider`, {
    onEventHandler: templateWriterLambda
  });

  const providerFrameworkFunction = templateWriterProvider.node.children[0].node.findChild('Resource') as lambda.CfnFunction;

  addCfnSuppressRules(providerFrameworkFunction, [
    {
      id: 'W58',
      reason: `Lambda functions has the required permission to write CloudWatch Logs. It uses custom policy instead of arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole with tighter permissions.`
    },
    {
      id: 'W89',
      reason: `This is not a rule for the general case, just for specific use cases/industries`
    },
    {
      id: 'W92',
      reason: `Impossible for us to define the correct concurrency for clients`
    }
  ]);

  const customResource = new CustomResource(scope, `${id}TemplateWriterCustomResource`, {
    resourceType: 'Custom::ApiTemplateWriter',
    serviceToken: templateWriterProvider.serviceToken,
    properties: {
      TemplateValues: JSON.stringify({ templateValues }),
      TemplateInputBucket: inputTemplateBucket,
      TemplateInputKey: inputTemplateKey,
      TemplateOutputBucket: outputAsset.s3BucketName
    }
  });

  return {
    s3Bucket: outputAsset.bucket,
    s3Key: customResource.getAttString('TemplateOutputKey'),
    customResource
  };
}