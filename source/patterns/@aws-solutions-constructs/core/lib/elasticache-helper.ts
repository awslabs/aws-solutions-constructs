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

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cache from "aws-cdk-lib/aws-elasticache";
import { Construct } from "constructs";
import { GetDefaultCachePort, GetMemcachedDefaults } from './elasticache-defaults';
import { consolidateProps } from './utils';

export interface ObtainMemcachedClusterProps {
  readonly cachePort?: any,
  readonly cacheSecurityGroupId: string,
  readonly cacheProps?: cache.CfnCacheClusterProps | any,
  readonly existingCache?: cache.CfnCacheCluster,
  readonly vpc?: ec2.IVpc,
}

export function obtainMemcachedCluster(
  scope: Construct,
  id: string,
  props: ObtainMemcachedClusterProps
) {

  if (props.existingCache) {
    props.existingCache.vpcSecurityGroupIds?.push(props.cacheSecurityGroupId);
    return props.existingCache;
  } else {
    if (!props.cachePort) {
      throw Error('props.cachePort required for new caches');
    }

    // Create the subnet group from all the isolated subnets in the VPC
    const subnetGroup = createCacheSubnetGroup(scope, props.vpc!, id);

    const defaultProps = GetMemcachedDefaults(id, props.cachePort);
    const requiredConstructProps = {
      vpcSecurityGroupIds: [props.cacheSecurityGroupId],
      cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
    };
    const consolidatedProps = consolidateProps(
      defaultProps,
      props.cacheProps,
      requiredConstructProps,
      true
    );

    const newCache = new cache.CfnCacheCluster(
      scope,
      `${id}-cluster`,
      consolidatedProps
    );
    newCache.addDependency(subnetGroup);
    return newCache;
  }

}

export function createCacheSubnetGroup(
  construct: Construct,
  vpc: ec2.IVpc,
  id: string
): cache.CfnSubnetGroup {

  // Memcached has no auth, all access control is
  // network based, so, at least initially, we will
  // only launch it in isolated subnets.
  const subnetIds: string[] = [];
  vpc.isolatedSubnets.forEach((subnet) => {
    subnetIds.push(subnet.subnetId);
  });

  return new cache.CfnSubnetGroup(construct, `ec-subnetgroup-${id}`, {
    description: "Solutions Constructs generated Cache Subnet Group",
    subnetIds,
    cacheSubnetGroupName: `${id}-subnet-group`,
  });
}

export function getCachePort(
  clientCacheProps?: cache.CfnCacheClusterProps | any,
  existingCache?: cache.CfnCacheCluster
): any {
  if (existingCache) {
    return existingCache.attrConfigurationEndpointPort!;
  } else if (clientCacheProps?.port) {
    return clientCacheProps.port;
  } else {
    return GetDefaultCachePort();
  }
}
