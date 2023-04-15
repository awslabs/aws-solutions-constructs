#!/usr/bin/env node
// Verify that all integration tests still match their expected output
import { canonicalizeTemplate } from "../lib/canonicalize-assets";
import { diffTemplate, formatDifferences } from "@aws-cdk/cloudformation-diff";
import { DEFAULT_SYNTH_OPTIONS, IntegrationTests } from "../lib/integ-helpers";
import * as deepmerge from "deepmerge";

/* eslint-disable no-console */

const VERIFY_ASSET_HASHES = "pragma:include-assets-hashes";

async function main() {
  const tests = await new IntegrationTests("test").fromCliArgs(); // always assert all tests
  const failures: string[] = [];

  for (const test of tests) {
    process.stdout.write(
      `Verifying ${test.name} against ${test.expectedFileName} ... `
    );

    if (!test.hasExpected()) {
      throw new Error(
        `No such file: ${test.expectedFileName}. Run 'yarn integ'.`
      );
    }

    let expected = await test.readExpected();
    // Enable Default KMS policy to match with CDK v2 expected KMS policy
    let actual = await test.cdkSynthFast(
      deepmerge(DEFAULT_SYNTH_OPTIONS, {
        context: {
          "@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy": true,
          "@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId": true,
          "@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021": true,
          "@aws-cdk/aws-rds:lowercaseDbIdentifier": true,
          "@aws-cdk/core:stackRelativeExports": true,
        }
      })
    );

    // We will always ignore asset hashes, unless specifically requested not to
    if (!(await test.pragmas()).includes(VERIFY_ASSET_HASHES)) {
      expected = canonicalizeTemplate(expected);
      actual = canonicalizeTemplate(actual);
    }

    const diff = diffTemplate(expected, actual);

    if (!diff.isEmpty) {
      failures.push(test.name);
      process.stdout.write("CHANGED.\n");
      formatDifferences(process.stdout, diff);
    } else {
      process.stdout.write("OK.\n");
    }
  }

  if (failures.length > 0) {
    // eslint-disable-next-line max-len
    throw new Error(
      `Some stacks have changed. To verify that they still deploy successfully, run: 'yarn integ ${failures.join(
        " "
      )}'`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
