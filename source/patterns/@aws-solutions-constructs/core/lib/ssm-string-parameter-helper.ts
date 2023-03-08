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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

import {StringParameter, StringParameterProps} from 'aws-cdk-lib/aws-ssm';
import {Construct} from 'constructs';

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Method to build the default AWS SSM Parameter Store
 *
 * @param scope
 * @param id
 * @param stringParameterProps
 */
export function buildSsmStringParameter(scope: Construct, id: string, stringParameterProps: StringParameterProps): StringParameter {
  return new StringParameter(scope, id, stringParameterProps);
}
