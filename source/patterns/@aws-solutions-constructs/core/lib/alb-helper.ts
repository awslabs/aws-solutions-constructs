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

import * as elb from "@aws-cdk/aws-elasticloadbalancingv2";
import { Construct } from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as s3 from "@aws-cdk/aws-s3";
import * as lambda from "@aws-cdk/aws-lambda";
import { ApplicationProtocol, ListenerAction, } from "@aws-cdk/aws-elasticloadbalancingv2";
import * as elbt from "@aws-cdk/aws-elasticloadbalancingv2-targets";
import { overrideProps, printWarning } from "./utils";
import { DefaultListenerProps } from "./alb-defaults";
import { createAlbLoggingBucket } from "./s3-bucket-helper";
import { DefaultLoggingBucketProps } from "./s3-bucket-defaults";

//  Returns the correct ALB Load Balancer to use in this construct, either an existing
//  one provided as an argument or create  new one otherwise.
export function ObtainAlb(
  scope: Construct,
  id: string,
  vpc: ec2.IVpc,
  publicApi: boolean,
  existingLoadBalancerInterface?: elb.ApplicationLoadBalancer,
  loadBalancerProps?: elb.ApplicationLoadBalancerProps | any,
  logAccessLogs?: boolean,
  loggingBucketProps?: s3.BucketProps
): elb.ApplicationLoadBalancer {
  let loadBalancer: elb.ApplicationLoadBalancer;

  if (existingLoadBalancerInterface) {
    loadBalancer = existingLoadBalancerInterface;
  } else {
    const consolidatedProps = loadBalancerProps
      ? overrideProps(loadBalancerProps, { vpc, internetFacing: publicApi })
      : { vpc, internetFacing: publicApi };
    loadBalancer = new elb.ApplicationLoadBalancer(
      scope,
      `${id}-alb`,
      consolidatedProps
    );
    if (logAccessLogs === undefined || logAccessLogs === true) {
      const consolidatedLoggingBucketProps = loggingBucketProps
        ? overrideProps(DefaultLoggingBucketProps(), loggingBucketProps)
        : DefaultLoggingBucketProps();
      const loggingBucket = createAlbLoggingBucket(scope, id, consolidatedLoggingBucketProps);
      loadBalancer.logAccessLogs(loggingBucket);
    }
  }
  return loadBalancer;
}

export function AddListener(
  scope: Construct,
  loadBalancer: elb.ApplicationLoadBalancer,
  targetGroup: elb.ApplicationTargetGroup,
  listenerProps: elb.ApplicationListenerProps | any
): elb.ApplicationListener {
  let consolidatedListenerProps: elb.ApplicationListenerProps;

  consolidatedListenerProps = overrideProps(
    DefaultListenerProps(loadBalancer),
    listenerProps
  );

  //   create the listener
  const listener = new elb.ApplicationListener(
    scope,
    "listener",
    consolidatedListenerProps
  );
  loadBalancer.listeners.push(listener);

  if (consolidatedListenerProps.protocol === elb.ApplicationProtocol.HTTP) {
    // This will use core.printWarning in the actual construct
    printWarning(
      "AWS recommends encrypting traffic to an Application Load Balancer using HTTPS."
    );
    if (listenerProps.certificates?.length > 0) {
      throw new Error("HTTP listeners cannot use a certificate");
    }
  } else {
    if (!listenerProps.certificates || listenerProps.certificates.length === 0) {
      throw new Error("A listener using HTTPS protocol requires a certificate");
    }

    listener.addCertificates("listener-cert-add", listenerProps.certificates);
  }

  if (consolidatedListenerProps.protocol === elb.ApplicationProtocol.HTTPS) {
    const opt: elb.RedirectOptions = {
      port: "443",
      protocol: "HTTPS",
    };

    const httpListener = new elb.ApplicationListener(
      scope,
      "redirect-listener",
      {
        loadBalancer,
        protocol: ApplicationProtocol.HTTP,
        defaultAction: ListenerAction.redirect(opt),
      }
    );
    loadBalancer.listeners.push(httpListener);
  }

  AddTarget(scope, targetGroup, listener);
  return listener;
}

export function CreateLambdaTargetGroup(
  scope: Construct,
  id: string,
  lambdaFunction: lambda.Function,
  targetProps?: elb.ApplicationTargetGroupProps
): elb.ApplicationTargetGroup {
  const lambdaTarget = new elbt.LambdaTarget(lambdaFunction);
  return new elb.ApplicationTargetGroup(scope, `${id}-tg`, {
    targets: [lambdaTarget],
    targetGroupName: targetProps ? targetProps.targetGroupName : undefined,
    healthCheck: targetProps ? targetProps.healthCheck : undefined
  });
}

export function AddTarget(
  scope: Construct,
  targetGroup: elb.ApplicationTargetGroup,
  listener: elb.ApplicationListener,
  ruleProps?: elb.AddRuleProps
) {
  // AddRuleProps includes conditions and priority, combine that with targetGroups and
  // we can assemble AddApplicationTargetGroupProps
  if (ruleProps) {
    const consolidatedTargetProps = overrideProps(ruleProps, { targetGroups: [targetGroup] });
    listener.addTargetGroups(`${scope.node.id}-targets`, consolidatedTargetProps);
  } else {
    listener.addTargetGroups("targets", {
      targetGroups: [targetGroup],
    });
  }
  return;
}
