/**
 *  CopyrightAmazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { CreateTestCache, getTestVpc } from "./test-helper";
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { getCachePort, obtainMemcachedCluster } from "../lib/elasticache-helper";
import { GetDefaultCachePort } from "../lib/elasticache-defaults";

test("Test returning existing Cache", () => {
  const stack = new cdk.Stack();

  const testVpc = getTestVpc(stack, false);
  const existingCache = CreateTestCache(stack, 'test', testVpc);

  const securityGroup = new ec2.SecurityGroup(stack, 'test-sg', {
    vpc: testVpc
  });
  const obtainedCache = obtainMemcachedCluster(stack, 'test-cache', {
    existingCache,
    cacheSecurityGroupId: securityGroup.securityGroupId
  });

  expect(obtainedCache).toBe(existingCache);
});

test("Test create cache with no client props", () => {
  const stack = new cdk.Stack();

  const testVpc = getTestVpc(stack, false);

  const securityGroup = new ec2.SecurityGroup(stack, 'test-sg', {
    vpc: testVpc
  });
  obtainMemcachedCluster(stack, 'test-cache', {
    vpc: testVpc,
    cacheSecurityGroupId: securityGroup.securityGroupId,
    cachePort: 11111,
  });

  expect(stack).toHaveResourceLike("AWS::ElastiCache::CacheCluster", {
    Port: 11111,
    AZMode: 'cross-az',
    Engine: 'memcached',
  });
});

test("Test create cache with client props", () => {
  const stack = new cdk.Stack();

  const testVpc = getTestVpc(stack, false);

  const securityGroup = new ec2.SecurityGroup(stack, 'test-sg', {
    vpc: testVpc
  });
  obtainMemcachedCluster(stack, 'test-cache', {
    vpc: testVpc,
    cacheSecurityGroupId: securityGroup.securityGroupId,
    cachePort: 12321,
    cacheProps: {
      azMode: 'single-az',
      clusterName: 'test-name'
    }
  });

  expect(stack).toHaveResourceLike("AWS::ElastiCache::CacheCluster", {
    Port: 12321,
    AZMode: 'single-az',
    Engine: 'memcached',
    ClusterName: 'test-name'
  });
});

test("Test GetCachePort() with existing cache", () => {

  const stack = new cdk.Stack();

  const testVpc = getTestVpc(stack, false);
  const existingCache = CreateTestCache(stack, 'test', testVpc, 32123);

  const port = getCachePort(undefined, existingCache);

  // Since the port from the existing cache is a token,
  // we can't check it directly, but we can ensure
  // the default port was replaced
  expect(port).not.toEqual(GetDefaultCachePort());
});

test("Test GetCachePort() with clientCacheProps", () => {
  const clientPort = 32123;

  const port = getCachePort({ port: clientPort });
  expect(port).toEqual(clientPort);
});
test("Test GetCachePort() with default port", () => {

  const port = getCachePort();
  expect(port).toEqual(GetDefaultCachePort());
});
