/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as sqs from '@aws-cdk/aws-sqs';
import * as kms from '@aws-cdk/aws-kms';

export function DefaultQueueProps(_encryptionMasterKey?: kms.Key) {
    const _DefaultQueueProps: sqs.QueueProps = {
        encryption: sqs.QueueEncryption.KMS,
        encryptionMasterKey: _encryptionMasterKey
    };
    return _DefaultQueueProps;
}