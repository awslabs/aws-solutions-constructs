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

import { Stack } from "aws-cdk-lib";
import { addCfnSuppressRules } from "@aws-solutions-constructs/core";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export function CreateTestDistro(
  stack: Stack,
  id: string
): cloudfront.Distribution {
  const newDistro = new cloudfront.Distribution(stack, id, {
    defaultBehavior: {
      origin: new origins.OriginGroup({
        primaryOrigin: new origins.HttpOrigin("www.example.com"),
        fallbackOrigin: new origins.HttpOrigin("admin.example.com"),
        // optional, defaults to: 500, 502, 503 and 504
        fallbackStatusCodes: [404],
      }),
    },
  });
  addCfnSuppressRules(newDistro, [{ id: "W10", reason: "Test Resource" }]);
  addCfnSuppressRules(newDistro, [{ id: "W70", reason: "Test Resource" }]);
  return newDistro;
}
