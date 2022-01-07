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

import {ParameterType, StringParameter, StringParameterProps} from '@aws-cdk/aws-ssm';
import {Construct} from '@aws-cdk/core';
import {printWarning} from "./utils";

/**
 * Method to build the default AWS SSM Parameter Store
 *
 * @param scope
 * @param id
 * @param stringParameterProps
 */
export function buildSsmStringParameter(scope: Construct, id: string, stringParameterProps: StringParameterProps): StringParameter {
  let props: StringParameterProps = stringParameterProps;

  if (stringParameterProps.type && stringParameterProps.type !== ParameterType.STRING) {
    printWarning('Overriding SSM String Parameter type to be ParameterType.STRING');
    props = {
      ...stringParameterProps,
      type: ParameterType.STRING
    };
  }
  return new StringParameter(scope, id, props);
}
