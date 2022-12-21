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

import { Secret, SecretProps } from 'aws-cdk-lib/aws-secretsmanager';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { DefaultSecretProps } from './secretsmanager-defaults';
import { consolidateProps, addCfnSuppressRules } from './utils';

/**
 * Method to build the default AWS Secrets Manager Secret
 *
 * @param scope
 * @param id
 * @param secretProps
 */
export function buildSecretsManagerSecret(scope: Construct, id: string, secretProps?: SecretProps): Secret {
  let secret: Secret;

  secret = new Secret(scope, id, consolidateProps(DefaultSecretProps, secretProps));

  // suppress warning on build
  addCfnSuppressRules(secret, [
    {
      id: 'W77',
      reason: `We allow the use of the AWS account default key aws/secretsmanager for secret encryption.`
    }
  ]);

  return secret;
}
