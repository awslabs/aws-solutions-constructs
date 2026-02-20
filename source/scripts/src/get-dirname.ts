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

/**
 * Small module to isolate import.meta.url usage.
 * This allows the rest of the code to be Jest-compatible.
 */

import { fileURLToPath } from 'url';
import * as path from 'path';

/**
 * Gets the directory name of the current module.
 * ES modules don't have __dirname, so we reconstruct it from import.meta.url.
 * 
 * @returns The directory path of the current module
 */
export function getDirName(): string {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
}
