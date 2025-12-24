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

import { Construct } from 'constructs';
import { App, attachCustomSynthesis, ISynthesisSession } from 'aws-cdk-lib';
import { ArtifactType, FeatureFlag } from '@aws-cdk/cloud-assembly-schema';

const QUEUE_USE_SSE = "@aws-solutions-constructs/aws-sqs:QueueUseSse";

/**
 * A CDK L3 construct that creates resources for Solutions Feature Flags reporting
 */
export class ConstructsFeatureFlagsReport extends Construct {

  public static ensure(scope: Construct) {
    const app = scope.node.root;
    if (!app || !App.isApp(app)) {
      throw new Error('Invalid scope provided to ConstructsFeatureFlagsReport');
    }
    const id = 'AwsSolutionsFeatureFlagsReport';
    if (!app.node.tryFindChild(id)) {
      new ConstructsFeatureFlagsReport(app, id);
    }
  }

  private constructor(scope: Construct, id: string) {
    super(scope, id);

    attachCustomSynthesis(this, {
      onSynthesize: (session: ISynthesisSession) => {
        session.assembly.addArtifact("@aws-solutions-constructs/feature-flag-report", {
          type: ArtifactType.FEATURE_FLAG_REPORT,
          properties: {
            module: '@aws-solutions-constructs',
            flags: this.GetFlagDefinitions()
          }
        });
      }
    });
  }

  private GetFlagDefinitions(): Record < string, FeatureFlag > {
      return {
        [QUEUE_USE_SSE]: {
          recommendedValue: true,
          explanation: "Change the default behavior for the construct to encrypt the queue using Server Side Encryption (SSE)",
          userValue: this.node.tryGetContext(QUEUE_USE_SSE)
        }
      };
    }
}
