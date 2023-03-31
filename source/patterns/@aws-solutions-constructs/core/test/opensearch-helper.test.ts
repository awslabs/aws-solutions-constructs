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
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as defaults from '../index';
import { Template } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { BuildOpenSearchResponse } from '../index';

function buildTestOpenSearchDomain(stack: Stack, openSearchDomainName: string, clientDomainProps?: opensearch.CfnDomainProps,
  lambdaRoleARN?: string, vpc?: ec2.IVpc): BuildOpenSearchResponse {
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

  return defaults.buildOpenSearch(stack, {
    userpool,
    identitypool,
    cognitoAuthorizedRoleARN: cognitoAuthorizedRole.roleArn,
    serviceRoleARN: lambdaRoleARN ? lambdaRoleARN : undefined,
    vpc,
    openSearchDomainName,
    clientDomainProps
  });
}

function deployStack() {
  return new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
}

test('Test override SnapshotOptions for buildOpenSearch', () => {
  const stack = deployStack();

  const buildOpenSearchResponse = buildTestOpenSearchDomain(stack, 'test-domain', {
    snapshotOptions: {
      automatedSnapshotStartHour: 5
    }
  });

  expect(buildOpenSearchResponse.domain).toBeDefined();
  expect(buildOpenSearchResponse.role).toBeDefined();
  Template.fromStack(stack).hasResourceProperties('AWS::OpenSearchService::Domain', {
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
    CognitoOptions: {
      Enabled: true,
      IdentityPoolId: {
        Ref: "CognitoIdentityPool"
      },
      RoleArn: {
        "Fn::GetAtt": [
          "CognitoDashboardConfigureRoleEC5F4809",
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
    ClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessConfig: {
        AvailabilityZoneCount: 3
      },
      ZoneAwarenessEnabled: true
    },
    EngineVersion: "OpenSearch_1.3",
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
  const stack = deployStack();

  const vpc = defaults.getTestVpc(stack, false);

  buildTestOpenSearchDomain(stack, 'test-domain', {
    clusterConfig: {
      dedicatedMasterEnabled: true,
      dedicatedMasterCount: 3,
      instanceCount: 3,
      zoneAwarenessEnabled: false
    }
  }, undefined, vpc);

  Template.fromStack(stack).hasResourceProperties('AWS::OpenSearchService::Domain', {
    DomainName: "test-domain",
    ClusterConfig: {
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

  const buildOpenSearchResponse = buildTestOpenSearchDomain(stack, 'test-domain', {}, undefined, vpc);

  expect(buildOpenSearchResponse.domain).toBeDefined();
  expect(buildOpenSearchResponse.role).toBeDefined();
  Template.fromStack(stack).hasResourceProperties('AWS::OpenSearchService::Domain', {
    DomainName: "test-domain",
    ClusterConfig: {
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
  const stack = deployStack();

  const vpc: ec2.IVpc = defaults.getTestVpc(stack);

  buildTestOpenSearchDomain(stack, 'test-domain', {}, undefined, vpc);

  Template.fromStack(stack).hasResourceProperties('AWS::OpenSearchService::Domain', {
    DomainName: "test-domain",
    ClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessEnabled: true
    }
  });
});

test('Test deployment with an existing private VPC', () => {
  const stack = deployStack();

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

  buildTestOpenSearchDomain(stack, 'test-domain', {}, undefined, vpc);

  Template.fromStack(stack).hasResourceProperties('AWS::OpenSearchService::Domain', {
    DomainName: "test-domain",
    ClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessEnabled: true
    }
  });
});

test('Test error thrown with no private subnet configurations', () => {
  const stack = deployStack();

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
    buildTestOpenSearchDomain(stack, 'test-domain', {}, undefined, vpc);
  };

  expect(app).toThrowError('Error - No isolated or private subnets available in VPC');
});

test('Test engine version override for buildOpenSearch', () => {
  const stack = deployStack();

  buildTestOpenSearchDomain(stack, 'test-domain', {
    engineVersion: 'OpenSearch_1.0'
  });

  Template.fromStack(stack).hasResourceProperties('AWS::OpenSearchService::Domain', {
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
    CognitoOptions: {
      Enabled: true,
      IdentityPoolId: {
        Ref: "CognitoIdentityPool"
      },
      RoleArn: {
        "Fn::GetAtt": [
          "CognitoDashboardConfigureRoleEC5F4809",
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
    ClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessConfig: {
        AvailabilityZoneCount: 3
      },
      ZoneAwarenessEnabled: true
    },
    EngineVersion: "OpenSearch_1.0",
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

test('Test deployment with lambdaRoleARN', () => {
  const stack = deployStack();

  const buildOpenSearchResponse = buildTestOpenSearchDomain(stack, 'test-domain', {}, 'arn:aws:us-east-1:mylambdaRoleARN');

  expect(buildOpenSearchResponse.domain).toBeDefined();
  expect(buildOpenSearchResponse.role).toBeDefined();
  Template.fromStack(stack).hasResourceProperties('AWS::OpenSearchService::Domain', {
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
    CognitoOptions: {
      Enabled: true,
      IdentityPoolId: {
        Ref: "CognitoIdentityPool"
      },
      RoleArn: {
        "Fn::GetAtt": [
          "CognitoDashboardConfigureRoleEC5F4809",
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
    ClusterConfig: {
      DedicatedMasterCount: 3,
      DedicatedMasterEnabled: true,
      InstanceCount: 3,
      ZoneAwarenessConfig: {
        AvailabilityZoneCount: 3
      },
      ZoneAwarenessEnabled: true
    },
    EngineVersion: "OpenSearch_1.3",
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

test('Count OpenSearch CloudWatch alarms', () => {
  const stack = new Stack();
  buildTestOpenSearchDomain(stack, 'test-domain');
  const cwList = defaults.buildOpenSearchCWAlarms(stack);

  expect(cwList.length).toEqual(9);
});
