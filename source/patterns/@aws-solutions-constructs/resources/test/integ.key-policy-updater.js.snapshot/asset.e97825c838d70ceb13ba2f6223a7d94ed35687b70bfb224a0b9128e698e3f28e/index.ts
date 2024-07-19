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

      // Define the updated key policy to allow CloudFront access
      const keyPolicy = JSON.parse(getKeyPolicyCommandResponse?.Policy);
      const keyPolicyStatement = {
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
      };
      const updatedKeyPolicy = updateKeyPolicy(keyPolicy, keyPolicyStatement);

      await kmsClient.send(new PutKeyPolicyCommand({
        KeyId: kmsKeyId,
        Policy: JSON.stringify(updatedKeyPolicy),
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
 * Updates a provided key policy with a provided key policy statement. First checks whether the provided key policy statement
 * already exists. If an existing key policy is found with a matching sid, the provided key policy will overwrite the existing
 * key policy. If no matching key policy is found, the provided key policy will be appended onto the array of policy statements.
 * @param keyPolicy - the JSON.parse'd result of the otherwise stringified key policy.
 * @param keyPolicyStatement - the key policy statement to be added to the key policy.
 * @returns keyPolicy - the updated key policy.
 */
export const updateKeyPolicy = (keyPolicy: any, keyPolicyStatement: any) => {
  // Check to see if a duplicate key policy exists by matching on the sid. This is to prevent duplicate key policies
  // from being added/updated in response to a stack being updated one or more times after initial creation.
  const existingKeyPolicyIndex = keyPolicy.Statement.findIndex((statement: any) => statement.Sid === keyPolicyStatement.Sid);
  // If a match is found, overwrite the key policy statement...
  // Otherwise, push the new key policy to the array of statements
  if (existingKeyPolicyIndex > -1) {
    keyPolicy.Statement[existingKeyPolicyIndex] = keyPolicyStatement;
  } else {
    keyPolicy.Statement.push(keyPolicyStatement);
  }
  // Return the result
  return keyPolicy;
};
