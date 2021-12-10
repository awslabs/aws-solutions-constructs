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
  existingLoadBalancerObj?: elb.ApplicationLoadBalancer,
  loadBalancerProps?: elb.ApplicationLoadBalancerProps | any,
  logAccessLogs?: boolean,
  loggingBucketProps?: s3.BucketProps
): elb.ApplicationLoadBalancer {
  let loadBalancer: elb.ApplicationLoadBalancer;

  if (existingLoadBalancerObj) {
    loadBalancer = existingLoadBalancerObj;
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

  return listener;
}

// Creates a Target Group for Lambda functions and adds the
// provided functions as a target to that group. Then adds
// the new Target Group to the provided Listener. The expectaion
// is that Lambda specific code is included here, and next we will
// add AddFargateTarget(), with Fargate specific code isolated in that
// function.
export function AddLambdaTarget(
  scope: Construct,
  id: string,
  currentListener: elb.ApplicationListener,
  lambdaFunction: lambda.IFunction,
  ruleProps?: elb.AddRuleProps,
  targetProps?: elb.ApplicationTargetGroupProps,
): elb.ApplicationTargetGroup  {

  //  Create the target and assign it to a new target group
  const lambdaTarget = new elbt.LambdaTarget(lambdaFunction);
  const newTargetGroup = new elb.ApplicationTargetGroup(scope, `${id}-tg`, {
    targets: [lambdaTarget],
    targetGroupName: targetProps ? targetProps.targetGroupName : undefined,
    healthCheck: targetProps ? targetProps.healthCheck : undefined
  });

  // AddRuleProps includes conditions and priority, combine that with targetGroups and
  // we can assemble AddApplicationTargetGroupProps
  if (ruleProps) {
    const consolidatedTargetProps = overrideProps(ruleProps, { targetGroups: [newTargetGroup] });
    currentListener.addTargetGroups(`${scope.node.id}-targets`, consolidatedTargetProps);
  } else {
    currentListener.addTargetGroups("targets", {
      targetGroups: [newTargetGroup],
    });
  }
  newTargetGroup.setAttribute('stickiness.enabled', undefined);

  return newTargetGroup;
}

// Looks for the listener associated with Target Groups
// If there is a single listener, this returns it whether it is HTTP or HTTPS
// If there are 2 listeners, it finds the HTTPS listener (we assume the HTTP listener redirects to HTTPS)
export function GetActiveListener(listeners: elb.ApplicationListener[]): elb.ApplicationListener {
  let listener: elb.ApplicationListener;

  if (listeners.length === 0 ) {
    throw new Error(`There are no listeners in the ALB`);
  }
  if (listeners.length === 1 ) {
    listener = listeners[0];
  } else {
    listener = listeners.find(i => (i.node.children[0] as elb.CfnListener).protocol === "HTTPS") as elb.ApplicationListener;
  }
  return listener;
}
