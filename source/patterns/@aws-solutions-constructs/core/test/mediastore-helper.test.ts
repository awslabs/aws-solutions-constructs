/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as mediastore from '@aws-cdk/aws-mediastore';
import { MediaStoreContainer } from '../lib/mediastore-helper';

test('MediaStore container with default params', () => {
  const stack = new Stack();

  MediaStoreContainer(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('MediaStore container override params', () => {
  const stack = new Stack();
  const mediaStoreContainerProps: mediastore.CfnContainerProps = {
    containerName: 'TestContainer',
    policy: '{}',
    lifecyclePolicy: '{}',
    metricPolicy: {
      containerLevelMetrics: 'DISABLED'
    }
  };

  MediaStoreContainer(stack, mediaStoreContainerProps);
  expect(stack).toHaveResourceLike('AWS::MediaStore::Container', {
    AccessLoggingEnabled: true,
    CorsPolicy: [
      {
        AllowedHeaders: [ '*' ],
        AllowedMethods: [ 'GET' ],
        AllowedOrigins: [ '*' ],
        ExposeHeaders: [ '*' ],
        MaxAgeSeconds: 3000
      }
    ],
    MetricPolicy: {
      ContainerLevelMetrics: 'DISABLED'
    },
    Policy: '{}',
    LifecyclePolicy: '{}',
    ContainerName: 'TestContainer'
  });
});