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
// import * as defaults from '../index';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { buildKendraIndex, AddKendraDataSource, AddMultipleKendraDataSources, normalizeKendraPermissions } from '../lib/kendra-helper';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as iam from 'aws-cdk-lib/aws-iam';

// import { Construct } from 'constructs';

test('Launch Kendra index with defaults', () => {
  const stack = new Stack(undefined, undefined);

  buildKendraIndex(stack, 'test', {});

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kendra::Index', {});
  template.resourceCountIs("AWS::IAM::Role", 1);
});

test('Confirm kendra has log writing privileges', () => {
  const stack = new Stack(undefined, undefined);

  buildKendraIndex(stack, 'test', {});

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Role", {
    Description: "Allow Kendra index to write CloudWatch Logs",
    Policies: [
      {
        PolicyDocument: {
          Statement: [
            {
              Action: "cloudwatch:PutMetricData",
              Condition: {
                StringEquals: {
                  "cloudwatch:namespace": "AWS/Kendra"
                }
              },
              Effect: "Allow",
              Resource: "*"
            },
            {
              Action: "logs:CreateLogGroup",
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:logs:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":log-group:/aws/kendra/*"
                  ]
                ]
              }
            },
            {
              Action: "logs:DescribeLogGroups",
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":logs:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":log-group:/aws/kendra/*"
                  ]
                ]
              }
            },
            {
              Action: [
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStream"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":logs:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":log-group:/aws/kendra/*:log-stream:*"
                  ]
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "AllowLogging"
      }
    ],
  });
});

test('Launch Kendra index with custom properties', () => {
  const testName = 'test-index-name';
  const stack = new Stack(undefined, undefined);

  buildKendraIndex(stack, 'test', {
    kendraIndexProps: {
      name: testName
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kendra::Index', {
    Name: testName
  });
  template.resourceCountIs("AWS::IAM::Role", 1);
});

test('Launch Kendra index with existing role', () => {
  const fakeRoleArn = 'fake-arn';
  const stack = new Stack(undefined, undefined);

  buildKendraIndex(stack, 'test', {
    kendraIndexProps: {
      roleArn: fakeRoleArn
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kendra::Index', {
    RoleArn: fakeRoleArn
  });
  template.resourceCountIs("AWS::IAM::Role", 0);
});

test('use existing Kendra index', () => {
  const stack = new Stack(undefined, undefined);

  const indexProps: kendra.CfnIndexProps = {
    edition: 'DEVELOPER_EDITION',
    name: 'kendra-test',
    roleArn: 'fake-arn'
  };

  const testIndex = new kendra.CfnIndex(stack, `test`, indexProps);

  buildKendraIndex(stack, 'test', {
    existingIndexObj: testIndex
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Kendra::Index', 1);
});

test('Launch Kendra index with an S3 data source', () => {
  const testName = 'test-name';
  const testBucketName = 'test-bucket-name';
  const stack = new Stack(undefined, undefined);

  const newIndex = buildKendraIndex(stack, 'test', {});

  AddKendraDataSource(stack, 'testSource', newIndex, {
    type: 'S3',
    name: testName,
    dataSourceConfiguration: {
      s3Configuration: {
        bucketName: testBucketName,
      }
    },
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Kendra::Index', 1);
  template.resourceCountIs("AWS::Kendra::DataSource", 1);
  template.resourceCountIs("AWS::IAM::Role", 2);
  template.hasResourceProperties("AWS::Kendra::DataSource", {
    Name: testName,
    RoleArn: Match.anyValue(),
    Type: 'S3',
    DataSourceConfiguration: {
      S3Configuration: {
        BucketName: testBucketName
      }
    }
  });
  template.hasResourceProperties("AWS::IAM::Role", {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "kendra.amazonaws.com"
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
              Action: "s3:GetObject",
              Effect: "Allow",
              Resource: `arn:aws:s3:::${testBucketName}/*`
            },
            {
              Action: "s3:ListBucket",
              Effect: "Allow",
              Resource: `arn:aws:s3:::${testBucketName}`
            },
            {
              Action: [
                "kendra:BatchPutDocument",
                "kendra:BatchDeleteDocument"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::GetAtt": [
                  "kendraindextest",
                  "Arn"
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "s3CrawlPolicy"
      }
    ]
  });
});

test('Launch Kendra index with a customized S3 data source', () => {
  const testName = 'test-name';
  const testBucketName = 'test-bucket-name';
  const stack = new Stack(undefined, undefined);

  const newIndex = buildKendraIndex(stack, 'test', {});

  AddKendraDataSource(stack, 'testSource', newIndex, {
    type: 'S3',
    name: testName,
    dataSourceConfiguration: {
      s3Configuration: {
        bucketName: testBucketName,
        inclusionPatterns: ['IncludeThis'],
      }
    },
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Kendra::DataSource", {
    DataSourceConfiguration: {
      S3Configuration: {
        BucketName: "test-bucket-name",
        InclusionPatterns: ['IncludeThis'],
      }
    },
  });
  template.resourceCountIs('AWS::Kendra::Index', 1);
  template.resourceCountIs("AWS::Kendra::DataSource", 1);
  template.resourceCountIs("AWS::IAM::Role", 2);
});

test('Launch Kendra index with non-implemented data source', () => {
  const nonImplementedSourceType = "WEBCRAWLER";
  const nonImplementedSourceName = "test-other-source";
  const stack = new Stack(undefined, undefined);
  const testIndex = buildKendraIndex(stack, 'test', {});

  // Create a role
  const fakeRole = new iam.Role(stack, 'fakeRole', {
    assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    roleName: 'externalFakeRole'
  });

  // Create data source props
  const dataSourceProps: Partial<kendra.CfnDataSourceProps> = {
    name: nonImplementedSourceName,
    roleArn: fakeRole.roleArn,
    type: nonImplementedSourceType,
  };

  // Add a data source
  AddKendraDataSource(stack, 'test-other-source', testIndex, dataSourceProps);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Kendra::Index', 1);
  template.resourceCountIs('AWS::Kendra::DataSource', 1);
  template.resourceCountIs('AWS::IAM::Role', 2);
  template.hasResourceProperties("AWS::Kendra::DataSource", {
    Name: nonImplementedSourceName,
    Type: nonImplementedSourceType
  });
});

test('Confirm error if client supplies an index in the DataSource props', () => {
  const nonImplementedSourceType = "WEBCRAWLER";
  const nonImplementedSourceName = "test-other-source";
  const stack = new Stack(undefined, undefined);
  const testIndex = buildKendraIndex(stack, 'test', {});

  // Create a role
  const fakeRole = new iam.Role(stack, 'fakeRole', {
    assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    roleName: 'externalFakeRole'
  });

  // Create data source props
  const dataSourceProps: Partial<kendra.CfnDataSourceProps> = {
    name: nonImplementedSourceName,
    roleArn: fakeRole.roleArn,
    type: nonImplementedSourceType,
    indexId: testIndex.attrId,
  };

  // Add a data source
  const app = () => {
    AddKendraDataSource(stack, 'test-other-source', testIndex, dataSourceProps);
  };

  expect(app).toThrowError(/Invalid DataSource prop specified - Construct must set the indexId prop/);
});

test('Confirm error if does not provide DataSource configuration', () => {
  const stack = new Stack(undefined, undefined);
  const testIndex = buildKendraIndex(stack, 'test', {});

  // Create data source props
  const dataSourceProps: Partial<kendra.CfnDataSourceProps> = {
    type: "S3"
  };

  // Add a data source
  const app = () => {
    AddKendraDataSource(stack, 'test-bad-source', testIndex, dataSourceProps);
  };

  expect(app).toThrowError(/Error - an S3 Kendra DataSource requires an DataSourceConfiguration prop/);
});

test('Confirm error if does not provide S3 DataSource configuration', () => {
  const stack = new Stack(undefined, undefined);
  const testIndex = buildKendraIndex(stack, 'test', {});

  // Create data source props
  const dataSourceProps: Partial<kendra.CfnDataSourceProps> = {
    type: "S3",
    dataSourceConfiguration: {

    }
  };

  // Add a data source
  const app = () => {
    AddKendraDataSource(stack, 'test-bad-source', testIndex, dataSourceProps);
  };

  expect(app).toThrowError(/Error - an S3 Kendra DataSource requires an DataSourceConfiguration.S3Configuration prop/);
});

test('Confirm error if does not provide S3 Bucketname', () => {
  const stack = new Stack(undefined, undefined);
  const testIndex = buildKendraIndex(stack, 'test', {});

  // Create data source props
  const dataSourceProps: Partial<kendra.CfnDataSourceProps> = {
    type: "S3",
    dataSourceConfiguration: {
      s3Configuration: {
        // Going through some hoops here to force this conditiion, but since we
        // allow | any for props, a client could do this
      } as kendra.CfnDataSource.S3DataSourceConfigurationProperty
    }
  };

  // Add a data source
  const app = () => {
    AddKendraDataSource(stack, 'test-bad-source', testIndex, dataSourceProps);
  };

  expect(app).toThrowError(/Error - an S3 Kendra DataSource requires the DataSourceConfiguration.S3Configuration.bucketName prop/);
});

test('Launch Kendra index with multiple data sources', () => {
  const testName = 'test-name';
  const testBucketName = 'test-bucket-name';
  const nonImplementedSourceType = "WEBCRAWLER";
  const nonImplementedSourceName = "test-other-source";
  const stack = new Stack(undefined, undefined);

  const newIndex = buildKendraIndex(stack, 'test', {});

  const s3DataSourceProps = {
    type: 'S3',
    name: testName,
    dataSourceConfiguration: {
      s3Configuration: {
        bucketName: testBucketName,
      }
    },
  };

  // Create a role
  const fakeRole = new iam.Role(stack, 'fakeRole', {
    assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    roleName: 'externalFakeRole'
  });

  // Create data source props
  const otherDataSourceProps: Partial<kendra.CfnDataSourceProps> = {
    name: nonImplementedSourceName,
    roleArn: fakeRole.roleArn,
    type: nonImplementedSourceType
  };

  // Add a data source
  const sourceObjects = AddMultipleKendraDataSources(stack, 'test-other-source', newIndex, [
    s3DataSourceProps,
    otherDataSourceProps
  ]
  );

  expect(sourceObjects.length).toEqual(2);
  expect(sourceObjects[0].type).toEqual('S3');
  expect(sourceObjects[1].name).toEqual(nonImplementedSourceName);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Kendra::Index', 1);
  template.resourceCountIs('AWS::Kendra::DataSource', 2);
  template.resourceCountIs('AWS::IAM::Role', 3);

  // Look for S3 data source
  template.hasResourceProperties("AWS::Kendra::DataSource", {
    Name: testName,
    RoleArn: Match.anyValue(),
    Type: 'S3',
    DataSourceConfiguration: {
      S3Configuration: {
        BucketName: testBucketName
      }
    }
  });
  template.hasResourceProperties("AWS::IAM::Role", {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "kendra.amazonaws.com"
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
              Action: "s3:GetObject",
              Effect: "Allow",
              Resource: `arn:aws:s3:::${testBucketName}/*`
            },
            {
              Action: "s3:ListBucket",
              Effect: "Allow",
              Resource: `arn:aws:s3:::${testBucketName}`
            },
            {
              Action: [
                "kendra:BatchPutDocument",
                "kendra:BatchDeleteDocument"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::GetAtt": [
                  "kendraindextest",
                  "Arn"
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "s3CrawlPolicy"
      }
    ]
  });

  // Look for non-implemented data source
  template.hasResourceProperties("AWS::Kendra::DataSource", {
    Name: nonImplementedSourceName,
    Type: nonImplementedSourceType,
    IndexId: Match.anyValue()
  });

});

test('Confirm Errof for bad kendra Permission in normalizeKendraPermissions()', () => {
  const inputs = ["read", "submitfeedback", "write"];

  const outputs = normalizeKendraPermissions(inputs);

  expect(outputs.includes("READ")).toBeTruthy();
  expect(outputs.includes("SUBMITFEEDBACK")).toBeTruthy();
  expect(outputs.includes("WRITE")).toBeTruthy();
});

test('Confirm successful operation of normalizeKendraPermissions()', () => {
  const inputs = ["badvalue", "write"];

  const app = () => {
    normalizeKendraPermissions(inputs);
  };

  expect(app).toThrowError(/Invalid indexPermission value - valid values are "READ", "SUBMITFEEDBACK" and "WRITE"/);
});
