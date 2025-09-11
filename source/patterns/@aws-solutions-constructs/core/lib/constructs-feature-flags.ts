import { Construct } from 'constructs';
import { attachCustomSynthesis, ISynthesisSession } from 'aws-cdk-lib';
import { ArtifactType, FeatureFlag } from '@aws-cdk/cloud-assembly-schema';

const QUEUE_USE_SSE = "@aws-solutions-constructs/aws-sqs:QueueUseSse";

/**
 * A CDK L3 construct that creates resources for Solutions Feature Flags reporting
 */
export class ConstructsFeatureFlagsReport extends Construct {

  static created = false;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    if (!ConstructsFeatureFlagsReport.created) {
      ConstructsFeatureFlagsReport.created = true;
      attachCustomSynthesis(this, {
        onSynthesize: (session: ISynthesisSession) => {
          session.assembly.addArtifact("@aws-solutions-constructs/feature-flag-report", {
            type: ArtifactType.FEATURE_FLAG_REPORT,
            properties: {
              module: '@aws-solutions-constructs',
              flags: this.GetFlagDefinitions()
            }
          });
        },
      });
    }
  }

  private GetFlagDefinitions(): Record<string, FeatureFlag> {
    return {
      [QUEUE_USE_SSE]: {
        recommendedValue: true,
        explanation: "Change the default behavior for the construct to encrypt the queue using Server Side Encryption (SSE)",
        userValue: this.node.tryGetContext(QUEUE_USE_SSE)
      }
    }
  }
}
