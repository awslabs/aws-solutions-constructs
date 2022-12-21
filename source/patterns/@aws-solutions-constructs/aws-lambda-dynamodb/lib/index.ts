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

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as defaults from '@aws-solutions-constructs/core';
import * as ec2 from "aws-cdk-lib/aws-ec2";
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * @summary The properties for the LambdaToDynamoDB Construct
 */
export interface LambdaToDynamoDBProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps;
  /**
   * Existing instance of DynamoDB table object, providing both this and `dynamoTableProps` will cause an error.
   *
   * @default - None
   */
  readonly existingTableObj?: dynamodb.Table;
  /**
   * Optional table permissions to grant to the Lambda function.
   * One of the following may be specified: "All", "Read", "ReadWrite", "Write".
   *
   * @default - Read/write access is given to the Lambda function if no value is specified.
   */
  readonly tablePermissions?: string;
  /**
   * Optional Name for the Lambda function environment variable set to the name of the DynamoDB table.
   *
   * @default - DDB_TABLE_NAME
   */
  readonly tableEnvironmentVariableName?: string;
  /**
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Whether to deploy a new VPC
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
}

export class LambdaToDynamoDB extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly dynamoTable: dynamodb.Table;
  public readonly vpc?: ec2.IVpc;

  /**
   * @summary Constructs a new instance of the LambdaToDynamoDB class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToDynamoDBProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToDynamoDBProps) {
    super(scope, id);
    defaults.CheckProps(props);

    // Other permissions for constructs are accepted as arrays, turning tablePermissions into
    // an array to use the same validation function.
    if (props.tablePermissions) {
      defaults.CheckListValues(['All', 'Read', 'ReadWrite', 'Write'], [props.tablePermissions], 'table permission');
    }

    if (props.deployVpc || props.existingVpc) {
      if (props.deployVpc && props.existingVpc) {
        throw new Error("More than 1 VPC specified in the properties");
      }

      this.vpc = defaults.buildVpc(scope, {
        defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
        existingVpc: props.existingVpc,
        userVpcProps: props.vpcProps,
        constructVpcProps: {
          enableDnsHostnames: true,
          enableDnsSupport: true,
        },
      });

      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.DYNAMODB);
    }

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc
    });

    // Since we are only invoking this function with an existing Table or tableProps,
    // (not a table interface), we know that the implementation will always return
    // a Table object and we can safely cast away the optional aspect of the type.
    this.dynamoTable = defaults.buildDynamoDBTable(this, {
      dynamoTableProps: props.dynamoTableProps,
      existingTableObj: props.existingTableObj
    })[1] as dynamodb.Table;

    // Configure environment variables
    const tableEnvironmentVariableName = props.tableEnvironmentVariableName || 'DDB_TABLE_NAME';
    this.lambdaFunction.addEnvironment(tableEnvironmentVariableName, this.dynamoTable.tableName);

    // Add the requested or default table permissions
    if (props.tablePermissions) {
      const _permissions = props.tablePermissions.toUpperCase();
      if (_permissions === 'ALL') {
        this.dynamoTable.grantFullAccess(this.lambdaFunction.grantPrincipal);
      } else if (_permissions  ===  'READ') {
        this.dynamoTable.grantReadData(this.lambdaFunction.grantPrincipal);
      } else if (_permissions  ===  'READWRITE') {
        this.dynamoTable.grantReadWriteData(this.lambdaFunction.grantPrincipal);
      } else if (_permissions  ===  'WRITE') {
        this.dynamoTable.grantWriteData(this.lambdaFunction.grantPrincipal);
      }
    } else {
      this.dynamoTable.grantReadWriteData(this.lambdaFunction.grantPrincipal);
    }

    // Conditional metadata for cfn_nag
    if (props.dynamoTableProps?.billingMode === dynamodb.BillingMode.PROVISIONED) {
      defaults.addCfnSuppressRules(this.dynamoTable, [
        {
          id: "W73",
          reason: `PROVISIONED billing mode is a default and is not explicitly applied as a setting.`,
        },
      ]);

    }
  }
}
