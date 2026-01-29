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
import * as defaults from "@aws-solutions-constructs/core";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as r53 from "aws-cdk-lib/aws-route53";
import * as r53t from 'aws-cdk-lib/aws-route53-targets';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface Route53ToAlbProps {
  /**
   * Custom properties for a new Private Hosted Zone. Cannot be specified for a
   * public API. Cannot specify a VPC
   *
   * @default - None
   */
  readonly privateHostedZoneProps?: r53.PrivateHostedZoneProps | any,
  /**
   * Existing Public or Private Hosted Zone. If a Private Hosted Zone, must
   * exist in the same VPC specified in existingVpc
   *
   * @default - None
   */
  readonly existingHostedZoneInterface?: r53.IHostedZone,
  /**
   * Custom properties for a new ALB. Providing both this and existingLoadBalancerObj
   * causes an error. These properties cannot include a VPC.
   *
   * @default - None
   */
  readonly loadBalancerProps?: elb.ApplicationLoadBalancerProps | any,
  /**
   * An existing Application Load Balancer. Providing both this and loadBalancerProps
   * causes an error. This ALB must exist in the same VPC specified in existingVPC
   *
   * @default - None
   */
  readonly existingLoadBalancerObj?: elb.ApplicationLoadBalancer,
  /**
   * Whether to turn on Access Logs for the Application Load Balancer. Uses an S3 bucket
   * with associated storage costs. Enabling Access Logging is a best practice.
   *
   * @default - true
   */
  readonly logAlbAccessLogs?: boolean,
  /**
   * Optional properties to customize the bucket used to store the ALB Access
   * Logs. Supplying this and setting logAccessLogs to false causes an error.
   *
   * @default - none
   */
  readonly albLoggingBucketProps?: s3.BucketProps,
  /**
   * Custom properties for a new VPC. Providing both this and existingVpc is
   * an error. If an existingAlb or existing Private Hosted Zone is provided, those
   * already exist in a VPC so this value cannot be provided.
   *
   * @default - None
   */
  readonly vpcProps?: ec2.VpcProps,
  /**
   * An existing VPC. Providing both this and vpcProps causes an error. If an existingAlb or existing
   * Private Hosted Zone is provided, this value must be the VPC associated with those resources.
   *
   * @default - None
   */
  readonly existingVpc?: ec2.IVpc,
  /**
   * Whether to create a public or private API. This value has implications
   * for the VPC, the type of Hosted Zone and the Application Load Balancer
   */
  readonly publicApi: boolean
}

/**
 * @summary Configures a Route53 Hosted Zone to route to an Application Load Balancer
 */
export class Route53ToAlb extends Construct {
  public readonly hostedZone: r53.IHostedZone;
  public readonly vpc: ec2.IVpc;
  public readonly loadBalancer: elb.ApplicationLoadBalancer;

  /**
   * @summary Constructs a new instance of the Route53ToAlb class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {Route53ToAlbProps} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: Route53ToAlbProps) {
    super(scope, id);
    // NOTE: We don't call CheckAlbProps() here, because this construct creates an ALB
    // with no listener or target, so some of those checks don't apply
    this.PropsCustomCheck(props);

    if (props.existingHostedZoneInterface && !props.publicApi && !props.existingVpc) {
      throw new Error('An existing Private Hosted Zone already exists in a VPC, so that VPC must be passed to the construct in props.existingVpc');
    }

    this.vpc = defaults.buildVpc(scope, {
      existingVpc: props.existingVpc,
      defaultVpcProps: props.publicApi ?
        defaults.DefaultPublicPrivateVpcProps() :
        // If this is an internal app, we're going to turn on DNS
        // by default to allow gateway and interface service endpoints
        defaults.overrideProps(defaults.DefaultIsolatedVpcProps(), { enableDnsHostnames: true, enableDnsSupport: true, }),
      userVpcProps: props.vpcProps,
    });

    if (props.existingHostedZoneInterface) {
      this.hostedZone = props.existingHostedZoneInterface;
    } else {
      if (props.publicApi) {
        throw new Error('Public APIs require an existingHostedZone be passed in the Props object.');
      } else {
        if (!props.privateHostedZoneProps) {
          throw new Error('Must supply privateHostedZoneProps to create a private API');
        }
        if (props.privateHostedZoneProps.vpc) {
          throw new Error('All VPC specs must be provided at the Construct level in Route53ToAlbProps');
        }
        const manufacturedProps: r53.PrivateHostedZoneProps = defaults.overrideProps(props.privateHostedZoneProps, { vpc: this.vpc });
        this.hostedZone = new r53.PrivateHostedZone(this, `${id}-zone`, manufacturedProps);
      }
    }

    this.loadBalancer = defaults.ObtainAlb(this, id, {
      vpc: this.vpc,
      publicApi: props.publicApi,
      existingLoadBalancerObj: props.existingLoadBalancerObj,
      loadBalancerProps: props.loadBalancerProps,
      logAccessLogs: props.logAlbAccessLogs,
      loggingBucketProps: props.albLoggingBucketProps
    });

    // Add the ALB to the HostedZone as a target
    const hostedZoneTarget = new r53t.LoadBalancerTarget(this.loadBalancer);

    const arecordId = `${id}-alias`;
    const arecordProps: r53.ARecordProps = {
      target: { aliasTarget: hostedZoneTarget },
      zone: this.hostedZone
    };

    // Before turning off SonarQube for the line, reduce the line to it's minimum
    new r53.ARecord(this, arecordId, arecordProps); // NOSONAR
  }

  private PropsCustomCheck(props: Route53ToAlbProps) {
    if (props?.loadBalancerProps?.vpc) {
      throw new Error('Specify any existing VPC at the construct level, not within loadBalancerProps.');
    }

    if (props.existingLoadBalancerObj && !props.existingVpc) {
      throw new Error('An existing ALB already exists in a VPC, so that VPC must be passed to the construct in props.existingVpc');
    }
  }
}
