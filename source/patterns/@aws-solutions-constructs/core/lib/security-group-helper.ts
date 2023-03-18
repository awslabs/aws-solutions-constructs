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

// import { countResources } from "@aws-cdk/assert";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { addCfnSuppressRules } from './utils';

export interface SecurityGroupRuleDefinition {
  readonly peer: ec2.IPeer // example: ec2.Peer.ipV4(vpc.vpcCiderBlock)
  readonly connection: ec2.Port
  readonly description?: string
  readonly remoteRule?: boolean
}

export function buildSecurityGroup(
  scope: Construct,
  name: string,
  props: ec2.SecurityGroupProps,
  ingressRules: SecurityGroupRuleDefinition[],
  egressRules: SecurityGroupRuleDefinition[]
): ec2.SecurityGroup {
  const newSecurityGroup = new ec2.SecurityGroup(scope, `${name}-security-group`, props);

  ingressRules.forEach(rule => {
    newSecurityGroup.addIngressRule(rule.peer, rule.connection, rule.description, rule.remoteRule);
  });

  egressRules.forEach(rule => {
    newSecurityGroup.addEgressRule(rule.peer, rule.connection, rule.description, rule.remoteRule);
  });

  addCfnSuppressRules(newSecurityGroup, [
    {
      id: "W5",
      reason:
        "Egress of 0.0.0.0/0 is default and generally considered OK",
    },
    {
      id: "W40",
      reason:
        "Egress IPProtocol of -1 is default and generally considered OK",
    },
  ]);

  return newSecurityGroup;
}

export function CreateSelfReferencingSecurityGroup(scope: Construct, id: string, vpc: ec2.IVpc, cachePort: any) {
  const newCacheSG = new ec2.SecurityGroup(scope, `${id}-cachesg`, {
    vpc,
    allowAllOutbound: true,
  });
  const selfReferenceRule = new ec2.CfnSecurityGroupIngress(
    scope,
    `${id}-ingress`,
    {
      groupId: newCacheSG.securityGroupId,
      sourceSecurityGroupId: newCacheSG.securityGroupId,
      ipProtocol: "TCP",
      fromPort: cachePort,
      toPort: cachePort,
      description: 'Self referencing rule to control access to Elasticache memcached cluster',
    }
  );
  selfReferenceRule.node.addDependency(newCacheSG);

  addCfnSuppressRules(newCacheSG, [
    {
      id: "W5",
      reason: "Egress of 0.0.0.0/0 is default and generally considered OK",
    },
    {
      id: "W40",
      reason:
        "Egress IPProtocol of -1 is default and generally considered OK",
    },
  ]);
  return newCacheSG;
}
