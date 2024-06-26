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

// Imports
import { Stack } from "aws-cdk-lib";
import * as defaults from '../';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';

test('Test DefaultWebSocketApiProps with no defaults', () => {
  const stack = new Stack();

  const emptyRole = new iam.Role(stack, 'testrole', {
    assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com")
  });
  const queue = new sqs.Queue(stack, 'testqueue', {});

  const props = defaults.DefaultWebSocketApiProps(
    emptyRole,
    queue
  );

  expect(props).toMatchObject({
    connectRouteOptions: {
      authorizer: {}
    }
  });
});
