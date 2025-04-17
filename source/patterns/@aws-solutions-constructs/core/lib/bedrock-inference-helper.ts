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
import * as cdk from 'aws-cdk-lib';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as defaults from '../index';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

export interface BuildInferenceProfileProps {
  readonly bedrockModelId: string;
  readonly inferenceProfileProps?: bedrock.CfnApplicationInferenceProfileProps;
  readonly deployCrossRegionProfile?: boolean;
}

export interface BuildInferenceProfileReponse {
  readonly crossRegion?: boolean,
  readonly inferenceProfile: bedrock.CfnApplicationInferenceProfile,
}

export function buildInferenceProfile(scope: Construct, id: string, props: BuildInferenceProfileProps): BuildInferenceProfileReponse {
  const areaMap = createAreaPrefixMapping(scope, id);
  const crossRegion = defaults.CheckBooleanWithDefault(props.deployCrossRegionProfile, true);

  const regionTag = cdk.Fn.select(0, cdk.Fn.split('-', cdk.Aws.REGION));

  const inferenceSourceArn = crossRegion ?
    `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:inference-profile/${areaMap.mapping.findInMap(regionTag, "prefix")}.${props.bedrockModelId}` :
    `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:foundation-model/${props.bedrockModelId}`;

  const constructInferenceProps: bedrock.CfnApplicationInferenceProfileProps = {
    modelSource: {
      copyFrom: inferenceSourceArn
    },
    inferenceProfileName: defaults.generatePhysicalInferenceProfileName("", [id])
  };
  const finalProps = defaults.consolidateProps(constructInferenceProps, props.inferenceProfileProps);
  const inferenceProfile = new bedrock.CfnApplicationInferenceProfile(scope, `${id}-inference`, finalProps);

  return {
    inferenceProfile,
    crossRegion
  };
}

export interface MappingResponse {
  readonly mappingName: string,
  readonly mapping: cdk.CfnMapping,
}

export function createAreaPrefixMapping(scope: Construct, id: string): MappingResponse {
  const mappingName = defaults.removeNonAlphanumeric(`${id}-area-prefix-mapping`);
  const newMapping = new cdk.CfnMapping(scope, `${id}-area-prefix-mapping`, {
    mapping: {
      'us': {
        prefix: 'us',
      },
      'eu': {
        prefix: 'eu',
      },
      'ap': {
        prefix: 'apac',
      },
    }
  });
  newMapping.overrideLogicalId(mappingName);
  return {
    mapping: newMapping,
    mappingName
  };
}

export function createAreaRegionMapping(scope: Construct, id: string, model: string): MappingResponse {
  const mappingName = defaults.removeNonAlphanumeric(`${id}-area-region-mapping`);
  const newMapping = new cdk.CfnMapping(scope, `${id}-area-region-mapping`, {
    mapping: {
      'eu': {
        regionalModels:
          `arn:aws:bedrock:eu-north-1::foundation-model/${model},`+
          `arn:aws:bedrock:eu-central-1::foundation-model/${model},`+
          `arn:aws:bedrock:eu-west-1::foundation-model/${model},`+
          `arn:aws:bedrock:eu-west-3::foundation-model/${model}`
      },
      'us': {
        regionalModels:
          `arn:aws:bedrock:us-east-1::foundation-model/${model},`+
          `arn:aws:bedrock:us-east-2::foundation-model/${model},`+
          `arn:aws:bedrock:us-west-2::foundation-model/${model}`
        },
      'ap': {
        regionalModels:
          `arn:aws:bedrock:ap-southeast-2::foundation-model/${model},`+
          `arn:aws:bedrock:ap-northeast-1::foundation-model/${model},`+
          `arn:aws:bedrock:ap-south-1::foundation-model/${model},`+
          `arn:aws:bedrock:ap-northeast-2::foundation-model/${model},`+
          `arn:aws:bedrock:ap-southeast-1::foundation-model/${model},`+
          `arn:aws:bedrock:ap-northeast-3::foundation-model/${model}`
      }
    }
  });
  newMapping.overrideLogicalId(mappingName);
  return {
    mapping: newMapping,
    mappingName
  };
}

export interface BedrockInferenceProps {
  readonly bedrockModelId: string;
  readonly inferenceProfileProps?: bedrock.CfnApplicationInferenceProfileProps;
  readonly deployCrossRegionProfile?: boolean;
}

export function CheckBedrockInferenceProps(propsObject: BedrockInferenceProps) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.inferenceProfileProps?.modelSource) {
    errorMessages += 'Error - The construct will create the modelSource value, it cannot be specified in the props.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}