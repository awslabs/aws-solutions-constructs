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

// Imports
import { Stack } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaToBedrockinferenceprofile, LambdaToBedrockinferenceprofileProps } from '../lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';
import * as cdk from "aws-cdk-lib";

test('Test cross region deployment with new Lambda function', () => {
  // Stack
  const stack = new Stack();

  const props: LambdaToBedrockinferenceprofileProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bedrockModelId: "amazon.nova-lite-v1:0"
  };

  new LambdaToBedrockinferenceprofile(stack, 'test-lambda-inferenceprops', props);
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        BEDROCK_MODEL: "amazon.nova-lite-v1:0",
        BEDROCK_PROFILE: {
          "Fn::GetAtt": [
            Match.stringLikeRegexp("testlambdainferencepropstestlambdainferencepropsinference"),
            "InferenceProfileArn"
          ]
        }
      }
    },
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp("testlambdainferencepropsLambdaFunctionServiceRole"),
        "Arn"
      ]
    },
    Runtime: "nodejs20.x",
    Timeout: 30,
    TracingConfig: {
      Mode: "Active"
    }
  });
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "bedrock:Invoke*",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              Match.stringLikeRegexp("testlambdainferencepropstestlambdainferencepropsinference"),
              "InferenceProfileArn"
            ]
          }
        }
      ],
      Version: "2012-10-17"
    },
    PolicyName: Match.stringLikeRegexp("testlambdainferencepropsLambdaFunctionServiceRoleDefaultPolicy"),
    Roles: [
      {
        "Ref": Match.stringLikeRegexp("testlambdainferencepropsLambdaFunctionServiceRole")
      }
    ]
  });
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "bedrock:Invoke*",
          Effect: "Allow",
          Resource: {
            "Fn::Split": [
              ",",
              {
                "Fn::FindInMap": [
                  "testlambdainferencepropsarearegionmapping",
                  {
                    "Fn::Select": [
                      0,
                      {
                        "Fn::Split": [
                          "-",
                          {
                            "Ref": "AWS::Region"
                          }
                        ]
                      }
                    ]
                  },
                  "regionalModels"
                ]
              }
            ]
          }
        }
      ],
      Version: "2012-10-17"
    },
    PolicyName: Match.stringLikeRegexp("testlambdainferencepropsLambdaFunctioninlinePolicyAddedToExecutionRole"),
    Roles: [
      {
        "Ref": Match.stringLikeRegexp("testlambdainferencepropsLambdaFunctionServiceRole")
      }
    ]
  });
});

test('Test single region deployment with new Lambda function', () => {
  // Stack
  const stack = new Stack();

  const props: LambdaToBedrockinferenceprofileProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bedrockModelId: "amazon.nova-lite-v1:0",
    deployCrossRegionProfile: false
  };

  new LambdaToBedrockinferenceprofile(stack, 'test-lambda-inferenceprops', props);
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        BEDROCK_MODEL: "amazon.nova-lite-v1:0",
        BEDROCK_PROFILE: {
          "Fn::GetAtt": [
            "testlambdainferencepropstestlambdainferencepropsinference01BBD7E6",
            "InferenceProfileArn"
          ]
        }
      }
    },
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "testlambdainferencepropsLambdaFunctionServiceRole102487FD",
        "Arn"
      ]
    },
    Runtime: "nodejs20.x",
    Timeout: 30,
    TracingConfig: {
      Mode: "Active"
    }
  });
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "bedrock:Invoke*",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              Match.stringLikeRegexp("testlambdainferencepropstestlambdainferencepropsinference"),
              "InferenceProfileArn"
            ]
          }
        },
        {
          Action: "bedrock:Invoke*",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  "Ref": "AWS::Partition"
                },
                ":bedrock:",
                {
                  "Ref": "AWS::Region"
                },
                "::foundation-model/amazon.nova-lite-v1:0"
              ]
            ]
          }
        }
      ],
      Version: "2012-10-17"
    },
    PolicyName: Match.stringLikeRegexp("testlambdainferencepropsLambdaFunctionServiceRoleDefaultPolicy"),
    Roles: [
      {
        "Ref": Match.stringLikeRegexp("testlambdainferencepropsLambdaFunctionServiceRole")
      }
    ]
  });
});

test('Test deployment with VPC', () => {
  // Stack
  const stack = new Stack();
  const props: LambdaToBedrockinferenceprofileProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bedrockModelId: "amazon.nova-lite-v1:0",
    deployVpc: true
  };

  const newConstruct = new LambdaToBedrockinferenceprofile(stack, 'test-lambda-inferenceprops', props);
  expect(newConstruct.vpc).toBeDefined();
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::EC2::VPC", 1);
  template.resourceCountIs("AWS::EC2::VPCEndpoint", 2);
  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: Match.anyValue(),
      SubnetIds: [
        Match.anyValue(),
        Match.anyValue(),
      ]
    },
  });
});

test('Test deployment overridden Lambda props', () => {
  // Stack
  const stack = new Stack();

  const props: LambdaToBedrockinferenceprofileProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      timeout: cdk.Duration.seconds(45)
    },
    bedrockModelId: "amazon.nova-lite-v1:0"
  };

  new LambdaToBedrockinferenceprofile(stack, 'test-lambda-inferenceprops', props);
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Lambda::Function", {
    Timeout: 45
  });
});

test('Test deployment with overridden inference props', () => {
  // Stack
  const stack = new Stack();
  const testName = "testName";

  const props: LambdaToBedrockinferenceprofileProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    inferenceProfileProps: {
      inferenceProfileName: testName
    },
    bedrockModelId: "amazon.nova-lite-v1:0"
  };

  new LambdaToBedrockinferenceprofile(stack, 'test-lambda-inferenceprops', props);
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Bedrock::ApplicationInferenceProfile", {
    InferenceProfileName: testName
  });
});

test('Test deployment with invalid inference props', () => {
  // Stack
  const stack = new Stack();

  const props: LambdaToBedrockinferenceprofileProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    inferenceProfileProps: {
      inferenceProfileName: "test",
      modelSource: {
        copyFrom: "test"
      }
    },
    bedrockModelId: "amazon.nova-lite-v1:0"
  };

  const app = () => {
    new LambdaToBedrockinferenceprofile(stack, 'test-lambda-inferenceprops', props);
  };

  expect(app).toThrowError('Error - The construct will create the modelSource value, it cannot be specified in the props.\n');
});

test('Test deployment with invalid Lambda props', () => {
  // Stack
  const stack = new Stack();

  const props: LambdaToBedrockinferenceprofileProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
    },
    existingLambdaObj: new lambda.Function(stack, "placeholder", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
    }),
    bedrockModelId: "amazon.nova-lite-v1:0"
  };

  const app = () => {
    new LambdaToBedrockinferenceprofile(stack, 'test-lambda-inferenceprops', props);
  };

  expect(app).toThrowError(
    "Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n"
  );
});
