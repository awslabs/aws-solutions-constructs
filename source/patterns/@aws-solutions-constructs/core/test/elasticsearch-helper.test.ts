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

import { Stack } from '@aws-cdk/core';
import * as elasticsearch from '@aws-cdk/aws-elasticsearch';
import * as defaults from '../index';
import '@aws-cdk/assert/jest';
import * as iam from '@aws-cdk/aws-iam';

function deployES(stack: Stack, domainName: string, cfnDomainProps?: elasticsearch.CfnDomainProps,
  lambdaRoleARN?: string): [elasticsearch.CfnDomain, iam.Role] {
  const userpool = defaults.buildUserPool(stack);
  const userpoolclient = defaults.buildUserPoolClient(stack, userpool, {
    userPoolClientName: 'test',
    userPool: userpool
  });
  const identitypool = defaults.buildIdentityPool(stack, userpool, userpoolclient);

  const cognitoAuthorizedRole = defaults.setupCognitoForElasticSearch(stack, 'test-domain', {
    userpool,
    userpoolclient,
    identitypool
  });

  if (lambdaRoleARN) {
    return defaults.buildElasticSearch(stack, domainName, {
      userpool,
      identitypool,
      cognitoAuthorizedRoleARN: cognitoAuthorizedRole.roleArn,
      serviceRoleARN: lambdaRoleARN
    }, cfnDomainProps);
  } else {
    return defaults.buildElasticSearch(stack, domainName, {
      userpool,
      identitypool,
      cognitoAuthorizedRoleARN: cognitoAuthorizedRole.roleArn
    }, cfnDomainProps);
  }
}

test('Test override SnapshotOptions for buildElasticSearch', () => {
  const stack = new Stack();
  deployES(stack, 'test-domain', {
    snapshotOptions: {
      automatedSnapshotStartHour: 5
    }
  });

  expect(stack).toHaveResource('AWS::Elasticsearch::Domain', {
    AccessPolicies: {
      Statement: [
        {
          Action: "es:ESHttp*",
          Effect: "Allow",
          Principal: {
            AWS: {
              "Fn::GetAtt": [
                "CognitoAuthorizedRole14E74FE0",
                "Arn"
              ]
            }
          },
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:aws:es:",
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
    CognitoOptions: {
      Enabled: true,
      IdentityPoolId: {
        Ref: "CognitoIdentityPool"
      },
      RoleArn: {
        "Fn::GetAtt": [
          "CognitoKibanaConfigureRole62CCE76A",
          "Arn"
        ]
      },
      UserPoolId: {
        Ref: "CognitoUserPool53E37E69"
      }
    },
    DomainName: "test-domain",
    EBSOptions: {
      EBSEnabled: true,
      VolumeSize: 10
    },
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessConfig: {
        AvailabilityZoneCount: 3
      },
      ZoneAwarenessEnabled: true
    },
    ElasticsearchVersion: "6.3",
    EncryptionAtRestOptions: {
      Enabled: true
    },
    NodeToNodeEncryptionOptions: {
      Enabled: true
    },
    SnapshotOptions: {
      AutomatedSnapshotStartHour: 5
    }
  });
});

test('Test override ES version for buildElasticSearch', () => {
  const stack = new Stack();
  deployES(stack, 'test-domain', {
    elasticsearchVersion: '7.0'
  });

  expect(stack).toHaveResource('AWS::Elasticsearch::Domain', {
    AccessPolicies: {
      Statement: [
        {
          Action: "es:ESHttp*",
          Effect: "Allow",
          Principal: {
            AWS: {
              "Fn::GetAtt": [
                "CognitoAuthorizedRole14E74FE0",
                "Arn"
              ]
            }
          },
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:aws:es:",
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
    CognitoOptions: {
      Enabled: true,
      IdentityPoolId: {
        Ref: "CognitoIdentityPool"
      },
      RoleArn: {
        "Fn::GetAtt": [
          "CognitoKibanaConfigureRole62CCE76A",
          "Arn"
        ]
      },
      UserPoolId: {
        Ref: "CognitoUserPool53E37E69"
      }
    },
    DomainName: "test-domain",
    EBSOptions: {
      EBSEnabled: true,
      VolumeSize: 10
    },
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessConfig: {
        AvailabilityZoneCount: 3
      },
      ZoneAwarenessEnabled: true
    },
    ElasticsearchVersion: "7.0",
    EncryptionAtRestOptions: {
      Enabled: true
    },
    NodeToNodeEncryptionOptions: {
      Enabled: true
    },
    SnapshotOptions: {
      AutomatedSnapshotStartHour: 1
    }
  });

});

test('Test ES with lambdaRoleARN', () => {
  const stack = new Stack();
  deployES(stack, 'test-domain', {}, 'arn:aws:us-east-1:mylambdaRoleARN');

  expect(stack).toHaveResource('AWS::Elasticsearch::Domain', {
    AccessPolicies: {
      Statement: [
        {
          Action: "es:ESHttp*",
          Effect: "Allow",
          Principal: {
            AWS: [
              {
                "Fn::GetAtt": [
                  "CognitoAuthorizedRole14E74FE0",
                  "Arn"
                ]
              },
              "arn:aws:us-east-1:mylambdaRoleARN"
            ]
          },
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:aws:es:",
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
    CognitoOptions: {
      Enabled: true,
      IdentityPoolId: {
        Ref: "CognitoIdentityPool"
      },
      RoleArn: {
        "Fn::GetAtt": [
          "CognitoKibanaConfigureRole62CCE76A",
          "Arn"
        ]
      },
      UserPoolId: {
        Ref: "CognitoUserPool53E37E69"
      }
    },
    DomainName: "test-domain",
    EBSOptions: {
      EBSEnabled: true,
      VolumeSize: 10
    },
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessConfig: {
        AvailabilityZoneCount: 3
      },
      ZoneAwarenessEnabled: true
    },
    ElasticsearchVersion: "6.3",
    EncryptionAtRestOptions: {
      Enabled: true
    },
    NodeToNodeEncryptionOptions: {
      Enabled: true
    },
    SnapshotOptions: {
      AutomatedSnapshotStartHour: 1
    }
  });

});

test('Count ES CW Alarms', () => {
  const stack = new Stack();
  deployES(stack, 'test-domain');
  const cwList = defaults.buildElasticSearchCWAlarms(stack);

  expect(cwList.length).toEqual(9);
});
