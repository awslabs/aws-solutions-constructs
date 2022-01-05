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

// Imports
import * as api from '@aws-cdk/aws-apigateway';
import * as route53 from "@aws-cdk/aws-route53";
import * as targets from '@aws-cdk/aws-route53-targets';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as defaults from '@aws-solutions-constructs/core';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';

/**
 * The properties for the Route53ToApiGateway class.
 */
export interface Route53ToApiGatewayProps {
  /**
   * Whether to create a public or private API. This value has implications
   * for the VPC, the type of Hosted Zone and the Application Load Balancer
   *
   * @default - None
   */
  readonly publicApi: boolean
  /**
   * Optional custom properties for a new Private Hosted Zone. Cannot be specified for a
   * public API. Cannot specify a VPC, it will use the VPC in existingVpc or the VPC created by the construct.
   * Providing both this and existingHostedZoneInterface is an error.
   *
   * @default - None
   */
  readonly privateHostedZoneProps?: route53.PrivateHostedZoneProps | any,
  /**
   * Existing Public or Private Hosted Zone. If a Private Hosted Zone, must
   * exist in the same VPC specified in existingVpc
   *
   * @default - None
   */
  readonly existingHostedZoneInterface?: route53.IHostedZone,
  /**
   * An existing VPC. Providing both this and vpcProps is an error. If an existing
   * Private Hosted Zone is provided, this value must be the VPC associated with those resources.
   *
   * @default - None
   */
  readonly existingVpc?: ec2.IVpc,
  /**
   * The existing API Gateway instance that will be protected with the WAF web ACL.
   *
   * @default - None
   */
  readonly existingApiGatewayInterface: api.IRestApi,
  /**
   * An existing AWS Certificate Manager certificate for your custom domain name.
   *
   * @defualt - None
   */
  readonly existingCertificateInterface?: certificatemanager.ICertificate;
}

/**
 * @summary The Route53ToApiGateway class.
 */
export class Route53ToApiGateway extends Construct {
  public readonly hostedZone: route53.IHostedZone;
  public readonly vpc?: ec2.IVpc;
  public readonly apiGateway: api.RestApi;
  public readonly certificate: certificatemanager.ICertificate;
  /**
   * @summary Constructs a new instance of the Route53ToApiGateway class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {Route53ToApiGatewayProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: Route53ToApiGatewayProps) {
    super(scope, id);
    defaults.CheckProps(props);

    if (props.existingVpc) {
      this.vpc = props.existingVpc;
    }

    // Existing Public or Private Hosted Zone
    if (props.existingHostedZoneInterface) {
      this.hostedZone = props.existingHostedZoneInterface;

      if (props.existingVpc) {
        throw new Error('Cannot provide an existing VPC to an existing Private Hosted Zone.');
      }
      if (props.privateHostedZoneProps) {
        throw new Error('Must provide either existingHostedZoneInterface or privateHostedZoneProps.');
      }
    } else { // Creating a Private Hosted Zone
      if (props.publicApi) {
        throw new Error('Public APIs require an existingHostedZone be passed in the Props object.');
      } else {
        if (!props.privateHostedZoneProps) {
          throw new Error('Must supply privateHostedZoneProps to create a private API');
        }
        if (props.privateHostedZoneProps.vpc) {
          throw new Error('All VPC specs must be provided at the Construct level in Route53ToApiGatewayProps');
        }
        const manufacturedProps: route53.PrivateHostedZoneProps = defaults.overrideProps(props.privateHostedZoneProps, { vpc: this.vpc });
        this.hostedZone = new route53.PrivateHostedZone(this, `${id}-zone`, manufacturedProps);
      }
    }

    // Create certificate and validate CNAME Record with DNS
    if (props.existingCertificateInterface) { // Certificate must already be issued if user is bringing an existing one
      this.certificate = props.existingCertificateInterface;
    } else {
      this.certificate = new certificatemanager.Certificate(this, 'Certificate', {
        domainName: this.hostedZone.zoneName,
        validation: certificatemanager.CertificateValidation.fromDns(this.hostedZone),
      });
    }

    // Convert IRestApi to RestApi
    this.apiGateway = props.existingApiGatewayInterface as api.RestApi;

    // Add custom domain name in API Gateway
    this.apiGateway.addDomainName('CustomDomainName', {
      domainName: this.hostedZone.zoneName,
      certificate: this.certificate
    });

    // Create A Record in custom domain to route traffic to API Gateway
    new route53.ARecord(this, 'CustomDomainAliasRecord', {
      zone: this.hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(this.apiGateway))
    });
  }
}