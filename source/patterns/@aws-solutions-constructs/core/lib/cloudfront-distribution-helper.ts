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

import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as mediastore from 'aws-cdk-lib/aws-mediastore';
import {
  DefaultCloudFrontWebDistributionForS3Props,
  DefaultCloudFrontWebDistributionForApiGatewayProps,
  DefaultCloudFrontDistributionForMediaStoreProps
} from './cloudfront-distribution-defaults';
import { addCfnSuppressRules, consolidateProps, generatePhysicalName } from './utils';
import { createCloudFrontLoggingBucket } from './s3-bucket-helper';
import { DefaultS3Props } from './s3-bucket-defaults';
import { S3OacOrigin } from './s3-oac-origin';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

// Override Cfn_Nag rule: Cloudfront TLS-1.2 rule (https://github.com/stelligent/cfn_nag/issues/384)
function updateSecurityPolicy(cfDistribution: cloudfront.Distribution) {
  addCfnSuppressRules(cfDistribution, [
    {
      id: 'W70',
      reason: `Since the distribution uses the CloudFront domain name, CloudFront automatically sets the security policy to TLSv1 regardless of the value of MinimumProtocolVersion`
    }
  ]);

  return cfDistribution;
}

// Cloudfront function to insert the HTTP Security Headers into the response coming from the origin servers
// and before it is sent to the client
function defaultCloudfrontFunction(scope: Construct): cloudfront.Function {
  // generate a stable unique id for the cloudfront function and use it
  // both for the function name and the logical id of the function so if
  // it is changed the function will be recreated.
  // see https://github.com/aws/aws-cdk/issues/15523
  const functionId = `SetHttpSecurityHeaders${scope.node.addr}`;

  return new cloudfront.Function(scope, "SetHttpSecurityHeaders", {
    functionName: functionId,
    code: cloudfront.FunctionCode.fromInline("function handler(event) { " +
      "var response = event.response; " +
      "var headers = response.headers; " +
      "headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload'}; " +
      "headers['content-security-policy'] = { value: \"default-src 'none'; img-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'\"}; " +
      "headers['x-content-type-options'] = { value: 'nosniff'}; headers['x-frame-options'] = {value: 'DENY'}; " +
      "headers['x-xss-protection'] = {value: '1; mode=block'}; " +
      "return response; }")
  });
}

export interface CloudFrontDistributionForApiGatewayResponse {
  readonly distribution: cloudfront.Distribution,
  readonly cloudfrontFunction?: cloudfront.Function,
  readonly loggingBucket?: s3.Bucket
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function CloudFrontDistributionForApiGateway(scope: Construct,
  apiEndPoint: api.RestApi,
  cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  httpSecurityHeaders: boolean = true,
  cloudFrontLoggingBucketProps?: s3.BucketProps,
  responseHeadersPolicyProps?: cloudfront.ResponseHeadersPolicyProps
): CloudFrontDistributionForApiGatewayResponse {

  const cloudfrontFunction = getCloudfrontFunction(httpSecurityHeaders, scope);

  const getLoggingBucketResponse = getLoggingBucket(scope,  { cloudFrontLoggingBucketProps, cloudFrontDistributionProps });

  const defaultprops = DefaultCloudFrontWebDistributionForApiGatewayProps(apiEndPoint,
    getLoggingBucketResponse.logBucket,
    httpSecurityHeaders,
    cloudfrontFunction,
    responseHeadersPolicyProps ? new cloudfront.ResponseHeadersPolicy(scope, 'ResponseHeadersPolicy', responseHeadersPolicyProps) : undefined
  );

  const cfprops = consolidateProps(defaultprops, cloudFrontDistributionProps);
  // Create the Cloudfront Distribution
  const cfDistribution = new cloudfront.Distribution(scope, 'CloudFrontDistribution', cfprops);
  updateSecurityPolicy(cfDistribution);

  return { distribution: cfDistribution, cloudfrontFunction, loggingBucket: getLoggingBucketResponse.logBucket};
}

export interface CreateCloudFrontDistributionForS3Props {
  readonly sourceBucket: s3.IBucket,
  readonly cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  readonly httpSecurityHeaders?: boolean,
  readonly cloudFrontLoggingBucketProps?: s3.BucketProps,
  readonly  cloudFrontLoggingBucketS3AccessLogBucketProps?: s3.BucketProps,
  readonly responseHeadersPolicyProps?: cloudfront.ResponseHeadersPolicyProps
  readonly logCloudFrontAccessLog?: boolean
}

export interface CreateCloudFrontDistributionForS3Response {
  readonly distribution: cloudfront.Distribution,
  readonly loggingBucket?: s3.Bucket,
  readonly loggingBucketS3AccesssLogBucket?: s3.Bucket,
  readonly cloudfrontFunction?: cloudfront.Function,
  readonly originAccessControl?: cloudfront.CfnOriginAccessControl,
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function createCloudFrontDistributionForS3(
  scope: Construct,
  id: string,
  props: CreateCloudFrontDistributionForS3Props
): CreateCloudFrontDistributionForS3Response {
  const httpSecurityHeaders = props.httpSecurityHeaders ?? true;
  const cloudfrontFunction = getCloudfrontFunction(httpSecurityHeaders, scope);

  const getLoggingBucketResponse = getLoggingBucket(scope, {
    cloudFrontDistributionProps: props.cloudFrontDistributionProps,
    cloudFrontLoggingBucketProps: props.cloudFrontLoggingBucketProps,
    cloudFrontLoggingBucketS3AccessLogBucketProps: props.cloudFrontLoggingBucketS3AccessLogBucketProps,
    enableS3AccessLogs: props.logCloudFrontAccessLog
  });

  let originAccessControl;
  let originProps = {};

  if (!props.sourceBucket.isWebsite) {
    originAccessControl = new cloudfront.CfnOriginAccessControl(scope, 'CloudFrontOac', {
      originAccessControlConfig: {
        name: generatePhysicalName('aws-cloudfront-s3-', [id], 64),
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
        description: 'Origin access control provisioned by aws-cloudfront-s3'
      }
    });
    originProps = { originAccessControl };
  }

  const origin = new S3OacOrigin(props.sourceBucket, originProps);

  const defaultprops = DefaultCloudFrontWebDistributionForS3Props(origin,
    getLoggingBucketResponse.logBucket,
    httpSecurityHeaders,
    cloudfrontFunction,
    props.responseHeadersPolicyProps ?
      new cloudfront.ResponseHeadersPolicy(scope, 'ResponseHeadersPolicy', props.responseHeadersPolicyProps) :
      undefined
  );

  const cfprops = consolidateProps(defaultprops, props.cloudFrontDistributionProps);
  // Create the Cloudfront Distribution
  const cfDistribution = new cloudfront.Distribution(scope, 'CloudFrontDistribution', cfprops);
  updateSecurityPolicy(cfDistribution);

  // Extract the CfnBucketPolicy from the sourceBucket
  const bucketPolicy = props.sourceBucket.policy as s3.BucketPolicy;
  // the lack of a bucketPolicy means the bucket was imported from outside the stack so the lack of cfn_nag suppression is not an issue
  if (bucketPolicy) {
    addCfnSuppressRules(bucketPolicy, [
      {
        id: 'F16',
        reason: `Public website bucket policy requires a wildcard principal`
      }
    ]);
  }
  return {
    distribution: cfDistribution,
    cloudfrontFunction,
    loggingBucket: getLoggingBucketResponse.logBucket,
    loggingBucketS3AccesssLogBucket: getLoggingBucketResponse.logBucketAccessLogBucket,
    originAccessControl};
}

export interface CloudFrontDistributionForMediaStoreResponse {
  readonly distribution: cloudfront.Distribution,
  readonly loggingBucket?: s3.Bucket,
  readonly requestPolicy: cloudfront.OriginRequestPolicy,
  readonly cloudfrontFunction?: cloudfront.Function
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function CloudFrontDistributionForMediaStore(scope: Construct,
  mediaStoreContainer: mediastore.CfnContainer,
  cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  httpSecurityHeaders: boolean = true,
  cloudFrontLoggingBucketProps?: s3.BucketProps,
  responseHeadersPolicyProps?: cloudfront.ResponseHeadersPolicyProps
): CloudFrontDistributionForMediaStoreResponse {

  let originRequestPolicy: cloudfront.OriginRequestPolicy;

  const getLoggingBucketResponse = getLoggingBucket(scope, { cloudFrontDistributionProps, cloudFrontLoggingBucketProps });

  if (cloudFrontDistributionProps
    && cloudFrontDistributionProps.defaultBehavior
    && cloudFrontDistributionProps.defaultBehavior.originRequestPolicy) {
    originRequestPolicy = cloudFrontDistributionProps.defaultBehavior.originRequestPolicy;
  } else {
    const originRequestPolicyProps: cloudfront.OriginRequestPolicyProps = {
      headerBehavior: {
        behavior: 'whitelist',
        headers: [
          'Access-Control-Allow-Origin',
          'Access-Control-Request-Method',
          'Access-Control-Request-Header',
          'Origin'
        ]
      },
      queryStringBehavior: {
        behavior: 'all'
      },
      cookieBehavior: {
        behavior: 'none'
      },
      comment: 'Policy for Constructs CloudFrontDistributionForMediaStore',
      originRequestPolicyName: `${cdk.Aws.STACK_NAME}-${cdk.Aws.REGION}-CloudFrontDistributionForMediaStore`
    };

    originRequestPolicy = new cloudfront.OriginRequestPolicy(scope, 'CloudfrontOriginRequestPolicy', originRequestPolicyProps);
  }

  const cloudfrontFunction = getCloudfrontFunction(httpSecurityHeaders, scope);

  const defaultprops = DefaultCloudFrontDistributionForMediaStoreProps(
    mediaStoreContainer,
    getLoggingBucketResponse.logBucket,
    originRequestPolicy,
    httpSecurityHeaders,
    cloudFrontDistributionProps?.customHeaders,
    cloudfrontFunction,
    responseHeadersPolicyProps ? new cloudfront.ResponseHeadersPolicy(scope, 'ResponseHeadersPolicy', responseHeadersPolicyProps) : undefined
  );

  let cfprops: cloudfront.DistributionProps;

  cfprops = consolidateProps(defaultprops, cloudFrontDistributionProps);

  // Create the CloudFront Distribution
  const cfDistribution = new cloudfront.Distribution(scope, 'CloudFrontDistribution', cfprops);
  updateSecurityPolicy(cfDistribution);

  return { distribution: cfDistribution, loggingBucket: getLoggingBucketResponse.logBucket, requestPolicy: originRequestPolicy, cloudfrontFunction };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function CloudFrontOriginAccessIdentity(scope: Construct, comment?: string) {
  return new cloudfront.OriginAccessIdentity(scope, 'CloudFrontOriginAccessIdentity', {
    comment: comment ? comment : `access-identity-${cdk.Aws.REGION}-${cdk.Aws.STACK_NAME}`
  });
}

interface GetLoggingBucketRequest {
  readonly cloudFrontDistributionProps: cloudfront.DistributionProps | any,
  readonly cloudFrontLoggingBucketProps?: s3.BucketProps,
  readonly cloudFrontLoggingBucketS3AccessLogBucketProps?: s3.BucketProps,
  readonly enableS3AccessLogs?: boolean
}
interface GetLoggingBucketResponse {
  logBucket?: s3.Bucket,
  logBucketAccessLogBucket?: s3.Bucket
}

function getLoggingBucket(scope: Construct, props: GetLoggingBucketRequest): GetLoggingBucketResponse {
  const isLoggingDisabled = props.cloudFrontDistributionProps?.enableLogging === false;
  const userSuppliedLogBucket = props.cloudFrontDistributionProps?.logBucket;

  if (userSuppliedLogBucket && props.cloudFrontLoggingBucketProps) {
    throw Error('Either cloudFrontDistributionProps.logBucket or cloudFrontLoggingBucketProps can be set.');
  }

  let logBucket: s3.Bucket | undefined;
  let logBuckeS3AccessLogBuckett: s3.Bucket | undefined;
  if (isLoggingDisabled) {
    logBucket = undefined;
  } else if (userSuppliedLogBucket) {
    logBucket = userSuppliedLogBucket;
  } else {
    const createBucketResponse = createCloudFrontLoggingBucket(
      scope,
      'CloudfrontLoggingBucket',
      {
        // Buckets used for CloudFront distribution logging require ACLs to be explicitly enabled, so we apply this objectOwnership
        loggingBucketProps: consolidateProps(DefaultS3Props(), props.cloudFrontLoggingBucketProps, {
          objectOwnership: s3.ObjectOwnership.OBJECT_WRITER
        }),
        s3AccessLogBucketProps: props.cloudFrontLoggingBucketS3AccessLogBucketProps,
        enableS3AccessLogs: props.enableS3AccessLogs
      });

    logBucket = createBucketResponse.logBucket;
    logBuckeS3AccessLogBuckett = createBucketResponse.s3AccessLogBucket;
    const loggingBucketResource = logBucket.node.findChild('Resource') as s3.CfnBucket;
    loggingBucketResource.addPropertyOverride('AccessControl', 'LogDeliveryWrite');
  }
  return {
    logBucket,
    logBucketAccessLogBucket: logBuckeS3AccessLogBuckett
  };
}

function getCloudfrontFunction(httpSecurityHeaders: boolean, scope: Construct) {
  return httpSecurityHeaders ? defaultCloudfrontFunction(scope) : undefined;
}

export interface CloudFrontProps {
  readonly insertHttpSecurityHeaders?: boolean;
  readonly responseHeadersPolicyProps?: cloudfront.ResponseHeadersPolicyProps;
}

export function CheckCloudFrontProps(propsObject: CloudFrontProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.insertHttpSecurityHeaders !== false && propsObject.responseHeadersPolicyProps?.securityHeadersBehavior) {
    errorMessages += 'responseHeadersPolicyProps.securityHeadersBehavior can only be passed if httpSecurityHeaders is set to `false`.';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
