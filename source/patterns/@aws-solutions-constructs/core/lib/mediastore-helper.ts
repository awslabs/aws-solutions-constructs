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

import * as cdk from 'aws-cdk-lib';
import * as mediastore from 'aws-cdk-lib/aws-mediastore';
import { MediaStoreContainerProps } from './mediastore-defaults';
import { consolidateProps } from './utils';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

export function MediaStoreContainer(scope: Construct, mediaStoreContainerProps?: mediastore.CfnContainerProps): mediastore.CfnContainer {
  const defaultprops: mediastore.CfnContainerProps = MediaStoreContainerProps();
  let mediaStoreProps: mediastore.CfnContainerProps;

  mediaStoreProps = consolidateProps(defaultprops, mediaStoreContainerProps);

  // Create the MediaStore Container
  const mediaStoreContainer = new mediastore.CfnContainer(scope, 'MediaStoreContainer', mediaStoreProps);

  // Add deletion policy to retain because it will fail to delete if the container is not empty.
  mediaStoreContainer.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.RETAIN;

  return mediaStoreContainer;
}