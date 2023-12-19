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

import { handler } from "..";
import { mockClient } from "aws-sdk-client-mock";
import { KMSClient, DescribeKeyCommand, KeyManagerType, GetKeyPolicyCommand, PutKeyPolicyCommand } from "@aws-sdk/client-kms";

const kmsMock = mockClient(KMSClient);

beforeEach(() => {
  kmsMock.reset();
});

it('Should exit if an AWS managed key is provided; return a success code but give the exact reason', async () => {
  // Mocks
  kmsMock.on(DescribeKeyCommand).resolves({
    KeyMetadata: {
      KeyId: 'sample-key-id',
      KeyManager: KeyManagerType.AWS
    }
  });
  // Arrange
  const e = {
    RequestType: 'Create',
    ResourceProperties: {
      CloudFrontDistributionId: 'sample-cf-distro-id',
      AccountId: '111122223333'
    }
  };
  const context = {
    // ...
  };
  // Act
  const res = await handler(e, context);
  // Assert
  expect(res.Status).toBe('SUCCESS');
  expect(res.Data).toBe('An AWS managed key was provided, no action needed from the custom resource, exiting now.');
});

it('Should return an error if the key policy is returned as undefined', async () => {
  // Mocks
  kmsMock.on(DescribeKeyCommand).resolves({
    KeyMetadata: {
      KeyId: 'sample-key-id',
      KeyManager: KeyManagerType.CUSTOMER
    }
  });
  kmsMock.on(GetKeyPolicyCommand).resolves({
    Policy: undefined
  });
  // Arrange
  const e = {
    RequestType: 'Update',
    ResourceProperties: {
      CloudFrontDistributionId: 'sample-cf-distro-id',
      AccountId: '111122223333'
    }
  };
  const context = {
    // ...
  };
  // Act
  const res = await handler(e, context);
  // Assert
  expect(res.Status).toBe('FAILED');
});

it('Should update the key policy if the proper params are given', async () => {
  // Mocks
  kmsMock.on(DescribeKeyCommand).resolves({
    KeyMetadata: {
      KeyId: 'sample-key-id',
      KeyManager: KeyManagerType.CUSTOMER
    }
  });
  kmsMock.on(GetKeyPolicyCommand).resolves({
    Policy: `{\n
      \"Version\" : \"2012-10-17\",\n
      \"Id\" : \"key-default-1\",\n
      \"Statement\" : [ {\n
          \"Sid\" : \"Enable IAM User Permissions\",\n
          \"Effect\" : \"Allow\",\n
          \"Principal\" : {\n
              \"AWS\" : \"arn:aws:iam::111122223333:root\"\n
          },\n
          \"Action\" : \"kms:*\",\n
          \"Resource\" : \"*\"\n
      } ]\n
    }`
  });
  // Arrange
  const e = {
    RequestType: 'Update',
    ResourceProperties: {
      CloudFrontDistributionId: 'sample-cf-distro-id',
      AccountId: '111122223333'
    }
  };
  const context = {
    // ...
  };
  // Act
  const res = await handler(e, context);
  // Assert
  expect(res.Status).toBe('SUCCESS');
});

it('Should fail if an error occurs with putting the new key policy, all other inputs valid', async () => {
  // Mocks
  kmsMock.on(DescribeKeyCommand).resolves({
    KeyMetadata: {
      KeyId: 'sample-key-id',
      KeyManager: KeyManagerType.CUSTOMER
    }
  });
  kmsMock.on(GetKeyPolicyCommand).resolves({
    Policy: `{\n
      \"Version\" : \"2012-10-17\",\n
      \"Id\" : \"key-default-1\",\n
      \"Statement\" : [ {\n
          \"Sid\" : \"Enable IAM User Permissions\",\n
          \"Effect\" : \"Allow\",\n
          \"Principal\" : {\n
              \"AWS\" : \"arn:aws:iam::111122223333:root\"\n
          },\n
          \"Action\" : \"kms:*\",\n
          \"Resource\" : \"*\"\n
      } ]\n
    }`
  });
  kmsMock.on(PutKeyPolicyCommand).rejects();
  const e = {
    RequestType: 'Update',
    ResourceProperties: {
      CloudFrontDistributionId: 'sample-cf-distro-id',
      AccountId: '111122223333'
    }
  };
  const context = {
    // ...
  };
  // Act
  const res = await handler(e, context);
  // Assert
  expect(res.Status).toBe('FAILED');
});
