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

import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { buildEncryptionKey } from './kms-helper';
import {
  DefaultSagemakerNotebookProps,
  DefaultSagemakerModelProps,
  DefaultSagemakerEndpointConfigProps,
  DefaultSagemakerEndpointProps,
} from './sagemaker-defaults';
import * as cdk from 'aws-cdk-lib';
import { addCfnSuppressRules, consolidateProps } from './utils';
import { buildVpc } from './vpc-helper';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Aws } from 'aws-cdk-lib';
import { DefaultPublicPrivateVpcProps } from './vpc-defaults';
import { buildSecurityGroup } from './security-group-helper';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

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
  readonly existingNotebookObj?: sagemaker.CfnNotebookInstance;
  /**
   * IAM Role Arn for Sagemaker NoteBookInstance
   *
   * @default - None
   */
  readonly role: iam.Role;
}

function addPermissions(role: iam.Role, props?: BuildSagemakerEndpointProps) {
  // Grant permissions to NoteBookInstance for creating and training the model
  role.addToPolicy(
    new iam.PolicyStatement({
      resources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`],
      actions: [
        'sagemaker:CreateTrainingJob',
        'sagemaker:DescribeTrainingJob',
        'sagemaker:CreateModel',
        'sagemaker:DescribeModel',
        'sagemaker:DeleteModel',
        'sagemaker:CreateEndpoint',
        'sagemaker:CreateEndpointConfig',
        'sagemaker:DescribeEndpoint',
        'sagemaker:DescribeEndpointConfig',
        'sagemaker:DeleteEndpoint',
        'sagemaker:DeleteEndpointConfig',
        'sagemaker:InvokeEndpoint',
      ],
    })
  );

  // Grant CloudWatch Logging permissions
  role.addToPolicy(
    new iam.PolicyStatement({
      resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/sagemaker/*`],
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:DescribeLogStreams',
        'logs:GetLogEvents',
        'logs:PutLogEvents',
      ],
    })
  );

  // To place the Sagemaker endpoint in a VPC
  if (props && props.vpc) {
    role.addToPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: [
          'ec2:CreateNetworkInterface',
          'ec2:CreateNetworkInterfacePermission',
          'ec2:DeleteNetworkInterface',
          'ec2:DeleteNetworkInterfacePermission',
          'ec2:DescribeNetworkInterfaces',
          'ec2:AssignPrivateIpAddresses',
          'ec2:UnassignPrivateIpAddresses',
          'ec2:DescribeVpcs',
          'ec2:DescribeDhcpOptions',
          'ec2:DescribeSubnets',
          'ec2:DescribeSecurityGroups',
        ],
      })
    );
  }

  // To create a Sagemaker model using Bring-Your-Own-Model (BYOM) algorithm image
  // The image URL is specified in the modelProps
  role.addToPolicy(
    new iam.PolicyStatement({
      resources: [`arn:${cdk.Aws.PARTITION}:ecr:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:repository/*`],
      actions: [
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:DescribeRepositories',
        'ecr:DescribeImages',
        'ecr:BatchGetImage',
      ],
    })
  );

  // Add GetAuthorizationToken (it can not be bound to resources other than *)
  role.addToPolicy(
    new iam.PolicyStatement({
      resources: ['*'],
      actions: ['ecr:GetAuthorizationToken'],
    })
  );

  // add permission to use Elastic Inference accelerator
  if (props && props.endpointConfigProps) {
    // Get the acceleratorType, if any
    const acceleratorType = (props.endpointConfigProps
      ?.productionVariants as sagemaker.CfnEndpointConfig.ProductionVariantProperty[])[0].acceleratorType;
    if (acceleratorType !== undefined) {
      role.addToPolicy(
        new iam.PolicyStatement({
          resources: ['*'],
          actions: ['elastic-inference:Connect'],
        })
      );
    }
  }

  // add kms permissions
  role.addToPolicy(
    new iam.PolicyStatement({
      // the kmsKeyId in the endpointConfigProps can be any of the following formats:
      // Key ID: 1234abcd-12ab-34cd-56ef-1234567890ab
      // Key ARN: arn:aws:kms:<region>:<accountID>:key/1234abcd-12ab-34cd-56ef-1234567890ab
      // Alias name: alias/ExampleAlias
      // Alias name ARN: arn:aws:kms:<region>:<accountID>:alias/ExampleAlias
      // the key is used to encrypt/decrypt data captured by the Sagemaker endpoint and stored in S3 bucket
      resources: [
        `arn:${cdk.Aws.PARTITION}:kms:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:key/*`,
        `arn:${cdk.Aws.PARTITION}:kms:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:alias/*`,
      ],
      actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:DescribeKey'],
    })
  );

  // Add S3 permissions to get Model artifact, put data capture files, etc.
  role.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  // Grant GetRole permissions to the Sagemaker service
  role.addToPolicy(
    new iam.PolicyStatement({
      resources: [role.roleArn],
      actions: ['iam:GetRole'],
    })
  );

  // Grant PassRole permissions to the Sagemaker service
  role.addToPolicy(
    new iam.PolicyStatement({
      resources: [role.roleArn],
      actions: ['iam:PassRole'],
      conditions: {
        StringLike: { 'iam:PassedToService': 'sagemaker.amazonaws.com' },
      },
    })
  );

  // Add CFN NAG uppress to allow for "Resource": "*" for ENI access in VPC,
  // ECR authorization token for custom model images, and elastic inference
  // Add CFN NAG for Complex Role because Sagmaker needs permissions to access several services
  const roleDefaultPolicy = role.node.tryFindChild('DefaultPolicy')?.node.findChild('Resource') as iam.CfnPolicy;
  addCfnSuppressRules(roleDefaultPolicy, [
    {
      id: 'W12',
      reason: `Sagemaker needs the following minimum required permissions to access ENIs in a VPC, ECR for custom model images, and elastic inference.`,
    },
    {
      id: 'W76',
      reason: 'Complex role becuase Sagemaker needs permissions to access several services',
    }
  ]);
}

export interface BuildSagemakerNotebookResponse {
  readonly notebook: sagemaker.CfnNotebookInstance,
  readonly vpc?: ec2.IVpc,
  readonly securityGroup?: ec2.SecurityGroup
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildSagemakerNotebook(
  scope: Construct,
  id: string,
  props: BuildSagemakerNotebookProps
): BuildSagemakerNotebookResponse {
  // Setup the notebook properties
  let sagemakerNotebookProps;
  let vpcInstance;
  let securityGroup;
  let kmsKeyId: string;
  let subnetId: string;

  // Conditional Sagemaker Notebook creation
  if (props.existingNotebookObj) {
    return { notebook: props.existingNotebookObj };
  }

  if (CheckNotebookVpcProps(props)) {
    throw new Error('Must define both sagemakerNotebookProps.subnetId and sagemakerNotebookProps.securityGroupIds');
  }

  addPermissions(props.role);

  if (props.sagemakerNotebookProps?.kmsKeyId === undefined) {
    kmsKeyId = buildEncryptionKey(scope,  id).keyId;
  } else {
    kmsKeyId = props.sagemakerNotebookProps.kmsKeyId;
  }

  if (props.deployInsideVpc === undefined || props.deployInsideVpc) {
    if (
      props.sagemakerNotebookProps?.subnetId === undefined &&
      props.sagemakerNotebookProps?.securityGroupIds === undefined
    ) {
      vpcInstance = buildVpc(scope, {
        defaultVpcProps: DefaultPublicPrivateVpcProps(),
      });
      securityGroup = buildSecurityGroup(
        scope,
        'SecurityGroup',
        {
          vpc: vpcInstance,
          allowAllOutbound: false,
        },
        [],
        [{ peer: ec2.Peer.anyIpv4(), connection: ec2.Port.tcp(443) }]
      );

      subnetId = vpcInstance.privateSubnets[0].subnetId;

      sagemakerNotebookProps = DefaultSagemakerNotebookProps(props.role.roleArn, kmsKeyId, subnetId, [
        securityGroup.securityGroupId,
      ]);
    } else {
      sagemakerNotebookProps = DefaultSagemakerNotebookProps(
        props.role.roleArn,
        kmsKeyId,
        props.sagemakerNotebookProps?.subnetId,
        props.sagemakerNotebookProps?.securityGroupIds
      );
    }
  } else {
    sagemakerNotebookProps = DefaultSagemakerNotebookProps(props.role.roleArn, kmsKeyId);
  }

  sagemakerNotebookProps = consolidateProps(sagemakerNotebookProps, props.sagemakerNotebookProps);

  // Create the notebook
  // NOSONAR: (typescript:S6319)
  // keyID is created above in the if (props.sagemakerNotebookProps?.kmsKeyId === undefined)
  // block. It is then passed to DefaultSagemakerNotebookProps()
  // This behavior is validated in unit test
  const sagemakerInstance: sagemaker.CfnNotebookInstance = new sagemaker.CfnNotebookInstance(
    scope,
    'SagemakerNotebook',
    sagemakerNotebookProps // NOSONAR
  );
  if (vpcInstance) {
    return { notebook: sagemakerInstance, vpc: vpcInstance, securityGroup };
  } else {
    return { notebook: sagemakerInstance };
  }
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
function CheckNotebookVpcProps(props: BuildSagemakerNotebookProps): boolean {
  if ((props.sagemakerNotebookProps?.subnetId && props.sagemakerNotebookProps?.securityGroupIds === undefined) ||
    (props.sagemakerNotebookProps?.subnetId === undefined && props.sagemakerNotebookProps?.securityGroupIds)
  ) {
    return true;
  }
  return false;
}

export interface BuildSagemakerEndpointProps {
  /**
   * Existing Sagemaker Endpoint object, if this is set then the modelProps, endpointConfigProps, and endpointProps are ignored
   *
   * @default - None
   */
  readonly existingSagemakerEndpointObj?: sagemaker.CfnEndpoint;
  /**
   * User provided props to create Sagemaker Model
   *
   * @default - None
   */
  readonly modelProps?: sagemaker.CfnModelProps | any;
  /**
   * User provided props to create Sagemaker Endpoint Configuration
   *
   * @default - None
   */
  readonly endpointConfigProps?: sagemaker.CfnEndpointConfigProps;
  /**
   * User provided props to create Sagemaker Endpoint
   *
   * @default - None
   */
  readonly endpointProps?: sagemaker.CfnEndpointProps;
  /**
   * A VPC where the Sagemaker Endpoint will be placed
   *
   * @default - None
   */
  readonly vpc?: ec2.IVpc;
}

export interface BuildSagemakerEndpointResponse {
  readonly endpoint: sagemaker.CfnEndpoint,
  readonly endpointConfig?: sagemaker.CfnEndpointConfig,
  readonly model?: sagemaker.CfnModel
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function BuildSagemakerEndpoint(
  scope: Construct,
  id: string,
  props: BuildSagemakerEndpointProps
): BuildSagemakerEndpointResponse {
  /** Conditional Sagemaker endpoint creation */
  if (!props.existingSagemakerEndpointObj) {
    if (props.modelProps) {
      const deploySagemakerEndpointResponse = deploySagemakerEndpoint(scope, id, props);
      return { ...deploySagemakerEndpointResponse };
    } else {
      throw Error('Either existingSagemakerEndpointObj or at least modelProps is required');
    }
  } else {
    /** Otherwise, return [endpoint] */
    return { endpoint: props.existingSagemakerEndpointObj };
  }
}

export interface DeploySagemakerEndpointResponse {
  readonly endpoint: sagemaker.CfnEndpoint,
  readonly endpointConfig?: sagemaker.CfnEndpointConfig,
  readonly model?: sagemaker.CfnModel
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function deploySagemakerEndpoint(
  scope: Construct,
  id: string,
  props: BuildSagemakerEndpointProps
): DeploySagemakerEndpointResponse {
  let model: sagemaker.CfnModel;
  let endpointConfig: sagemaker.CfnEndpointConfig;
  let endpoint: sagemaker.CfnEndpoint;
  let sagemakerRole: iam.Role;

  // Create Sagemaker's model, endpointConfig, and endpoint
  if (props.modelProps) {
    // Check if the client has provided executionRoleArn
    if (props.modelProps.executionRoleArn) {
      sagemakerRole = iam.Role.fromRoleArn(
        scope,
        'SagemakerRoleCustomer',
        props.modelProps.executionRoleArn
      ) as iam.Role;
    } else {
      // Create the Sagemaker Role
      sagemakerRole = new iam.Role(scope, 'SagemakerRole', {
        assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      });
      // Add required permissions
      addPermissions(sagemakerRole, props);
    }

    // Create Sagemaker Model
    model = createSagemakerModel(scope, props.modelProps, sagemakerRole, props.vpc);
    // Create Sagemaker EndpointConfig
    endpointConfig = createSagemakerEndpointConfig(scope, `${id}`, model.attrModelName, props.endpointConfigProps);
    // Add dependency on model
    endpointConfig.addDependency(model);
    // Create Sagemaker Endpoint
    endpoint = createSagemakerEndpoint(scope, endpointConfig.attrEndpointConfigName, props.endpointProps);
    // Add dependency on EndpointConfig
    endpoint.addDependency(endpointConfig);

    return { endpoint, endpointConfig, model };
  } else {
    throw Error('You need to provide at least modelProps to create Sagemaker Endpoint');
  }
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function createSagemakerModel(
  scope: Construct,
  modelProps: sagemaker.CfnModelProps,
  role: iam.Role,
  vpc?: ec2.IVpc
): sagemaker.CfnModel {
  let finalModelProps: sagemaker.CfnModelProps;
  let primaryContainer: sagemaker.CfnModel.ContainerDefinitionProperty;
  let vpcConfig: sagemaker.CfnModel.VpcConfigProperty | undefined;
  let model: sagemaker.CfnModel;

  if (vpc) {
    const modelDefaultSecurityGroup = new ec2.SecurityGroup(scope, 'ReplaceModelDefaultSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    // Allow https traffic from within the VPC
    modelDefaultSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(443));

    const cfnSecurityGroup = modelDefaultSecurityGroup.node.findChild('Resource') as ec2.CfnSecurityGroup;
    addCfnSuppressRules(cfnSecurityGroup, [
      {
        id: 'W5',
        reason: 'Egress of 0.0.0.0/0 is default and generally considered OK',
      },
      {
        id: 'W40',
        reason: 'Egress IPProtocol of -1 is default and generally considered OK',
      }
    ]);

    // Throw an error if the VPC does not contain private or isolated subnets
    if (vpc.privateSubnets.length === 0 && vpc.isolatedSubnets.length === 0) {
      throw Error('VPC must contain private or isolated subnets to deploy the Sagemaker endpoint in a vpc');
    }

    vpcConfig = {
      // default SubnetType.PRIVATE (or ISOLATED or PUBLIC if there are no PRIVATE subnets)
      // So, private subnets will be used if provided by customer. Otherwise, use the default isolated subnets,
      subnets: vpc.selectSubnets({
        onePerAz: true,
      }).subnetIds,
      securityGroupIds: [modelDefaultSecurityGroup.securityGroupId],
    };
  }

  if (modelProps.primaryContainer) {
    // Get user provided Model's primary container
    primaryContainer = modelProps.primaryContainer as sagemaker.CfnModel.ContainerDefinitionProperty;
    // Get default Model props
    finalModelProps = consolidateProps(DefaultSagemakerModelProps(role.roleArn, primaryContainer, vpcConfig), modelProps);

    // Create the Sagemaker's Model
    model = new sagemaker.CfnModel(scope, 'SagemakerModel', finalModelProps);
    // Add dependency on the Sagemaker's role
    model.node.addDependency(role);

    return model;
  } else {
    throw Error('You need to provide at least primaryContainer to create Sagemaker Model');
  }
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function createSagemakerEndpointConfig(
  scope: Construct,
  id: string,
  modelName: string,
  endpointConfigProps?: sagemaker.CfnEndpointConfigProps
): sagemaker.CfnEndpointConfig {
  let finalEndpointConfigProps: sagemaker.CfnEndpointConfigProps;
  let kmsKeyId: string;
  let endpointConfig: sagemaker.CfnEndpointConfig;

  // Create encryption key if one is not provided
  if (endpointConfigProps && endpointConfigProps.kmsKeyId) {
    kmsKeyId = endpointConfigProps.kmsKeyId;
  } else {
    kmsKeyId = buildEncryptionKey(scope, id).keyId;
  }

  // Overwrite default EndpointConfig properties
  finalEndpointConfigProps = consolidateProps(DefaultSagemakerEndpointConfigProps(modelName, kmsKeyId), endpointConfigProps);

  // Create the Sagemaker's EndpointConfig
  endpointConfig = new sagemaker.CfnEndpointConfig(scope, 'SagemakerEndpointConfig', finalEndpointConfigProps);

  return endpointConfig;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function createSagemakerEndpoint(
  scope: Construct,
  endpointConfigName: string,
  endpointProps?: sagemaker.CfnEndpointProps
): sagemaker.CfnEndpoint {
  let finalEndpointProps: sagemaker.CfnEndpointProps;
  let endpoint: sagemaker.CfnEndpoint;

  // Overwrite default Endpoint properties
  finalEndpointProps = consolidateProps(DefaultSagemakerEndpointProps(endpointConfigName), endpointProps);

  // Create the Sagemaker's Endpoint
  endpoint = new sagemaker.CfnEndpoint(scope, 'SagemakerEndpoint', finalEndpointProps);

  return endpoint;
}

export interface SagemakerProps {
  readonly existingSagemakerEndpointObj?: sagemaker.CfnEndpoint,
  readonly endpointProps?: sagemaker.CfnEndpointProps,
}

export function CheckSagemakerProps(propsObject: SagemakerProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.existingSagemakerEndpointObj && propsObject.endpointProps) {
    errorMessages += 'Error - Either provide endpointProps or existingSagemakerEndpointObj, but not both.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
