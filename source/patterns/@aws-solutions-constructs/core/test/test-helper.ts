/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Bucket, CfnBucket, BucketProps } from "@aws-cdk/aws-s3";
import { Construct, RemovalPolicy } from "@aws-cdk/core";
import { overrideProps } from "../lib/utils";
import * as path from 'path';

// Creates a bucket used for testing - minimal properties, destroyed after test
export function CreateScrapBucket(scope: Construct, props?: BucketProps | any) {
  const defaultProps = {
    versioned: false,
    removalPolicy: RemovalPolicy.DESTROY,
  };

  let synthesizedProps: BucketProps;
  if (props) {
    synthesizedProps = overrideProps(defaultProps, props);
  } else {
    synthesizedProps = defaultProps;
  }

  const scriptBucket = new Bucket(
    scope,
    "existingScriptLocation",
    synthesizedProps
  );

  (scriptBucket.node.defaultChild as CfnBucket).cfnOptions.metadata = {
    cfn_nag: {
      rules_to_suppress: [
        {
          id: "W51",
          reason:
            "This S3 bucket is created for unit/ integration testing purposes only and not part of \
      the actual construct implementation",
        },
        {
          id: "W35",
          reason:
            "This S3 bucket is created for unit/ integration testing purposes only and not part of \
      the actual construct implementation",
        },
        {
          id: "W41",
          reason:
            "This S3 bucket is created for unit/ integration testing purposes only and not part of \
      the actual construct",
        },
      ],
    },
  };

  return scriptBucket;
}

/**
 * @summary Creates a stack name for Integration tests
 * @param {string} filename - the filename of the integ test
 * @returns {string} - a string with current filename after removing anything before the prefix '.' and suffix '.js'
 * e.g. 'integ.apigateway-dynamodb-CRUD.js' will return 'apigateway-dynamodb-CRUD'
 */
export function generateIntegStackName(filename: string): string {
  const file = path.basename(filename, path.extname(filename));
  const stackname = file.slice(file.lastIndexOf('.') + 1);
  return stackname;
}
