/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { Construct } from 'constructs';
import { Stack, StackProps, Duration, Fn, Aws, CustomResource } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Cors } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';

export class ServerlessBackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucketName: string = Fn.importValue('websiteBucket');

    const construct = new CognitoToApiGatewayToLambda(this, 'CognitoToApiGatewayToLambda', {
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(`${__dirname}/lambda/business-logic`),
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler'
      },
      cognitoUserPoolProps: {
        userPoolName: 'WileRydes',
        userVerification: {},
        autoVerify: {
          email: true
        },
        selfSignUpEnabled: true
      },
      apiGatewayProps: {
        defaultCorsPreflightOptions: {
          allowOrigins: Cors.ALL_ORIGINS,
          allowMethods: Cors.ALL_METHODS
        }
      }
    });

    const lambdaFunc = new lambda.Function(this, 'updateConfigHandler', {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'update_s3_object.on_event',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/cognito-config`),
      timeout: Duration.minutes(5),
      initialPolicy: [
        new PolicyStatement({
          actions: ["s3:PutObject",
                    "s3:PutObjectAcl",
                    "s3:PutObjectVersionAcl"],
          resources: [`arn:${Aws.PARTITION}:s3:::${websiteBucketName}/*`]
        }),
      ]
    });

    const customResourceProvider = new Provider(this, 'CustomResourceProvider', {
      onEventHandler: lambdaFunc
    });

    new CustomResource(this, 'CustomResource', {
      serviceToken: customResourceProvider.serviceToken,
      properties: {
        UserPool: construct.userPool.userPoolId,
        Client: construct.userPoolClient.userPoolClientId,
        Region: Stack.of(this).region,
        Bucket: websiteBucketName,
        RestApi: construct.apiGateway.url
      }
    });

    new LambdaToDynamoDB(this, 'LambdaToDynamoDB', {
      existingLambdaObj: construct.lambdaFunction,
      dynamoTableProps: {
        tableName: 'Rides',
        partitionKey: {
            name: 'RideId',
            type: AttributeType.STRING
        }
      }
    });
  }
}