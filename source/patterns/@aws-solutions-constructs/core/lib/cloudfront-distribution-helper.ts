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

import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as mediastore from 'aws-cdk-lib/aws-mediastore';
import {
  DefaultCloudFrontWebDistributionForS3Props,
  DefaultCloudFrontWebDistributionForApiGatewayProps,
  DefaultCloudFrontDisributionForMediaStoreProps
} from './cloudfront-distribution-defaults';
import { overrideProps, addCfnSuppressRules, consolidateProps } from './utils';
import { createLoggingBucket } from './s3-bucket-helper';
import { DefaultS3Props } from './s3-bucket-defaults';
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
    code: cloudfront.FunctionCode.fromInline("function handler(event) { var response = event.response; \
      var headers = response.headers; \
      headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload'}; \
      headers['content-security-policy'] = { value: \"default-src 'none'; img-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'\"}; \
      headers['x-content-type-options'] = { value: 'nosniff'}; \
      headers['x-frame-options'] = {value: 'DENY'}; \
      headers['x-xss-protection'] = {value: '1; mode=block'}; \
      return response; \
    }")
  });
}

export interface CloudFrontDistributionForApiGatewayResponse {
  readonly distribution: cloudfront.Distribution,
  readonly cloudfrontFunction?: cloudfront.Function,
  readonly loggingBucket?: s3.Bucket
}

export function CloudFrontDistributionForApiGateway(scope: Construct,
  apiEndPoint: api.RestApi,
  cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  httpSecurityHeaders: boolean = true,
  cloudFrontLoggingBucketProps?: s3.BucketProps,
  responseHeadersPolicyProps?: cloudfront.ResponseHeadersPolicyProps
): CloudFrontDistributionForApiGatewayResponse {

  const cloudfrontFunction = getCloudfrontFunction(httpSecurityHeaders, scope);

  const loggingBucket = getLoggingBucket(cloudFrontDistributionProps, scope, cloudFrontLoggingBucketProps);

  const defaultprops = DefaultCloudFrontWebDistributionForApiGatewayProps(apiEndPoint,
    loggingBucket,
    httpSecurityHeaders,
    cloudfrontFunction,
    responseHeadersPolicyProps ? new cloudfront.ResponseHeadersPolicy(scope, 'ResponseHeadersPolicy', responseHeadersPolicyProps) : undefined
  );

  const cfprops = consolidateProps(defaultprops, cloudFrontDistributionProps);
  // Create the Cloudfront Distribution
  const cfDistribution = new cloudfront.Distribution(scope, 'CloudFrontDistribution', cfprops);
  updateSecurityPolicy(cfDistribution);

  return { distribution: cfDistribution, cloudfrontFunction, loggingBucket};
}

export interface CloudFrontDistributionForS3Response {
  readonly distribution: cloudfront.Distribution,
  readonly loggingBucket?: s3.Bucket,
  readonly cloudfrontFunction?: cloudfront.Function,
}

export function CloudFrontDistributionForS3(
  scope: Construct,
  sourceBucket: s3.IBucket,
  cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  httpSecurityHeaders: boolean = true,
  originPath?: string,
  cloudFrontLoggingBucketProps?: s3.BucketProps,
  responseHeadersPolicyProps?: cloudfront.ResponseHeadersPolicyProps
): CloudFrontDistributionForS3Response {
  const cloudfrontFunction = getCloudfrontFunction(httpSecurityHeaders, scope);

  const loggingBucket = getLoggingBucket(cloudFrontDistributionProps, scope, cloudFrontLoggingBucketProps);

  const defaultprops = DefaultCloudFrontWebDistributionForS3Props(sourceBucket,
    loggingBucket,
    httpSecurityHeaders,
    originPath,
    cloudfrontFunction,
    responseHeadersPolicyProps ?  new cloudfront.ResponseHeadersPolicy(scope, 'ResponseHeadersPolicy', responseHeadersPolicyProps) : undefined
  );

  const cfprops = consolidateProps(defaultprops, cloudFrontDistributionProps);
  // Create the Cloudfront Distribution
  const cfDistribution = new cloudfront.Distribution(scope, 'CloudFrontDistribution', cfprops);
  updateSecurityPolicy(cfDistribution);

  // Extract the CfnBucketPolicy from the sourceBucket
  const bucketPolicy = sourceBucket.policy as s3.BucketPolicy;
  // the lack of a bucketPolicy means the bucket was imported from outside the stack so the lack of cfn_nag suppression is not an issue
  if (bucketPolicy) {
    addCfnSuppressRules(bucketPolicy, [
      {
        id: 'F16',
        reason: `Public website bucket policy requires a wildcard principal`
      }
    ]);
  }
  return { distribution: cfDistribution, cloudfrontFunction, loggingBucket};
}

export interface CloudFrontDistributionForMediaStoreResponse {
  readonly distribution: cloudfront.Distribution,
  readonly loggingBucket?: s3.Bucket,
  readonly requestPolicy: cloudfront.OriginRequestPolicy,
  readonly cloudfrontFunction?: cloudfront.Function
}

export function CloudFrontDistributionForMediaStore(scope: Construct,
  mediaStoreContainer: mediastore.CfnContainer,
  cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  httpSecurityHeaders: boolean = true,
  cloudFrontLoggingBucketProps?: s3.BucketProps,
  responseHeadersPolicyProps?: cloudfront.ResponseHeadersPolicyProps
): CloudFrontDistributionForMediaStoreResponse {

  let originRequestPolicy: cloudfront.OriginRequestPolicy;

  const loggingBucket = getLoggingBucket(cloudFrontDistributionProps, scope, cloudFrontLoggingBucketProps);

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

  const defaultprops = DefaultCloudFrontDisributionForMediaStoreProps(
    mediaStoreContainer,
    loggingBucket,
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

  return { distribution: cfDistribution, loggingBucket, requestPolicy: originRequestPolicy, cloudfrontFunction };
}

export function CloudFrontOriginAccessIdentity(scope: Construct, comment?: string) {
  return new cloudfront.OriginAccessIdentity(scope, 'CloudFrontOriginAccessIdentity', {
    comment: comment ? comment : `access-identity-${cdk.Aws.REGION}-${cdk.Aws.STACK_NAME}`
  });
}

function getLoggingBucket(
  cloudFrontDistributionProps: cloudfront.DistributionProps | any, scope: Construct,
  cloudFrontLoggingBucketProps?: s3.BucketProps
): s3.Bucket | undefined {
  const isLoggingDisabled = cloudFrontDistributionProps?.enableLogging === false;
  const userSuppliedLogBucket = cloudFrontDistributionProps?.logBucket;

  if (userSuppliedLogBucket && cloudFrontLoggingBucketProps) {
    throw Error('Either cloudFrontDistributionProps.logBucket or cloudFrontLoggingBucketProps can be set.');
  }

  return isLoggingDisabled
    ? undefined
    : userSuppliedLogBucket ?? createLoggingBucket(
      scope,
      'CloudfrontLoggingBucket',
      cloudFrontLoggingBucketProps ? overrideProps(DefaultS3Props(), cloudFrontLoggingBucketProps) : DefaultS3Props());
}

function getCloudfrontFunction(httpSecurityHeaders: boolean, scope: Construct) {
  return httpSecurityHeaders ? defaultCloudfrontFunction(scope) : undefined;
}
