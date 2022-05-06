/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import "@aws-cdk/assert/jest";
import { GetDefaultCachePort, GetMemcachedDefaults } from "../lib/elasticache-defaults";

test("Test GetDefaultCachePort()", () => {
  const defaultPort = GetDefaultCachePort();

  expect(defaultPort).toEqual(11222);
});

test("Test GetMemcachedDefaults()", () => {
  const testPort = 22222;
  const testId = 'test';

  const props = GetMemcachedDefaults(testId, testPort);

  expect(props.port).toEqual(testPort);
  expect(props.clusterName).toEqual(`${testId}-cdk-cluster`);
  expect(props.engine).toEqual("memcached");
  expect(props.cacheNodeType).toEqual("cache.t3.medium");
  expect(props.numCacheNodes).toEqual(2);
  expect(props.azMode).toEqual('cross-az');
});