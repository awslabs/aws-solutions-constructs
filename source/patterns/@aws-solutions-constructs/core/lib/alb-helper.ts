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

import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { ApplicationProtocol, ListenerAction, } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as elbt from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import { printWarning, consolidateProps } from "./utils";
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
    const consolidatedProps = consolidateProps({}, loadBalancerProps, { vpc, internetFacing: publicApi });
    loadBalancer = new elb.ApplicationLoadBalancer(
      scope,
      `${id}-alb`,
      consolidatedProps
    );
    if (logAccessLogs === undefined || logAccessLogs === true) {
      const consolidatedLoggingBucketProps = consolidateProps(DefaultLoggingBucketProps(), loggingBucketProps);
      const loggingBucket = createAlbLoggingBucket(scope, id, consolidatedLoggingBucketProps);
      loadBalancer.logAccessLogs(loggingBucket);
    }
  }
  return loadBalancer;
}

export function AddListener(
  scope: Construct,
  id: string,
  loadBalancer: elb.ApplicationLoadBalancer,
  listenerProps: elb.ApplicationListenerProps | any
): elb.ApplicationListener {
  let consolidatedListenerProps: elb.ApplicationListenerProps;

  consolidatedListenerProps = consolidateProps(DefaultListenerProps(loadBalancer), listenerProps);

  //  create the listener
  const listener = new elb.ApplicationListener(
    scope,
    `${id}-listener`,
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

    listener.addCertificates(`${id}-cert`, listenerProps.certificates);
  }

  if (consolidatedListenerProps.protocol === elb.ApplicationProtocol.HTTPS) {
    const opt: elb.RedirectOptions = {
      port: "443",
      protocol: "HTTPS",
    };

    const httpListener = new elb.ApplicationListener(
      scope,
      `${id}-redirect`,
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
// the new Target Group to the provided Listener.
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

  // The interface AddRuleProps includes conditions and priority, combine that
  // with targetGroups and we can assemble AddApplicationTargetGroupProps
  const consolidatedTargetProps = consolidateProps({}, ruleProps, { targetGroups: [newTargetGroup] });
  currentListener.addTargetGroups(`${scope.node.id}-targets`, consolidatedTargetProps);

  newTargetGroup.setAttribute('stickiness.enabled', undefined);
  return newTargetGroup;
}

export function AddFargateTarget(
  scope: Construct,
  id: string,
  currentListener: elb.ApplicationListener,
  fargateService: ecs.FargateService,
  ruleProps?: elb.AddRuleProps,
  targetProps?: elb.ApplicationTargetGroupProps,
): elb.ApplicationTargetGroup  {

  if (targetProps?.protocol !== elb.ApplicationProtocol.HTTPS) {
    printWarning('AWS recommends using HTTPS protocol for Target Groups in production applications');
  }

  const newTargetGroup = new elb.ApplicationTargetGroup(scope, `${id}-tg`, targetProps);

  // The interface AddRuleProps includes conditions and priority, combine that
  // with targetGroups and we can assemble an AddApplicationTargetGroupProps object
  const consolidatedTargetProps = consolidateProps({ targetGroups: [newTargetGroup] }, ruleProps);

  currentListener.addTargetGroups(`${scope.node.id}-targets`, consolidatedTargetProps);
  newTargetGroup.addTarget(fargateService);

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

export function CheckAlbProps(props: any) {
  let errorMessages = '';
  let errorFound = false;

  if (props.listenerProps?.certificateArns) {
    errorMessages += "certificateArns is deprecated. Please supply certificates using props.listenerProps.certificates\n";
    errorFound = true;
  }

  if (
    ((props.existingLoadBalancerObj &&
      props.existingLoadBalancerObj.listeners.length === 0) ||
      !props.existingLoadBalancerObj) &&
    !props.listenerProps
  ) {
    errorMessages += "When adding the first listener and target to a load balancer, listenerProps must be specified and include at least a certificate or protocol: HTTP\n";
    errorFound = true;
  }

  if (
    props.existingLoadBalancerObj &&
    props.existingLoadBalancerObj.listeners.length > 0 &&
    props.listenerProps
  ) {
    errorFound = true;
    errorMessages += "This load balancer already has a listener, listenerProps may not be specified\n";
  }

  if (
    props.existingLoadBalancerObj &&
    props.existingLoadBalancerObj.listeners.length > 0 &&
    !props.ruleProps
  ) {
    errorFound = true;
    errorMessages += "When adding a second target to an existing listener, there must be rules provided\n";
  }

  // Check construct specific invalid inputs
  if (props.existingLoadBalancerObj && !props.existingVpc) {
    errorFound = true;
    errorMessages += "An existing ALB is already in a VPC, that VPC must be provided in props.existingVpc for the rest of the construct to use.\n";
  }

  if (props.loadBalancerProps?.vpc) {
    errorFound = true;
    errorMessages += 'Specify any existing VPC at the construct level, not within loadBalancerProps.\n';
  }

  if (props.existingLoadBalancerObj) {
    printWarning(
      "The public/private property of an existing ALB must match the props.publicApi setting provided."
    );
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}