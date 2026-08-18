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

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { buildS3Bucket } from './s3-bucket-helper';
import { EnvironmentVariableDefinition } from './polly-helper';
import { BucketDetails } from './translate-helper';
import { CheckListValues } from './utils';

/**
 * The Amazon Comprehend processing modes a Lambda function may use. The actions granted to the
 * function are the cross product of the selected use cases and the selected analysis types.
 */
export enum ComprehendUseCase {
  SINGLE_DOCUMENT_SYNC = 'SINGLE_DOCUMENT_SYNC',
  MULTI_DOCUMENT_SYNC = 'MULTI_DOCUMENT_SYNC',
  ASYNC_BATCH = 'ASYNC_BATCH'
}

/**
 * The Amazon Comprehend analysis families a Lambda function may use.
 */
export enum ComprehendAnalysisType {
  DOMINANT_LANGUAGE = 'DOMINANT_LANGUAGE',
  ENTITIES = 'ENTITIES',
  KEY_PHRASES = 'KEY_PHRASES',
  SENTIMENT = 'SENTIMENT',
  TARGETED_SENTIMENT = 'TARGETED_SENTIMENT',
  SYNTAX = 'SYNTAX',
  PII = 'PII'
}

export interface ComprehendProps {
  readonly comprehendUseCases?: ComprehendUseCase[];
  readonly analysisTypes?: ComprehendAnalysisType[];
  readonly existingSourceBucketObj?: s3.IBucket;
  readonly sourceBucketProps?: s3.BucketProps;
  readonly sourceLoggingBucketProps?: s3.BucketProps;
  readonly logSourceS3AccessLogs?: boolean;
  readonly existingDestinationBucketObj?: s3.IBucket;
  readonly destinationBucketProps?: s3.BucketProps;
  readonly destinationLoggingBucketProps?: s3.BucketProps;
  readonly logDestinationS3AccessLogs?: boolean;
  readonly useSameBucket?: boolean;
  readonly sourceBucketEnvironmentVariableName?: string;
  readonly destinationBucketEnvironmentVariableName?: string;
  readonly dataAccessRoleArnEnvironmentVariableName?: string;
}

export interface ComprehendConfiguration {
  readonly lambdaIamActionsRequired: string[],
  readonly environmentVariables: EnvironmentVariableDefinition[],
  readonly dataAccessRole?: iam.Role,
  readonly sourceBucket?: BucketDetails,
  readonly destinationBucket?: BucketDetails,
}

/**
 * The set of use cases and analysis types actually in effect, after defaults have been applied
 * and duplicates removed. Both the validation function and the configuration function work from
 * this shape, so they can never disagree about what the client selected.
 */
export interface ComprehendSelection {
  readonly useCases: ComprehendUseCase[];
  readonly analysisTypes: ComprehendAnalysisType[];
}

/*
 *  The ragged cross product of Amazon Comprehend's processing modes and analysis families,
 *  expressed as one flat record keyed by analysis type. An absent field means the mode does not
 *  exist for that family - absence rather than an empty array, so that a gap in the service's
 *  API surface cannot be confused with an intentionally empty list.
 */
interface ComprehendActionDefinition {
  readonly singleDocumentActions?: string[];
  readonly multiDocumentAction?: string;
  readonly asyncJobFamily?: string;
}

const COMPREHEND_ACTIONS: Record<ComprehendAnalysisType, ComprehendActionDefinition> = {
  [ComprehendAnalysisType.DOMINANT_LANGUAGE]: {
    singleDocumentActions: ['DetectDominantLanguage'],
    multiDocumentAction: 'BatchDetectDominantLanguage',
    asyncJobFamily: 'DominantLanguageDetectionJob'
  },
  [ComprehendAnalysisType.ENTITIES]: {
    singleDocumentActions: ['DetectEntities'],
    multiDocumentAction: 'BatchDetectEntities',
    asyncJobFamily: 'EntitiesDetectionJob'
  },
  [ComprehendAnalysisType.KEY_PHRASES]: {
    singleDocumentActions: ['DetectKeyPhrases'],
    multiDocumentAction: 'BatchDetectKeyPhrases',
    asyncJobFamily: 'KeyPhrasesDetectionJob'
  },
  [ComprehendAnalysisType.SENTIMENT]: {
    singleDocumentActions: ['DetectSentiment'],
    multiDocumentAction: 'BatchDetectSentiment',
    asyncJobFamily: 'SentimentDetectionJob'
  },
  [ComprehendAnalysisType.TARGETED_SENTIMENT]: {
    singleDocumentActions: ['DetectTargetedSentiment'],
    multiDocumentAction: 'BatchDetectTargetedSentiment',
    asyncJobFamily: 'TargetedSentimentDetectionJob'
  },
  // Amazon Comprehend offers no syntax detection job, so asyncJobFamily is absent
  [ComprehendAnalysisType.SYNTAX]: {
    singleDocumentActions: ['DetectSyntax'],
    multiDocumentAction: 'BatchDetectSyntax'
  },
  // Amazon Comprehend offers no BatchDetectPiiEntities, so multiDocumentAction is absent
  [ComprehendAnalysisType.PII]: {
    singleDocumentActions: ['DetectPiiEntities', 'ContainsPiiEntities'],
    asyncJobFamily: 'PiiEntitiesDetectionJob'
  }
};

const DEFAULT_USE_CASES: ComprehendUseCase[] = [
  ComprehendUseCase.SINGLE_DOCUMENT_SYNC,
  ComprehendUseCase.MULTI_DOCUMENT_SYNC
];

/*
 *  Every asynchronous job family supports the same four operations. Note the plural on the
 *  List form - ListEntitiesDetectionJobs, not ListEntitiesDetectionJob.
 */
function asyncJobActions(asyncJobFamily: string): string[] {
  return [
    `Start${asyncJobFamily}`,
    `Describe${asyncJobFamily}`,
    `List${asyncJobFamily}s`,
    `Stop${asyncJobFamily}`
  ];
}

function deduplicate<T>(values: T[]): T[] {
  const uniqueValues: T[] = [];
  values.forEach(value => {
    if (!uniqueValues.includes(value)) {
      uniqueValues.push(value);
    }
  });
  return uniqueValues;
}

/*
 *  Apply the documented defaults and remove duplicate members. A duplicate is redundant rather
 *  than wrong, so it is dropped silently.
 */
export function resolveComprehendSelection(props: ComprehendProps): ComprehendSelection {
  const useCases = props.comprehendUseCases ?? DEFAULT_USE_CASES;
  const analysisTypes = props.analysisTypes ?? Object.values(ComprehendAnalysisType);

  return {
    useCases: deduplicate(useCases),
    analysisTypes: deduplicate(analysisTypes)
  };
}

/*
 *  The un-prefixed Comprehend actions produced by one (use case, analysis type) pairing. An
 *  empty result is a gap in the service's API surface, not an error - it is only an error when
 *  an analysis type produces nothing under any selected use case.
 */
function actionsForCombination(useCase: ComprehendUseCase, analysisType: ComprehendAnalysisType): string[] {
  const definition = COMPREHEND_ACTIONS[analysisType];

  switch (useCase) {
    case ComprehendUseCase.SINGLE_DOCUMENT_SYNC:
      return definition.singleDocumentActions ?? [];
    case ComprehendUseCase.MULTI_DOCUMENT_SYNC:
      return definition.multiDocumentAction ? [definition.multiDocumentAction] : [];
    case ComprehendUseCase.ASYNC_BATCH:
      return definition.asyncJobFamily ? asyncJobActions(definition.asyncJobFamily) : [];
    default:
      return [];
  }
}

/*
 *  Emit the IAM actions with the use case as the outer loop and the analysis type as the inner
 *  loop, both walked in enum declaration order rather than in the order the client listed them.
 *  Two stacks configured with the same selections in different array orders therefore synthesize
 *  identical policies.
 */
function generateComprehendActions(selection: ComprehendSelection): string[] {
  const actions: string[] = [];

  Object.values(ComprehendUseCase).forEach(useCase => {
    if (selection.useCases.includes(useCase)) {
      Object.values(ComprehendAnalysisType).forEach(analysisType => {
        if (selection.analysisTypes.includes(analysisType)) {
          actionsForCombination(useCase, analysisType).forEach(action => {
            const qualifiedAction = `comprehend:${action}`;
            if (!actions.includes(qualifiedAction)) {
              actions.push(qualifiedAction);
            }
          });
        }
      });
    }
  });

  return actions;
}

function buildBucketDetails(scope: Construct, bucketId: string, bucketProps?: s3.BucketProps,
  loggingBucketProps?: s3.BucketProps, logS3AccessLogs?: boolean): BucketDetails {
  const buildS3BucketResponse = buildS3Bucket(scope, {
    bucketProps,
    loggingBucketProps,
    logS3AccessLogs
  }, bucketId);

  return {
    bucket: buildS3BucketResponse.bucket,
    bucketInterface: buildS3BucketResponse.bucket,
    loggingBucket: buildS3BucketResponse.loggingBucket
  };
}

export function ConfigureComprehendSupport(scope: Construct, id: string, props: ComprehendProps,
  grantee: iam.IGrantable): ComprehendConfiguration {

  const selection = resolveComprehendSelection(props);
  const lambdaIamActionsRequired = generateComprehendActions(selection);
  const environmentVariables: EnvironmentVariableDefinition[] = [];

  if (!selection.useCases.includes(ComprehendUseCase.ASYNC_BATCH)) {
    // Synchronous Comprehend APIs carry the document in the request and the result in the
    // response, so there is nothing to stage in S3 and no role for Comprehend to assume
    return { lambdaIamActionsRequired, environmentVariables };
  }

  // Set up the source bucket, from which Comprehend reads job input
  const sourceBucket: BucketDetails = props.existingSourceBucketObj
    ? { bucketInterface: props.existingSourceBucketObj }
    : buildBucketDetails(scope, `${id}-source-bucket`, props.sourceBucketProps,
      props.sourceLoggingBucketProps, props.logSourceS3AccessLogs);

  // Set up the destination bucket, to which Comprehend writes job output. When useSameBucket is
  // true the source bucket serves both roles, so the same details are reused
  let destinationBucket: BucketDetails;
  if (props.useSameBucket) {
    destinationBucket = sourceBucket;
  } else if (props.existingDestinationBucketObj) {
    destinationBucket = { bucketInterface: props.existingDestinationBucketObj };
  } else {
    destinationBucket = buildBucketDetails(scope, `${id}-destination-bucket`, props.destinationBucketProps,
      props.destinationLoggingBucketProps, props.logDestinationS3AccessLogs);
  }

  // Set up the role Comprehend assumes to reach the buckets. The aws:SourceAccount condition
  // guards against the confused deputy pattern, in which another account's job names this role
  const dataAccessRole = new iam.Role(scope, `${id}-comprehend-data-access-role`, {
    assumedBy: new iam.ServicePrincipal('comprehend.amazonaws.com', {
      conditions: {
        StringEquals: {
          'aws:SourceAccount': cdk.Stack.of(scope).account
        }
      }
    })
  });

  // Grant against the bucket interface rather than the bucket, so that buckets supplied by the
  // client receive grants as well as buckets the construct created. The construct's buckets use
  // S3 managed encryption, which requires no key policy grant, so no KMS permission is granted
  if (props.useSameBucket) {
    sourceBucket.bucketInterface.grantReadWrite(dataAccessRole);
    sourceBucket.bucketInterface.grantReadWrite(grantee);
  } else {
    sourceBucket.bucketInterface.grantRead(dataAccessRole);
    destinationBucket.bucketInterface.grantReadWrite(dataAccessRole);
    sourceBucket.bucketInterface.grantReadWrite(grantee);
    destinationBucket.bucketInterface.grantRead(grantee);
  }

  // Starting a job requires passing the data access role to Comprehend. Without the
  // iam:PassedToService condition the grant would allow the role to be passed to any service
  // that trusts it
  iam.Grant.addToPrincipal({
    grantee,
    actions: ['iam:PassRole'],
    resourceArns: [dataAccessRole.roleArn],
    conditions: {
      StringEquals: {
        'iam:PassedToService': 'comprehend.amazonaws.com'
      }
    }
  });

  environmentVariables.push({
    defaultName: 'SOURCE_BUCKET_NAME',
    clientNameOverride: props.sourceBucketEnvironmentVariableName,
    value: sourceBucket.bucketInterface.bucketName
  });
  environmentVariables.push({
    defaultName: 'DESTINATION_BUCKET_NAME',
    clientNameOverride: props.destinationBucketEnvironmentVariableName,
    value: destinationBucket.bucketInterface.bucketName
  });
  environmentVariables.push({
    defaultName: 'DATA_ACCESS_ROLE_ARN',
    clientNameOverride: props.dataAccessRoleArnEnvironmentVariableName,
    value: dataAccessRole.roleArn
  });

  return {
    lambdaIamActionsRequired,
    environmentVariables,
    dataAccessRole,
    sourceBucket,
    destinationBucket
  };
}

export function CheckComprehendProps(props: ComprehendProps): void {
  let errorMessages = '';
  let errorFound = false;

  // Members that are not values of the enum are rejected before anything else, because every check
  // below is meaningless for a value the service does not recognize - and the COMPREHEND_ACTIONS
  // lookup would read undefined for it. These two checks throw on the first bad value rather than
  // accumulating, so a client cannot reach the rest of the function with one. Empty arrays pass
  // through here and are reported by the two checks that follow. Typescript, Java and .NET clients
  // are already protected by the enum types, so this guards Javascript clients and values that
  // reach the props from configuration
  CheckListValues(Object.values(ComprehendUseCase), props.comprehendUseCases ?? [], 'comprehendUseCases value');
  CheckListValues(Object.values(ComprehendAnalysisType), props.analysisTypes ?? [], 'analysisTypes value');

  if (props.comprehendUseCases && props.comprehendUseCases.length === 0) {
    errorMessages += 'Error - comprehendUseCases cannot be an empty array. Omit the property to accept the default, '
      + 'or supply at least one ComprehendUseCase.\n';
    errorFound = true;
  }

  if (props.analysisTypes && props.analysisTypes.length === 0) {
    errorMessages += 'Error - analysisTypes cannot be an empty array. Omit the property to accept the default, '
      + 'or supply at least one ComprehendAnalysisType.\n';
    errorFound = true;
  }

  const selection = resolveComprehendSelection(props);

  // An analysis type the client asked for that has no action under any selected use case cannot
  // be honored at all. Gaps are tolerated when the selection is productive elsewhere, so this is
  // checked per analysis type rather than per combination. Only client supplied types are
  // checked - the default set names every family rather than expressing a request for any one of
  // them, so its gaps are skipped silently and selecting ASYNC_BATCH alone remains valid. An
  // empty selection is already reported above
  if (props.analysisTypes && selection.useCases.length > 0 && selection.analysisTypes.length > 0) {
    selection.analysisTypes.forEach(analysisType => {
      const productive = selection.useCases.some(useCase => actionsForCombination(useCase, analysisType).length > 0);
      if (!productive) {
        errorMessages += `Error - the analysisTypes value ${analysisType} produces no Amazon Comprehend actions for `
          + 'any of the selected comprehendUseCases. Remove it, or add a use case that supports it.\n';
        errorFound = true;
      }
    });
  }

  if (!selection.useCases.includes(ComprehendUseCase.ASYNC_BATCH)) {
    if (props.existingSourceBucketObj || props.sourceBucketProps ||
      props.sourceLoggingBucketProps || props.logSourceS3AccessLogs !== undefined ||
      props.existingDestinationBucketObj || props.destinationBucketProps ||
      props.destinationLoggingBucketProps || props.logDestinationS3AccessLogs !== undefined ||
      props.useSameBucket !== undefined ||
      props.sourceBucketEnvironmentVariableName || props.destinationBucketEnvironmentVariableName ||
      props.dataAccessRoleArnEnvironmentVariableName) {
      errorMessages += 'Error - bucket and environment variable name properties can only be provided when '
        + 'comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.\n';
      errorFound = true;
    }
  }

  if (props.useSameBucket) {
    if (props.existingDestinationBucketObj || props.destinationBucketProps ||
      props.destinationLoggingBucketProps || props.logDestinationS3AccessLogs !== undefined) {
      errorMessages += 'Error - destination bucket properties cannot be provided when useSameBucket is true.\n';
      errorFound = true;
    }
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
