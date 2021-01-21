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

import * as api from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cognito from '@aws-cdk/aws-cognito';
import * as logs from '@aws-cdk/aws-logs';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the CognitoToApiGatewayToLambda Construct
 */
export interface CognitoToApiGatewayToLambdaProps {
  /**
   * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps
  /**
   * Optional user provided props to override the default props for the API Gateway.
   *
   * @default - Default props are used
   */
  readonly apiGatewayProps?: api.LambdaRestApiProps | any
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly cognitoUserPoolProps?: cognito.UserPoolProps
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly cognitoUserPoolClientProps?: cognito.UserPoolClientProps | any,
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps
}

export class CognitoToApiGatewayToLambda extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly apiGateway: api.RestApi;
  public readonly apiGatewayCloudWatchRole: iam.Role;
  public readonly apiGatewayLogGroup: logs.LogGroup;
  public readonly apiGatewayAuthorizer: api.CfnAuthorizer;
  public readonly lambdaFunction: lambda.Function;

  /**
   * @summary Constructs a new instance of the CognitoToApiGatewayToLambda class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CognitoToApiGatewayToLambdaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: CognitoToApiGatewayToLambdaProps) {
    super(scope, id);

    // This Construct requires that the auth type be COGNITO regardless of what is specified in the props
    if (props.apiGatewayProps) {
      if (props.apiGatewayProps.defaultMethodOptions === undefined) {
        props.apiGatewayProps.defaultMethodOptions = {
          authorizationType: api.AuthorizationType.COGNITO,
        };
      } else if (props.apiGatewayProps?.defaultMethodOptions.authorizationType === undefined) {
        props.apiGatewayProps.defaultMethodOptions.authorizationType = api.AuthorizationType.COGNITO;
      } else if (props.apiGatewayProps?.defaultMethodOptions.authorizationType !== 'COGNITO_USER_POOLS') {
        defaults.printWarning('Overriding Authorization type to be AuthorizationType.COGNITO');
        props.apiGatewayProps.defaultMethodOptions.authorizationType = api.AuthorizationType.COGNITO;
      }
    }

    if (props.apiGatewayProps && (typeof props.apiGatewayProps.proxy !== 'undefined') && (props.apiGatewayProps.proxy === false)) {
      defaults.printWarning('For non-proxy API, addAuthorizers() method must be called after all the resources and methods for API are fuly defined. Not calling addAuthorizers() will result in API methods NOT protected by Cognito.');
    }

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });
    [this.apiGateway, this.apiGatewayCloudWatchRole, this.apiGatewayLogGroup] =
      defaults.GlobalLambdaRestApi(this, this.lambdaFunction, props.apiGatewayProps, props.logGroupProps);
    this.userPool = defaults.buildUserPool(this, props.cognitoUserPoolProps);
    this.userPoolClient = defaults.buildUserPoolClient(this, this.userPool, props.cognitoUserPoolClientProps);

    this.apiGatewayAuthorizer = new api.CfnAuthorizer(this, 'CognitoAuthorizer', {
      restApiId: this.apiGateway.restApiId,
      type: 'COGNITO_USER_POOLS',
      providerArns: [this.userPool.userPoolArn],
      identitySource: "method.request.header.Authorization",
      name: "authorizer"
    });

    this.addAuthorizers();
  }

  public addAuthorizers() {
    this.apiGateway.methods.forEach((apiMethod) => {
      // Leave the authorizer NONE for HTTP OPTIONS method to support CORS, for the rest set it to COGNITO
      const child = apiMethod.node.findChild('Resource') as api.CfnMethod;
      if (apiMethod.httpMethod === 'OPTIONS') {
        child.addPropertyOverride('AuthorizationType', 'NONE');
      } else {
        child.addPropertyOverride('AuthorizationType', 'COGNITO_USER_POOLS');
        child.addPropertyOverride('AuthorizerId', { Ref: this.apiGatewayAuthorizer.logicalId });
      }
    });
  }
}
