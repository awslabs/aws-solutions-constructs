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

import * as defaults from "../index";
import { CreateScrapBucket } from "./test-helper";
import { Stack } from "aws-cdk-lib";

test("CheckTranslateProps with valid asyncJobs true", () => {
  const props = {
    asyncJobs: true,
    sourceBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).not.toThrow();
});

test("CheckTranslateProps with valid asyncJobs false", () => {
  const props = {
    asyncJobs: false
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).not.toThrow();
});

test("CheckTranslateProps throws error when asyncJobs is false and existingSourceBucketObj is provided", () => {
  const stack = new Stack();
  const props = {
    asyncJobs: false,
    existingSourceBucketObj: CreateScrapBucket(stack, "testbucket")
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and sourceBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    sourceBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and existingDestinationBucketObj is provided", () => {
  const stack = new Stack();
  const props = {
    asyncJobs: false,
    existingDestinationBucketObj: CreateScrapBucket(stack, "testbucket")
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and destinationBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    destinationBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and sourceLoggingBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    sourceLoggingBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and destinationLoggingBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    destinationLoggingBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and logSourceS3AccessLogs is provided", () => {
  const props = {
    asyncJobs: false,
    logSourceS3AccessLogs: true
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and logDestinationS3AccessLogs is provided", () => {
  const props = {
    asyncJobs: false,
    logDestinationS3AccessLogs: true
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and sourceBucketEnvironmentVariableName is provided", () => {
  const props = {
    asyncJobs: false,
    sourceBucketEnvironmentVariableName: 'MY_SOURCE_BUCKET'
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and destinationBucketEnvironmentVariableName is provided", () => {
  const props = {
    asyncJobs: false,
    destinationBucketEnvironmentVariableName: 'MY_DEST_BUCKET'
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and useSameBucket is provided", () => {
  const props = {
    asyncJobs: false,
    useSameBucket: true
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when useSameBucket is true and existingDestinationBucketObj is provided", () => {
  const stack = new Stack();
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    existingDestinationBucketObj: CreateScrapBucket(stack, "testbucket")
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTranslateProps throws error when useSameBucket is true and destinationBucketProps is provided", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    destinationBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTranslateProps throws error when useSameBucket is true and destinationLoggingBucketProps is provided", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    destinationLoggingBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTranslateProps throws error when useSameBucket is true and logDestinationS3AccessLogs is provided", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    logDestinationS3AccessLogs: true
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTranslateProps with valid useSameBucket true and source bucket props", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    sourceBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).not.toThrow();
});
