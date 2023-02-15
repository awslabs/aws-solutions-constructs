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
import * as elasticsearch from 'aws-cdk-lib/aws-elasticsearch';
import * as defaults from '../index';
import '@aws-cdk/assert/jest';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

function deployES(stack: Stack, domainName: string, clientDomainProps?: elasticsearch.CfnDomainProps,
  lambdaRoleARN?: string, vpc?: ec2.IVpc): defaults.BuildElasticSearchResponse {
  const userpool = defaults.buildUserPool(stack);
  const userpoolclient = defaults.buildUserPoolClient(stack, userpool, {
    userPoolClientName: 'test',
    userPool: userpool
  });
  const identitypool = defaults.buildIdentityPool(stack, userpool, userpoolclient);

  const cognitoAuthorizedRole = defaults.setupCognitoForSearchService(stack, 'test-domain', {
    userpool,
    userpoolclient,
    identitypool
  });

  if (lambdaRoleARN) {
    return defaults.buildElasticSearch(stack, {
      userpool,
      identitypool,
      cognitoAuthorizedRoleARN: cognitoAuthorizedRole.roleArn,
      serviceRoleARN: lambdaRoleARN,
      vpc,
      domainName,
      clientDomainProps
    });
  } else {
    return defaults.buildElasticSearch(stack, {
      userpool,
      identitypool,
      cognitoAuthorizedRoleARN: cognitoAuthorizedRole.roleArn,
      vpc,
      domainName,
      clientDomainProps
    });
  }
}

test('Test override SnapshotOptions for buildElasticSearch', () => {
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const response = deployES(stack, 'test-domain', {
    snapshotOptions: {
      automatedSnapshotStartHour: 5
    }
  });

  expect(response.domain).toBeDefined();
  expect(response.role).toBeDefined();

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

test('Test VPC with 1 AZ, Zone Awareness Disabled', () => {
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const vpc = defaults.getTestVpc(stack, false);

  const response = deployES(stack, 'test-domain', {
    elasticsearchClusterConfig: {
      dedicatedMasterEnabled: true,
      dedicatedMasterCount: 3,
      instanceCount: 3,
      zoneAwarenessEnabled: false
    }
  }, undefined, vpc);

  expect(response.domain).toBeDefined();
  expect(response.role).toBeDefined();

  expect(stack).toHaveResourceLike('AWS::Elasticsearch::Domain', {
    DomainName: "test-domain",
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessEnabled: false
    }
  });
});

test('Test VPC with 2 AZ, Zone Awareness Enabled', () => {
  // If no environment is specified, a VPC will use 2 AZs by default.
  // If an environment is specified, a VPC will use 3 AZs by default.
  const stack = new Stack(undefined, undefined, {});

  const vpc: ec2.IVpc = defaults.getTestVpc(stack, false);

  const response = deployES(stack, 'test-domain', {}, undefined, vpc);

  expect(response.domain).toBeDefined();
  expect(response.role).toBeDefined();

  expect(stack).toHaveResourceLike('AWS::Elasticsearch::Domain', {
    DomainName: "test-domain",
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 2,
      ZoneAwarenessEnabled: true
    }
  });
});

test('Test VPC with 3 AZ, Zone Awareness Enabled', () => {
  // If no environment is specified, a VPC will use 2 AZs by default.
  // If an environment is specified, a VPC will use 3 AZs by default.
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const vpc: ec2.IVpc = defaults.getTestVpc(stack);

  const response = deployES(stack, 'test-domain', {}, undefined, vpc);

  expect(response.domain).toBeDefined();
  expect(response.role).toBeDefined();

  expect(stack).toHaveResourceLike('AWS::Elasticsearch::Domain', {
    DomainName: "test-domain",
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessEnabled: true
    }
  });
});

test('Test deployment with an existing private VPC', () => {
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const vpc = new ec2.Vpc(stack, 'existing-private-vpc-test', {
    natGateways: 1,
    subnetConfiguration: [
      {
        cidrMask: 24,
        name: 'application',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      {
        cidrMask: 24,
        name: "public",
        subnetType: ec2.SubnetType.PUBLIC,
      }
    ]
  });

  const response = deployES(stack, 'test-domain', {}, undefined, vpc);

  expect(response.domain).toBeDefined();
  expect(response.role).toBeDefined();

  expect(stack).toHaveResourceLike('AWS::Elasticsearch::Domain', {
    DomainName: "test-domain",
    ElasticsearchClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessEnabled: true
    }
  });
});

test('Test error thrown with no private subnet configurations', () => {
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: {
      subnetConfiguration: [
        {
          cidrMask: 18,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ]
    }
  });

  const app = () => {
    deployES(stack, 'test-domain', {}, undefined, vpc);
  };

  expect(app).toThrowError('Error - No isolated or private subnets available in VPC');
});

test('Test override ES version for buildElasticSearch', () => {
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const response = deployES(stack, 'test-domain', {
    elasticsearchVersion: '7.0'
  });

  expect(response.domain).toBeDefined();
  expect(response.role).toBeDefined();

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
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const response = deployES(stack, 'test-domain', {}, 'arn:aws:us-east-1:mylambdaRoleARN');

  expect(response.domain).toBeDefined();
  expect(response.role).toBeDefined();

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
  const response = deployES(stack, 'test-domain');
  expect(response.domain).toBeDefined();
  expect(response.role).toBeDefined();

  const cwList = defaults.buildElasticSearchCWAlarms(stack);

  expect(cwList.length).toEqual(9);
});
