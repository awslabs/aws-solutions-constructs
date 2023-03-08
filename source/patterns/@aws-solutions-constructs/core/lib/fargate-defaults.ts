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

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultClusterProps() {
  return {

  };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultFargateServiceProps(
) {
  return {
    assignPublicIp: false,
    desiredCount: 2,
    maxHealthyPercent: 150,
    minHealthyPercent: 75,
    platformVersion: ecs.FargatePlatformVersion.LATEST,
  };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultFargateTaskDefinitionProps(): ecs.FargateTaskDefinitionProps {
  return {
    cpu: 256,
    memoryLimitMiB: 512,
  };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultApplicationTargetGroupProps(vpc: ec2.IVpc): elb.ApplicationTargetGroupProps {
  return {
    port: 8080,
    protocol: elb.ApplicationProtocol.HTTP,
    protocolVersion: elb.ApplicationProtocolVersion.HTTP1,
    targetType: elb.TargetType.IP,
    vpc,
    healthCheck: { path: '/' }
  };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultContainerDefinitionProps(): ecs.ContainerDefinitionOptions | any {
  return {
    memoryReservationMiB: 512,
    portMappings: [ { containerPort: 8080 } ],
  };
}