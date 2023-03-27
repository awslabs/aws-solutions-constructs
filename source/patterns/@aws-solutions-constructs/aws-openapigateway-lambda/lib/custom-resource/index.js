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

export const handler = async (event, context) => {
  // tslint:disable-next-line:no-console
  console.log(`Received: ${JSON.stringify(event, null, 2)}`);

  let status = 'SUCCESS';
  let responseData = {};

  if (event.RequestType === 'Create' || event.RequestType === 'Update') {
    try {
      const apiIntegrationUrisJson = event.ResourceProperties.ApiIntegrationUris;
      const apiDefinitionInputBucket = event.ResourceProperties.ApiDefinitionInputBucket;
      const apiDefinitionInputKey = event.ResourceProperties.ApiDefinitionInputKey;
      const apiDefinitionOutputBucket = event.ResourceProperties.ApiDefinitionOutputBucket;
      const apiDefinitionOutputKey = crypto.randomBytes(32).toString('hex');

      const getObjectResponse = await s3Client.send(new GetObjectCommand({
        Bucket: apiDefinitionInputBucket,
        Key: apiDefinitionInputKey
      }));

      const apiIntegrationUrisObject = JSON.parse(apiIntegrationUrisJson);
      let apiDefinition = await getObjectResponse.Body?.transformToString();

      for (const apiIntegration of apiIntegrationUrisObject.apiIntegrationUris) {
        const re = new RegExp(apiIntegration.id, 'g');
        apiDefinition = apiDefinition?.replace(re, apiIntegration.uri);
      }

      await s3Client.send(new PutObjectCommand({
        Bucket: apiDefinitionOutputBucket,
        Key: apiDefinitionOutputKey,
        Body: apiDefinition
      }));

      responseData = {
        ApiDefinitionOutputKey: apiDefinitionOutputKey
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