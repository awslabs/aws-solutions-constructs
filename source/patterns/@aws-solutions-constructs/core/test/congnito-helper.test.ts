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

import { Stack } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as defaults from '../index';
import { Template } from 'aws-cdk-lib/assertions';

test('Test override for buildUserPool', () => {
  const stack = new Stack();

  const userpoolProps: cognito.UserPoolProps = {
    userPoolName: 'test',
    signInAliases: { username: false, email: true, phone: true }
  };

  defaults.buildUserPool(stack, userpoolProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Cognito::UserPool', {
    UsernameAttributes: [
      "email",
      "phone_number"
    ],
    UserPoolAddOns: {
      AdvancedSecurityMode: "ENFORCED"
    },
    UserPoolName: "test"
  });
});

test('Test override for buildUserPoolClient', () => {
  const stack = new Stack();

  const userpool = defaults.buildUserPool(stack);

  const userpoolclientProps: cognito.UserPoolClientProps = {
    userPoolClientName: 'test',
    userPool: userpool
  };

  defaults.buildUserPoolClient(stack, userpool, userpoolclientProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
    UserPoolId: {
      Ref: "CognitoUserPool53E37E69"
    },
    ClientName: "test"
  });
});

test('Test override for buildIdentityPool', () => {
  const stack = new Stack();

  const userpool = defaults.buildUserPool(stack);
  const userpoolclient = defaults.buildUserPoolClient(stack, userpool, {
    userPoolClientName: 'test',
    userPool: userpool
  });
  defaults.buildIdentityPool(stack, userpool, userpoolclient, {
    allowUnauthenticatedIdentities: true
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Cognito::IdentityPool', {
    AllowUnauthenticatedIdentities: true,
    CognitoIdentityProviders: [
      {
        ClientId: {
          Ref: "CognitoUserPoolClient5AB59AE4"
        },
        ProviderName: {
          "Fn::GetAtt": [
            "CognitoUserPool53E37E69",
            "ProviderName"
          ]
        },
        ServerSideTokenCheck: true
      }
    ]
  });
});

test('Test setupCognitoForSearchService', () => {
  const stack = new Stack();

  const userpool = defaults.buildUserPool(stack);
  const userpoolclient = defaults.buildUserPoolClient(stack, userpool, {
    userPoolClientName: 'test',
    userPool: userpool
  });
  const identitypool = defaults.buildIdentityPool(stack, userpool, userpoolclient);

  defaults.setupCognitoForSearchService(stack, 'test-domain', {
    userpool,
    userpoolclient,
    identitypool
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
    Domain: "test-domain"
  });

  template.hasResourceProperties('AWS::Cognito::IdentityPoolRoleAttachment', {
    IdentityPoolId: {
      Ref: "CognitoIdentityPool"
    },
    Roles: {
      authenticated: {
        "Fn::GetAtt": [
          "CognitoAuthorizedRole14E74FE0",
          "Arn"
        ]
      }
    }
  });

  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            "StringEquals": {
              "cognito-identity.amazonaws.com:aud": {
                Ref: "CognitoIdentityPool"
              }
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated"
            }
          },
          Effect: "Allow",
          Principal: {
            Federated: "cognito-identity.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    },
    Policies: [
      {
        PolicyDocument: {
          Statement: [
            {
              Action: "es:ESHttp*",
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":es:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":domain/test-domain/*"
                  ]
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "CognitoAccessPolicy"
      }
    ]
  });

});
