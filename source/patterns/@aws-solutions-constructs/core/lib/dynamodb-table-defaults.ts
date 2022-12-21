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

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const DefaultTableProps: dynamodb.TableProps = {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  partitionKey: {
    name: 'id',
    type: dynamodb.AttributeType.STRING
  }
};

const DefaultTableWithStreamProps: dynamodb.TableProps = {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  partitionKey: {
    name: 'id',
    type: dynamodb.AttributeType.STRING
  },
  stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
};

export { DefaultTableProps, DefaultTableWithStreamProps };