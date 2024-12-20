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

import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { DefaultSecretProps } from './secretsmanager-defaults';
import { consolidateProps, addL2CfnSuppressRules } from './utils';

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Method to build the default AWS Secrets Manager Secret
 *
 * @param scope
 * @param id
 * @param secretProps
 */
export function buildSecretsManagerSecret(scope: Construct, id: string, secretProps?: secrets.SecretProps): secrets.Secret {
  let secret: secrets.Secret;

  secret = new secrets.Secret(scope, id, consolidateProps(DefaultSecretProps, secretProps));

  // suppress warning on build
  addL2CfnSuppressRules(secret, [
    {
      id: 'W77',
      reason: `We allow the use of the AWS account default key aws/secretsmanager for secret encryption.`
    }
  ]);

  return secret;
}

export interface SecretsManagerProps {
  readonly existingSecretObj?: secrets.Secret;
  readonly secretProps?: secrets.SecretProps;
}

export function CheckSecretsManagerProps(propsObject: SecretsManagerProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.existingSecretObj && propsObject.secretProps) {
    errorMessages += 'Error - Either provide secretProps or existingSecretObj, but not both.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
