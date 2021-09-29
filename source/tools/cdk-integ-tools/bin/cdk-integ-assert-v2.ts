#!/usr/bin/env node
// Verify that all integration tests still match their expected output
import { canonicalizeTemplate } from '@aws-cdk/assert';
import { diffTemplate, formatDifferences, TemplateDiff } from '@aws-cdk/cloudformation-diff';
import { DEFAULT_SYNTH_OPTIONS, IntegrationTests } from '../lib/integ-helpers';

/* eslint-disable no-console */

const IGNORE_ASSETS_PRAGMA = 'pragma:ignore-assets';

async function main() {
  const tests = await new IntegrationTests('test').fromCliArgs(); // always assert all tests
  const failures: string[] = [];

  for (const test of tests) {
    process.stdout.write(`Verifying ${test.name} against ${test.expectedFileName} ... `);

    if (!test.hasExpected()) {
      throw new Error(`No such file: ${test.expectedFileName}. Run 'yarn integ'.`);
    }

    let expected = await test.readExpected();
    let actual = await test.cdkSynthFast(DEFAULT_SYNTH_OPTIONS);

    if ((await test.pragmas()).includes(IGNORE_ASSETS_PRAGMA)) {
      expected = canonicalizeTemplate(expected);
      actual = canonicalizeTemplate(actual);
    }

    const diff = diffTemplate(expected, actual);

    const v2diff = new TemplateDiff({
      awsTemplateFormatVersion: diff.awsTemplateFormatVersion,
      outputs: diff.outputs,
      description: diff.description,
      transform: diff.transform,
      conditions: diff.conditions,
      mappings: diff.mappings,
      metadata: diff.metadata,
      resources: diff.resources.filter(d => {
        if ((d?.isDifferent) && (d?.resourceType === 'AWS::Lambda::Function') && d?.oldProperties?.Code?.S3Bucket?.Ref.startsWith("AssetParameters")) {
          return false;
        } else
          return true;
      }),
      parameters: diff.parameters.filter(d => {
        if ((d?.isAddition) && (d?.newValue?.Default?.startsWith('/cdk-bootstrap/'))) {
          return false;
        } else if ((d?.isRemoval) && 
          (
            (d?.oldValue?.Description?.startsWith('S3 bucket for asset')) ||
            (d?.oldValue?.Description?.startsWith('S3 key for asset version')) || 
            (d?.oldValue?.Description?.startsWith('Artifact hash for asset'))
          )) {
          return false;
        }
        else
          return true;
      }),
      unknown: diff.unknown.filter(d => {
        if ((d?.isAddition) && (d?.newValue?.CheckBootstrapVersion)) {
          return false;
        }
        else
          return true;
      }),
    });

    if (!v2diff.isEmpty) {
      failures.push(test.name);
      process.stdout.write('CHANGED.\n');
      formatDifferences(process.stdout, v2diff);
    } else {
      process.stdout.write('OK.\n');
    }
  }

  if (failures.length > 0) {
    // eslint-disable-next-line max-len
    throw new Error(`Some stacks have changed. To verify that they still deploy successfully, run: 'yarn integ ${failures.join(' ')}'`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
