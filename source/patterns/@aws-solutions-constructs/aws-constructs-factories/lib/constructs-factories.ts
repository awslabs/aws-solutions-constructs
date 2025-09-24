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

// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as defaults from '@aws-solutions-constructs/core';

import { StateMachineFactory, StateMachineFactoryProps, StateMachineFactoryResponse } from './state-machine-factory';
import { BucketFactory, S3BucketFactoryProps, S3BucketFactoryResponse } from './bucket-factory';
import { SqsQueueFactoryProps, SqsQueueFactoryResponse, QueueFactory } from './queue-factory';
import { VpcFactory, VpcFactoryProps, VpcFactoryResponse } from './vpc-factory';
export class ConstructsFactories extends Construct {

  public s3BucketFactory(id: string, props: S3BucketFactoryProps): S3BucketFactoryResponse {
    defaults.CheckS3Props(props);

    return BucketFactory.factory(this, id, props);
  }

  public stateMachineFactory(id: string, props: StateMachineFactoryProps): StateMachineFactoryResponse {
    defaults.CheckStateMachineProps(props);

    return StateMachineFactory.factory(this, id, props);
  }

  public sqsQueueFactory(id: string, props: SqsQueueFactoryProps): SqsQueueFactoryResponse {
    defaults.CheckSqsProps(props);

    return QueueFactory.factory(this, id, props);
  }

  public vpcFactory(id: string, props: VpcFactoryProps): VpcFactoryResponse {
    defaults.CheckVpcProps(props);

    return VpcFactory.factory(this, id, props);
  }

}
