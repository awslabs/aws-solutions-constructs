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

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import * as crypto from 'crypto';

const s3Client = new S3Client({ region: process.env.REGION });

export const handler = async (event: any, context: any) => {
  let status = 'SUCCESS';
  let responseData = {};

  // These are the standard Create/Update/Delete custom resource request types defined here:
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref-requesttypes.html
  if (event.RequestType === 'Create' || event.RequestType === 'Update') {
    try {
      const templateValues = JSON.parse(event.ResourceProperties.TemplateValues).templateValues;
      const templateInputBucket = event.ResourceProperties.TemplateInputBucket;
      const templateInputKey = event.ResourceProperties.TemplateInputKey;
      const templateOutputBucket = event.ResourceProperties.TemplateOutputBucket;
      const templateOutputKey = crypto.randomBytes(32).toString('hex');

      const getObjectResponse = await s3Client.send(new GetObjectCommand({
        Bucket: templateInputBucket,
        Key: templateInputKey
      }));

      let template = await getObjectResponse.Body?.transformToString();

      templateValues.forEach((templateValue: any) => {
        template = template?.replace(
          new RegExp(templateValue.id, 'g'),
          templateValue.value
        );
      });

      await s3Client.send(new PutObjectCommand({
        Bucket: templateOutputBucket,
        Key: templateOutputKey,
        Body: template
      }));

      responseData = {
        TemplateOutputKey: templateOutputKey
      };
    } catch (err) {
      status = 'FAILED';
      responseData = {
        Error: err
      };
    }
  }

  return {
    Status: status,
    Reason: JSON.stringify(responseData),
    PhysicalResourceId: event.PhysicalResourceId ?? context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData,
  };
};