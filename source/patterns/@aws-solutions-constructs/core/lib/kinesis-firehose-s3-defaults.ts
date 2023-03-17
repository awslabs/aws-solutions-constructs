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

import { CfnDeliveryStreamProps } from 'aws-cdk-lib/aws-kinesisfirehose';
import { IKey } from 'aws-cdk-lib/aws-kms';

export function DefaultCfnDeliveryStreamProps(_bucketArn: string, _roleArn: string,
  _logGroupName: string, _logStreamName: string, _kms: IKey, deliveryStreamName?: string): CfnDeliveryStreamProps {

  return {
    deliveryStreamName,
    extendedS3DestinationConfiguration : {
      bucketArn: _bucketArn,
      bufferingHints: {
        intervalInSeconds: 300,
        sizeInMBs: 5
      },
      compressionFormat: 'GZIP',
      roleArn: _roleArn,
      cloudWatchLoggingOptions: {
        enabled: true,
        logGroupName: _logGroupName,
        logStreamName: _logStreamName
      },
      encryptionConfiguration: {
        kmsEncryptionConfig: {
          awskmsKeyArn: _kms.keyArn
        }
      }
    },
  } as CfnDeliveryStreamProps;
}