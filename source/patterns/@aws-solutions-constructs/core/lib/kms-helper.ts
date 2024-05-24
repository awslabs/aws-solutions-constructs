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

import * as kms from 'aws-cdk-lib/aws-kms';
import { DefaultEncryptionProps } from './kms-defaults';
import { consolidateProps } from './utils';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildEncryptionKey(scope: Construct, id: string, keyProps?: kms.KeyProps): kms.Key {
  // Setup the key properties
  let encryptionKeyProps;

  // If property overrides have been provided, incorporate them and deploy
  encryptionKeyProps = consolidateProps(DefaultEncryptionProps, keyProps);

  // Create the encryption key and return
  return new kms.Key(scope, `'${id}Key'`, encryptionKeyProps);
}