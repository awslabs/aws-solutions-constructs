/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as ec2 from "@aws-cdk/aws-ec2";
import { buildEncryptionKey } from "./kms-helper";
import { DefaultSagemakerNotebookProps } from "./sagemaker-defaults";
import * as cdk from "@aws-cdk/core";
import { overrideProps } from "./utils";
import { buildVpc } from './vpc-helper';
import * as iam from '@aws-cdk/aws-iam';
import { Aws } from "@aws-cdk/core";
import { DefaultPublicPrivateVpcProps } from "./vpc-defaults";

export interface BuildSagemakerNotebookProps {
  /**
   * Optional user provided props for CfnNotebookInstanceProps
   *
   * @default - Default props are used
   */
  readonly sagemakerNotebookProps?: sagemaker.CfnNotebookInstanceProps | any;
  /**
   * Optional user provided props to deploy inside vpc
   *
   * @default - true
   */
  readonly deployInsideVpc?: boolean;
  /**
   * An optional, Existing instance of notebook object.
   * If this is set then the sagemakerNotebookProps is ignored
   *
   * @default - None
   */
  readonly existingNotebookObj?: sagemaker.CfnNotebookInstance,
  /**
   * IAM Role Arn for SageMaker NoteBookInstance
   *
   * @default - None
   */
  readonly role: iam.Role
}

function addPermissions(_role: iam.Role) {

  // Grant permissions to NoteBookInstance for creating and training the model
  _role.addToPolicy(new iam.PolicyStatement({
    resources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`],
    actions: [
      "sagemaker:CreateTrainingJob",
      "sagemaker:DescribeTrainingJob",
      "sagemaker:CreateModel",
      "sagemaker:DescribeModel",
      "sagemaker:DeleteModel",
      "sagemaker:CreateEndpoint",
      "sagemaker:CreateEndpointConfig",
      "sagemaker:DescribeEndpoint",
      "sagemaker:DescribeEndpointConfig",
      "sagemaker:DeleteEndpoint",
      "sagemaker:DeleteEndpointConfig",
      "sagemaker:InvokeEndpoint"
    ],
  }));

  // Grant CloudWatch Logging permissions
  _role.addToPolicy(new iam.PolicyStatement({
    resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/sagemaker/*`],
    actions: [
      'logs:CreateLogGroup',
      'logs:CreateLogStream',
      'logs:DescribeLogStreams',
      'logs:GetLogEvents',
      'logs:PutLogEvents'
    ],
  }));

  // Grant GetRole permissions to the SageMaker service
  _role.addToPolicy(new iam.PolicyStatement({
    resources: [_role.roleArn],
    actions: [
      'iam:GetRole'
    ],
  }));

  // Grant PassRole permissions to the SageMaker service
  _role.addToPolicy(new iam.PolicyStatement({
    resources: [_role.roleArn],
    actions: [
      'iam:PassRole'
    ],
    conditions: {
      StringLike: {'iam:PassedToService': 'sagemaker.amazonaws.com'}
    },
  }));

}

export function buildSagemakerNotebook(scope: cdk.Construct, props: BuildSagemakerNotebookProps): [sagemaker.CfnNotebookInstance, ec2.IVpc?,
                                        ec2.SecurityGroup?] {
  // Setup the notebook properties
  let sagemakerNotebookProps;
  let vpcInstance;
  let securityGroup;
  let kmsKeyId: string;
  let subnetId: string;

  // Conditional Sagemaker Notebook creation
  if (!props.existingNotebookObj) {
    if ((props.sagemakerNotebookProps?.subnetId && props.sagemakerNotebookProps?.securityGroupIds === undefined) ||
        (props.sagemakerNotebookProps?.subnetId === undefined && props.sagemakerNotebookProps?.securityGroupIds)) {
      throw new Error('Must define both sagemakerNotebookProps.subnetId and sagemakerNotebookProps.securityGroupIds');
    }

    addPermissions(props.role);

    if (props.sagemakerNotebookProps?.kmsKeyId === undefined) {
      kmsKeyId = buildEncryptionKey(scope).keyId;
    } else {
      kmsKeyId = props.sagemakerNotebookProps.kmsKeyId;
    }

    if (props.deployInsideVpc === undefined || props.deployInsideVpc) {
      if (props.sagemakerNotebookProps?.subnetId === undefined && props.sagemakerNotebookProps?.securityGroupIds === undefined) {
        vpcInstance = buildVpc(scope, {
          defaultVpcProps: DefaultPublicPrivateVpcProps()
        });
        securityGroup = new ec2.SecurityGroup(scope, "SecurityGroup", {
          vpc: vpcInstance,
          allowAllOutbound: false
        });
        securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

        // Add Cfn_Nag Suppression for WARN W5: Security Groups found with cidr open to world on egress
        const cfnSecurityGroup = securityGroup.node.findChild('Resource') as ec2.CfnSecurityGroup;
        cfnSecurityGroup.cfnOptions.metadata = {
          cfn_nag: {
            rules_to_suppress: [{
              id: 'W5',
              reason: 'Allow notebook users to access the Internet from the notebook'
            }]
          }
        };

        subnetId = vpcInstance.privateSubnets[0].subnetId;

        sagemakerNotebookProps = DefaultSagemakerNotebookProps(props.role.roleArn, kmsKeyId, subnetId, [securityGroup.securityGroupId]);
      } else {
        sagemakerNotebookProps = DefaultSagemakerNotebookProps(props.role.roleArn, kmsKeyId,
                                                              props.sagemakerNotebookProps?.subnetId, props.sagemakerNotebookProps?.securityGroupIds);
      }
    } else {
      sagemakerNotebookProps = DefaultSagemakerNotebookProps(props.role.roleArn, kmsKeyId);
    }

    if (props.sagemakerNotebookProps) {
      sagemakerNotebookProps = overrideProps(sagemakerNotebookProps, props.sagemakerNotebookProps);
    }

    // Create the notebook
    const sagemakerInstance: sagemaker.CfnNotebookInstance = new sagemaker.CfnNotebookInstance(scope, "SagemakerNotebook", sagemakerNotebookProps);
    if (vpcInstance) {
      return [sagemakerInstance, vpcInstance, securityGroup];
    } else {
      return [sagemakerInstance];
    }
  } else {
    // Return existing notebook object
    return [props.existingNotebookObj];
  }
}
