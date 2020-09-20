/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as sagemaker from "@aws-cdk/aws-sagemaker";
import * as kms from "@aws-cdk/aws-kms";
import * as ec2 from "@aws-cdk/aws-ec2";
import { buildEncryptionKey } from "./kms-helper";
import { DefaultSagemakerNotebookProps } from "./sagemaker-defaults";
import * as cdk from "@aws-cdk/core";
import { overrideProps } from "./utils";

export interface BuildSagemakerNotebookProps {
  readonly sagemakerNotebookProps?: sagemaker.CfnNotebookInstanceProps;
  /**
   * Optional user provided props to deploy inside vpc
   *
   * @default - true
   */
  readonly deployInsideVpc?: boolean;
  /**
   * Optional user provided props of subnet ids for vpc configuration
   *
   * @default - true
   */
  readonly subnetId?: string;
  /**
   * Optional user provided props of security group ids for vpc configuration
   *
   * @default - true
   */
  readonly securityGroupIds?: string[];
  /**
   * Use a KMS Key, either managed by this CDK app, or imported. If importing an encryption key, it must be specified in
   * the encryptionKey property for this construct.
   *
   * @default - true (encryption enabled, managed by this CDK app).
   */
  readonly enableEncryption?: boolean;
  /**
   * An optional, imported encryption key to encrypt the Sagemaker Notebook with.
   *
   * @default - not specified.
   */
  readonly encryptionKey?: kms.Key;
  /**
   * Existing instance of notebook object.
   * If this is set then the sagemakerNotebookProps is ignored
   *
   * @default - None
   */
  readonly existingNotebookObj?: sagemaker.CfnNotebookInstance
}

export function buildSagemakerNotebook(scope: cdk.Construct, _roleArn: string, props?: BuildSagemakerNotebookProps): sagemaker.CfnNotebookInstance {
  // Setup the notebook properties
  let sagemakerNotebookProps;
  let vpcInstance: ec2.Vpc;
  let egressSecurityGroup: ec2.SecurityGroup;
  let ingressSecurityGroup: ec2.SecurityGroup;

  // Conditional Sagemaker Notebook creation
  if (!props?.existingNotebookObj) {
    if (props) {
      if (props.sagemakerNotebookProps) {
        // If property overrides have been provided, incorporate them and deploy
        sagemakerNotebookProps = overrideProps(
          DefaultSagemakerNotebookProps(_roleArn),
          props.sagemakerNotebookProps
        );
      } else {
        // If no property overrides, deploy using the default configuration
        sagemakerNotebookProps = DefaultSagemakerNotebookProps(_roleArn);
      }
      // Set up VPC, Subnet, and Security Group ID
      if (props.deployInsideVpc || props.deployInsideVpc !== false) {
        if ((props.subnetId && !props.securityGroupIds) || (!props.subnetId && props.securityGroupIds)) {
          throw new Error('Must define both props.subnetId and props.securityGroupIds');
        }
        if (props.subnetId && props.securityGroupIds) {
          sagemakerNotebookProps.subnetId = props.subnetId;
          sagemakerNotebookProps.securityGroupIds = props.securityGroupIds;
        } else {
          vpcInstance = new ec2.Vpc(scope, "Vpc", {
            cidr: "10.0.0.0/16",
            maxAzs: 1,
            subnetConfiguration: [
              {
                cidrMask: 24,
                name: "isolatedSubnet",
                subnetType: ec2.SubnetType.ISOLATED,
              },
            ],
            natGateways: 0
          });

          sagemakerNotebookProps.subnetId = vpcInstance.isolatedSubnets[0].subnetId;
          ingressSecurityGroup = new ec2.SecurityGroup(scope, 'ingress-security-group', {
            vpc: vpcInstance,
            allowAllOutbound: false
          });
          ingressSecurityGroup.addIngressRule(ec2.Peer.ipv4('10.0.0.0/16'), ec2.Port.tcp(3306));
          egressSecurityGroup = new ec2.SecurityGroup(scope, "SecurityGroup", {
            vpc: vpcInstance,
            allowAllOutbound: false
          });
          egressSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
          vpcInstance.addFlowLog('FlowLog');
          sagemakerNotebookProps.securityGroupIds = [ingressSecurityGroup.securityGroupId, egressSecurityGroup.securityGroupId];
        }
      }

      // Set encryption properties
      if ((!props.enableEncryption || props.enableEncryption === true) && props.enableEncryption !== false) {
        if (props.encryptionKey) {
          sagemakerNotebookProps.kmsKeyId = props.encryptionKey.keyId;
        } else {
          sagemakerNotebookProps.kmsKeyId = buildEncryptionKey(scope).keyId;
        }
      }
    } else {
      // If no property overrides, deploy using the default configuration
      sagemakerNotebookProps = DefaultSagemakerNotebookProps(_roleArn);
    }

    // Create the notebook and return
    return new sagemaker.CfnNotebookInstance(scope, "SagemakerNotebook", sagemakerNotebookProps);
  } else {
      // Return existing notebook object
      return props.existingNotebookObj;
  }
}
