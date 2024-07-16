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

import * as cdk from "aws-cdk-lib";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Aws, CustomResource } from 'aws-cdk-lib';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as path from 'path';
import { Provider } from "aws-cdk-lib/custom-resources";
import { buildLambdaFunction } from "@aws-solutions-constructs/core";
import { addCfnSuppressRulesForCustomResourceProvider } from "./utils";
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as defaults from '@aws-solutions-constructs/core';

/**
 * The TemplateValue interface defines the id-value pair that will
 * be substituted in the template.
 *
 * For example, given the template:
 * template:
 *   hello name_placeholder, nice to meet you
 *
 * and an instantiation of TemplateValue { id: 'name_placeholder', value: 'jeff' }
 *
 * the template will be transformed to:
 * template:
 *   hello jeff, nice to meet you
 */
export interface TemplateValue {
  /**
   * The placeholder string to be replaced in the template.
   */
  readonly id: string;
  /**
   * The value to replace the placeholder in the template with.
   */
  readonly value: string;
}

export interface TemplateWriterProps {
  /**
   * The S3 bucket that holds the template to transform.
   * Upstream this can come either from an Asset or S3 bucket directly.
   * Internally it will always resolve to S3 bucket in either case (the cdk asset bucket or the customer-defined bucket).
   */
  readonly templateBucket: s3.IBucket;
  /**
   * The S3 object key of the template to transform.
   */
  readonly templateKey: string;
  /**
   * An array of TemplateValue objects, each defining a placeholder string in the
   * template that will be replaced with its corresponding value.
   */
  readonly templateValues: TemplateValue[]
  /**
   * Optional configuration for user-defined duration of the backing Lambda function, which may be necessary when transforming very large objects.
   *
   * @default Duration.seconds(3)
   */
  readonly timeout?: cdk.Duration;
  /**
   * Optional configuration for user-defined memorySize of the backing Lambda function, which may be necessary when transforming very large objects.
   *
   * @default 128
   */
  readonly memorySize?: number;
}

export interface CreateTemplateWriterResponse {
  readonly s3Bucket: s3.IBucket;
  readonly s3Key: string;
  readonly customResource: CustomResource;
}

export function createTemplateWriterCustomResource(
  scope: Construct,
  id: string,
  props: TemplateWriterProps
): CreateTemplateWriterResponse {

  const outputAsset = new Asset(scope, `${id}OutputAsset`, {
    path: path.join(__dirname, 'placeholder')
  });

  const templateWriterLambda = buildLambdaFunction(scope, {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/template-writer-custom-resource`),
      timeout: props.timeout,
      memorySize: props.memorySize,
    }
  });

  const templateWriterPolicy = new iam.Policy(scope, `${id}TemplateWriterPolicy`, {
    statements: [
      new iam.PolicyStatement({
        actions: [ 's3:GetObject' ],
        effect: iam.Effect.ALLOW,
        resources: [ `arn:${Aws.PARTITION}:s3:::${props.templateBucket.bucketName}/${props.templateKey}`]
      }),
      new iam.PolicyStatement({
        actions: [ 's3:PutObject' ],
        effect: iam.Effect.ALLOW,
        resources: [ `arn:${Aws.PARTITION}:s3:::${outputAsset.s3BucketName}/*`]
      })
    ]
  });

  templateWriterLambda.role?.attachInlinePolicy(templateWriterPolicy);

  const templateWriterProvider = new Provider(scope, `${id}TemplateWriterProvider`, {
    onEventHandler: templateWriterLambda
  });

  addCfnSuppressRulesForCustomResourceProvider(templateWriterProvider);

  const customResource = new CustomResource(scope, `${id}TemplateWriterCustomResource`, {
    resourceType: 'Custom::TemplateWriter',
    serviceToken: templateWriterProvider.serviceToken,
    properties: {
      TemplateValues: JSON.stringify({ templateValues: props.templateValues }),
      TemplateInputBucket: props.templateBucket.bucketName,
      TemplateInputKey: props.templateKey,
      TemplateOutputBucket: outputAsset.s3BucketName
    }
  });

  customResource.node.addDependency(templateWriterPolicy);

  return {
    s3Bucket: outputAsset.bucket,
    s3Key: customResource.getAttString('TemplateOutputKey'),
    customResource
  };
}