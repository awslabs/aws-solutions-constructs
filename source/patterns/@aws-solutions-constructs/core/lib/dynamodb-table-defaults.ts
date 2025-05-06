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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { overrideProps } from './utils';

export function GetDefaultTableProps(clientTableProps?: dynamodb.TableProps) {
  return AddAppropriatePointInTimeRecovery(clientTableProps,{
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    encryption: dynamodb.TableEncryption.AWS_MANAGED,
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING
    }
  });
}

export function GetDefaultTableWithStreamProps(clientTableProps?: dynamodb.TableProps) {
  return AddAppropriatePointInTimeRecovery(clientTableProps, {
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    encryption: dynamodb.TableEncryption.AWS_MANAGED,
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING
    },
    stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
  });
}

function AddAppropriatePointInTimeRecovery(clientTableProps: dynamodb.TableProps | undefined, defaultProps: dynamodb.TableProps) {
  // We should never set pointInTimeRecovery as it is deprecated. But if a client has set it, the value passed by the client
  // should be used. If the client ahs sent a pointInTimeRecovery, we should not set a pointInTimeRecoverySpecification because
  // the two values will at best be redundant, and at worst conflict.

  // Under the covers, CDK will convert pointInTimeRecovery to PointInTimeRecoverySpecification in the actual template
  if (clientTableProps?.pointInTimeRecovery !== undefined) {
    return clientTableProps;
  } else {
    return overrideProps(defaultProps, { pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }});
  }
}