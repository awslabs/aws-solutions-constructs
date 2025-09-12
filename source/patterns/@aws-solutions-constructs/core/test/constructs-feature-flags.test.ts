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

// Imports
import * as cdk from 'aws-cdk-lib';
import { ArtifactType } from '@aws-cdk/cloud-assembly-schema';
import { ConstructsFeatureFlagsReport } from '../lib/constructs-feature-flags';

test('test ConstructsFeatureFlagsReport synthesis and manifest output', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  // Call ConstructsFeatureFlagsReport.ensure()
  ConstructsFeatureFlagsReport.ensure(stack);

  // Synthesize the stack
  const assembly = app.synth();

  // Examine the manifest output
  const manifest = assembly.manifest;

  // Verify the manifest contains our feature flag report artifact
  const featureFlagArtifact = Object.values(manifest.artifacts || {}).find(
    artifact => ((artifact.type === ArtifactType.FEATURE_FLAG_REPORT) && ((artifact.properties! as any).module === '@aws-solutions-constructs'))
  );

  expect(featureFlagArtifact).toBeDefined();

  // Cast to any to access custom properties since TypeScript doesn't know about our custom artifact type
  const artifactProps = featureFlagArtifact?.properties as any;

  expect(artifactProps?.module).toBe('@aws-solutions-constructs');
  const flags = artifactProps?.flags;
  expect(flags).toBeDefined();
  const keys = Object.keys(artifactProps?.flags);
  expect(keys.length).toBeGreaterThanOrEqual(1);

  // Check every flag entry
  const FLAG_NAME_PREFIX = "@aws-solutions-constructs";
  keys.forEach(keyName => {
    // Is the name of the flag of the correct format?
    const prefix = keyName.substring(0, FLAG_NAME_PREFIX.length);
    expect(prefix).toEqual(FLAG_NAME_PREFIX);

    // Verify the flag structure
    const constructsFlag = flags[keyName];
    expect(constructsFlag).toHaveProperty('recommendedValue', true);
    expect(constructsFlag).toHaveProperty('explanation');
  });

});