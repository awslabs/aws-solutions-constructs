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

import { KMSClient, GetKeyPolicyCommand, DescribeKeyCommand, PutKeyPolicyCommand, KeyManagerType } from "@aws-sdk/client-kms";

const kmsClient = new KMSClient();

export const handler = async (e: any, context: any) => {

  let status = 'SUCCESS';
  let responseData = {};

  if (e.RequestType === 'Create' || e.RequestType === 'Update') {

    try {
      const kmsKeyId = e.ResourceProperties.KmsKeyId;
      const cloudFrontDistributionId = e.ResourceProperties.CloudFrontDistributionId;
      const accountId = e.ResourceProperties.AccountId;
      const region = process.env.AWS_REGION;

      const describeKeyCommandResponse = await kmsClient.send(new DescribeKeyCommand({
        KeyId: kmsKeyId
      }));

      if (describeKeyCommandResponse.KeyMetadata?.KeyManager === KeyManagerType.AWS) {
        return {
          Status: 'SUCCESS',
          Reason: 'An AWS managed key was provided, no action needed from the custom resource, exiting now.',
          PhysicalResourceId: e.PhysicalResourceId ?? context.logStreamName,
          StackId: e.StackId,
          RequestId: e.RequestId,
          LogicalResourceId: e.LogicalResourceId,
          Data: 'An AWS managed key was provided, no action needed from the custom resource, exiting now.',
        };
      }

      const getKeyPolicyCommandResponse = await kmsClient.send(new GetKeyPolicyCommand({
        KeyId: kmsKeyId,
        PolicyName: 'default'
      }));

      if (!getKeyPolicyCommandResponse.Policy) {
        return {
          Status: 'FAILED',
          Reason: 'An error occurred while retrieving the key policy',
          PhysicalResourceId: e.PhysicalResourceId ?? context.logStreamName,
          StackId: e.StackId,
          RequestId: e.RequestId,
          LogicalResourceId: e.LogicalResourceId,
          Data: 'An error occurred while retrieving the key policy',
        };
      }

      const keyPolicy = JSON.parse(getKeyPolicyCommandResponse?.Policy);

      // Update the existing key policy to allow the cloudfront distribution to use the key
      keyPolicy.Statement.push({
        Sid: 'Grant-CloudFront-Distribution-Key-Usage',
        Effect: 'Allow',
        Principal: {
          Service: 'cloudfront.amazonaws.com',
        },
        Action: [
          'kms:Decrypt',
          'kms:Encrypt',
          'kms:GenerateDataKey*',
          'kms:ReEncrypt*'
        ],
        Resource: `arn:aws:kms:${region}:${accountId}:key/${kmsKeyId}`,
        Condition: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${accountId}:distribution/${cloudFrontDistributionId}`
          }
        }
      });

      await kmsClient.send(new PutKeyPolicyCommand({
        KeyId: kmsKeyId,
        Policy: JSON.stringify(keyPolicy),
        PolicyName: 'default'
      }));
    } catch (err) {
      status = 'FAILED';
      responseData = {
        Error: JSON.stringify(err)
      };
    }
  }

  return {
    Status: status,
    Reason: JSON.stringify(responseData),
    PhysicalResourceId: e.PhysicalResourceId ?? context.logStreamName,
    StackId: e.StackId,
    RequestId: e.RequestId,
    LogicalResourceId: e.LogicalResourceId,
    Data: responseData,
  };
};
