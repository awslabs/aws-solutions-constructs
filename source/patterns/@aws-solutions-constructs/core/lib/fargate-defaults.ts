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

import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as elb from "@aws-cdk/aws-elasticloadbalancingv2";

export function DefaultClusterProps() {
  return {

  };
}

export function DefaultFargateServiceProps(
) {
  return {
    assignPublicIp: true,
    desiredCount: 2,
    maxHealthyPercent: 200,
    minHealthyPercent: 100,
    platformVersion: ecs.FargatePlatformVersion.LATEST,
  };
}

export function DefaultFargateTaskDefinitionProps(): ecs.FargateTaskDefinitionProps {
  return {
    cpu: 512,
    memoryLimitMiB: 1024,
  };
}

export function DefaultApplicationTargetGroupProps(vpc: ec2.IVpc): elb.ApplicationTargetGroupProps {
  return {
    port: 8080,
    protocol: elb.ApplicationProtocol.HTTP,
    protocolVersion: elb.ApplicationProtocolVersion.HTTP1,
    targetType: elb.TargetType.IP,
    vpc,
    healthCheck: { path: '/url' }
  };
}

export function DefaultContainerDefinitionProps(): ecs.ContainerDefinitionOptions | any {
  return {
    memoryReservationMiB: 1024,
    portMappings: [ { containerPort: 8080 } ],
  };
}