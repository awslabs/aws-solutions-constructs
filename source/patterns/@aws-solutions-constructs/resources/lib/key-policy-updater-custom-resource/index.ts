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

export const handler = async (event: any, context: any) => {

  let status = 'SUCCESS';
  let responseData = {};

  if (event.RequestType === 'Create' || event.RequestType === 'Update') {

    try {
      const kmsKeyId = event.ResourceProperties.KmsKeyId;
      const cloudFrontDistributionId = event.ResourceProperties.CloudFrontDistributionId;
      const accountId = event.ResourceProperties.AccountId;
      const region = process.env.AWS_REGION;

      const describeKeyCommandResponse = await kmsClient.send(new DescribeKeyCommand({
        KeyId: kmsKeyId
      }));

      if (describeKeyCommandResponse.KeyMetadata?.KeyManager === KeyManagerType.AWS) {
        return {
          Status: 'SUCCESS',
          Reason: 'An AWS managed key was provided, no action needed from the custom resource, exiting now.',
          PhysicalResourceId: event.PhysicalResourceId ?? context.logStreamName,
          StackId: event.StackId,
          RequestId: event.RequestId,
          LogicalResourceId: event.LogicalResourceId,
          Data: 'An AWS managed key was provided, no action needed from the custom resource, exiting now.',
        };
      }

      // The PolicyName is specified as "default" below because that is the only valid name as
      // written in the documentation for @aws-sdk/client-kms.GetKeyPolicyCommandInput:
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-kms/Interface/GetKeyPolicyCommandInput/
      const getKeyPolicyCommandResponse = await kmsClient.send(new GetKeyPolicyCommand({
        KeyId: kmsKeyId,
        PolicyName: 'default'
      }));

      if (!getKeyPolicyCommandResponse.Policy) {
        return {
          Status: 'FAILED',
          Reason: 'An error occurred while retrieving the key policy.',
          PhysicalResourceId: event.PhysicalResourceId ?? context.logStreamName,
          StackId: event.StackId,
          RequestId: event.RequestId,
          LogicalResourceId: event.LogicalResourceId,
          Data: 'An error occurred while retrieving the key policy.',
        };
      }

      // Update the existing key policy to allow the CloudFront distribution to use the key
      const keyPolicy = JSON.parse(getKeyPolicyCommandResponse?.Policy);
      const keyPolicyStatementSid: string = 'Grant-CloudFront-Distribution-Key-Usage';

      if (checkForExistingKeyPolicyStatement(keyPolicy, keyPolicyStatementSid)) {
        return {
          Status: 'SUCCESS',
          Reason: 'The key policy has already been updated in response to a previous stack event. No action needed.',
          PhysicalResourceId: event.PhysicalResourceId ?? context.logStreamName,
          StackId: event.StackId,
          RequestId: event.RequestId,
          LogicalResourceId: event.LogicalResourceId,
          Data: 'The key policy has already been updated in response to a previous stack event. No action needed.',
        };
      }

      keyPolicy.Statement.push({
        Sid: keyPolicyStatementSid,
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
    PhysicalResourceId: event.PhysicalResourceId ?? context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData,
  };
};

/**
 * Function that checks for a matching key policy statement using the SID. This is used to
 * prevent duplicate key policies from being added/updated in response to a stack being
 * updated one or more times after creation.
 * @param parsedKeyPolicy - Parsed key policy object, which is initially delivered in the form
 * of stringified JSON from the GetKeyPolicyCommand. See here under "Example Usage".
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/kms/command/GetKeyPolicyCommand/
 * @param sid - The SID to match key policy statements on.
 * @returns - True if a matching key policy was detected, false if no match found.
 */
export const checkForExistingKeyPolicyStatement = (parsedKeyPolicy: any, sid: string) => {
  const matches = parsedKeyPolicy.Statement.find((statement: any) => statement.Sid === sid);
  return matches ? true : false;
};
