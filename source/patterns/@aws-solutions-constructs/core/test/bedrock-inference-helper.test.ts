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

import * as cdk from 'aws-cdk-lib';
import { createAreaPrefixMapping, createAreaRegionMapping, buildInferenceProfile, CheckBedrockInferenceProps } from '../lib/bedrock-inference-helper';
// import { Construct } from 'constructs';
import { Template } from 'aws-cdk-lib/assertions';

test('Create cross region Inference Profile by default', () => {
  const stack = new cdk.Stack();

  buildInferenceProfile(stack, "test-profile", {
    bedrockModelId: "amazon.nova-lite-v1:0",
  });
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::Bedrock::ApplicationInferenceProfile", 1);
  template.hasResourceProperties("AWS::Bedrock::ApplicationInferenceProfile", {
    InferenceProfileName: {
      "Fn::Join": [
        "",
        [
          "test-profile-",
          {
            "Fn::Select": [
              2,
              {
                "Fn::Split": [
                  "/",
                  {
                    "Ref": "AWS::StackId"
                  }
                ]
              }
            ]
          }
        ]
      ]
    },
    ModelSource: {
      CopyFrom: {
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
            ":",
            {
              "Ref": "AWS::AccountId"
            },
            ":inference-profile/",
            {
              "Fn::FindInMap": [
                "testprofileareaprefixmapping",
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
                "prefix"
              ]
            },
            ".amazon.nova-lite-v1:0"
          ]
        ]
      }
    },
  });
});

test('Test adding Prefix Mapping to template', () => {
  // Stack
  const stack = new cdk.Stack();

  const mapping = createAreaPrefixMapping(stack, "test-stack");
  expect(mapping.mapping).toBeDefined();
  expect(mapping.mappingName).toEqual("teststackareaprefixmapping");

  const template = Template.fromStack(stack);

  template.hasMapping(mapping.mappingName, {
    us: {
      prefix: "us"
    },
    eu: {
      prefix: "eu"
    },
    ap: {
      prefix: "apac"
    }
  });
});

test('Test adding Region Mapping to template', () => {
  // Stack
  const stack = new cdk.Stack();

  const mapping = createAreaRegionMapping(stack, "test-stack", "model-name");
  expect(mapping.mapping).toBeDefined();
  expect(mapping.mappingName).toEqual("teststackarearegionmapping");

  const template = Template.fromStack(stack);

  template.hasMapping(mapping.mappingName, {
    eu: {
      regionalModels:
        `arn:aws:bedrock:eu-north-1::foundation-model/model-name,` +
        `arn:aws:bedrock:eu-central-1::foundation-model/model-name,` +
        `arn:aws:bedrock:eu-west-1::foundation-model/model-name,` +
        `arn:aws:bedrock:eu-west-3::foundation-model/model-name`
    },
    us: {
      regionalModels:
        `arn:aws:bedrock:us-east-1::foundation-model/model-name,` +
        `arn:aws:bedrock:us-east-2::foundation-model/model-name,` +
        `arn:aws:bedrock:us-west-2::foundation-model/model-name`
    },
    ap: {
      regionalModels:
        `arn:aws:bedrock:ap-southeast-2::foundation-model/model-name,` +
        `arn:aws:bedrock:ap-northeast-1::foundation-model/model-name,` +
        `arn:aws:bedrock:ap-south-1::foundation-model/model-name,` +
        `arn:aws:bedrock:ap-northeast-2::foundation-model/model-name,` +
        `arn:aws:bedrock:ap-southeast-1::foundation-model/model-name,` +
        `arn:aws:bedrock:ap-northeast-3::foundation-model/model-name`
    }
  });
});

test('Create single region Inference Profile', () => {
  const stack = new cdk.Stack();

  buildInferenceProfile(stack, "test-profile", {
    bedrockModelId: "amazon.nova-lite-v1:0",
    deployCrossRegionProfile: false
  });
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::Bedrock::ApplicationInferenceProfile", 1);
  template.hasResourceProperties("AWS::Bedrock::ApplicationInferenceProfile", {
    ModelSource: {
      CopyFrom: {
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
            ":",
            {
              "Ref": "AWS::AccountId"
            },
            ":foundation-model/amazon.nova-lite-v1:0"
          ]
        ]
      }
    },
  });
});

test("Test for bad inference props", () => {

  const app = () => {
    CheckBedrockInferenceProps({
      bedrockModelId: "amazon.nova-lite-v1:0",
      inferenceProfileProps: {
        inferenceProfileName: "test",
        modelSource: {
          copyFrom: "test"
        }
      }
    });
  };

  expect(app).toThrowError('Error - The construct will create the modelSource value, it cannot be specified in the props.\n');
});

test('Create cross region Inference Profile by default', () => {
  const stack = new cdk.Stack();

  const testName = "test-profile";
  buildInferenceProfile(stack, "test-profile", {
    bedrockModelId: "amazon.nova-lite-v1:0",
    inferenceProfileProps: {
      inferenceProfileName: testName
    }
  });
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::Bedrock::ApplicationInferenceProfile", 1);
  template.hasResourceProperties("AWS::Bedrock::ApplicationInferenceProfile", {
    InferenceProfileName: testName,
  });
});


