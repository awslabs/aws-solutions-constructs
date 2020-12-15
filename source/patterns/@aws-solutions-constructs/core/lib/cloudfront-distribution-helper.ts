/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as api from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import { DefaultCloudFrontWebDistributionForS3Props, DefaultCloudFrontWebDistributionForApiGatewayProps } from './cloudfront-distribution-defaults';
import { overrideProps } from './utils';
import { deployLambdaFunction } from './lambda-helper';
import { createLoggingBucket } from './s3-bucket-helper';

// Override Cfn_Nag rule: Cloudfront TLS-1.2 rule (https://github.com/stelligent/cfn_nag/issues/384)
function updateSecurityPolicy(cfDistribution: cloudfront.Distribution) {
  const cfnCfDistribution = cfDistribution.node.defaultChild as cloudfront.CfnDistribution;
  cfnCfDistribution.cfnOptions.metadata = {
    cfn_nag: {
      rules_to_suppress: [{
        id: 'W70',
        reason: `Since the distribution uses the CloudFront domain name, CloudFront automatically sets the security policy to TLSv1 regardless of the value of MinimumProtocolVersion`
      }]
    }
  };
  return cfDistribution;
}

// Lambda@Edge function to insert the HTTP Security Headers into the response coming from the origin servers
// and before it is sent to the client
function defaultLambdaEdgeFunction(scope: cdk.Construct): lambda.Function {
  const edgeLambdaFunc = deployLambdaFunction(scope, {
    code: new lambda.InlineCode("exports.handler = (event, context, callback) => { \
          const response = event.Records[0].cf.response; \
          const headers = response.headers; \
          headers['x-xss-protection'] = [ \
            { \
              key: 'X-XSS-Protection', \
              value: '1; mode=block' \
            } \
          ]; \
          headers['x-frame-options'] = [ \
            { \
              key: 'X-Frame-Options', \
              value: 'DENY' \
            } \
          ]; \
          headers['x-content-type-options'] = [ \
            { \
              key: 'X-Content-Type-Options', \
              value: 'nosniff' \
            } \
          ]; \
          headers['strict-transport-security'] = [ \
            { \
              key: 'Strict-Transport-Security', \
              value: 'max-age=63072000; includeSubdomains; preload' \
            } \
          ]; \
          headers['referrer-policy'] = [ \
            { \
              key: 'Referrer-Policy', \
              value: 'same-origin' \
            } \
          ]; \
          headers['content-security-policy'] = [ \
            { \
              key: 'Content-Security-Policy', \
              value: \"default-src 'none'; base-uri 'self'; img-src 'self'; script-src 'self'; style-src 'self' https:; object-src 'none'; frame-ancestors 'none'; font-src 'self' https:; form-action 'self'; manifest-src 'self'; connect-src 'self'\" \
             } \
          ]; \
          callback(null, response); \
        };"),
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler'
  }, 'SetHttpSecurityHeaders');

  // Switching from cloudfront.CloudFrontWebDistribution -> cloudfront.Distribution breaks the Lamba@Edge as it does not automatically update
  // the lambda role AssumePolicy for 'edgelambda.amazonaws.com'
  if (edgeLambdaFunc.role && edgeLambdaFunc.role instanceof iam.Role && edgeLambdaFunc.role.assumeRolePolicy) {
    edgeLambdaFunc.role.assumeRolePolicy.addStatements(new iam.PolicyStatement({
      actions: [ 'sts:AssumeRole' ],
      principals: [ new iam.ServicePrincipal('edgelambda.amazonaws.com') ],
    }));
  }

  return edgeLambdaFunc;
}

export function CloudFrontDistributionForApiGateway(scope: cdk.Construct,
  apiEndPoint: api.RestApi,
  cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  httpSecurityHeaders?: boolean): [cloudfront.Distribution,
                                                    lambda.Version?, s3.Bucket?] {

  const _httpSecurityHeaders = (httpSecurityHeaders !== undefined && httpSecurityHeaders === false) ? false : true;

  let defaultprops: cloudfront.DistributionProps;
  let edgeLambdaVersion;
  let loggingBucket;

  if (_httpSecurityHeaders) {
    edgeLambdaVersion = new lambda.Version(scope, "SetHttpSecurityHeadersVersion", {
      lambda: defaultLambdaEdgeFunction(scope)
    });
  }

  if (cloudFrontDistributionProps && cloudFrontDistributionProps.loggingConfig) {
    defaultprops = DefaultCloudFrontWebDistributionForApiGatewayProps(apiEndPoint,
      cloudFrontDistributionProps.loggingConfig.bucket, _httpSecurityHeaders,
      edgeLambdaVersion);
  } else {
    loggingBucket = createLoggingBucket(scope, 'CloudfrontLoggingBucket');
    defaultprops = DefaultCloudFrontWebDistributionForApiGatewayProps(apiEndPoint,
      loggingBucket, _httpSecurityHeaders,
      edgeLambdaVersion);
  }

  const cfprops = cloudFrontDistributionProps ? overrideProps(defaultprops, cloudFrontDistributionProps) : defaultprops;
  // Create the Cloudfront Distribution
  const cfDistribution: cloudfront.Distribution = new cloudfront.Distribution(scope, 'CloudFrontDistribution', cfprops);
  updateSecurityPolicy(cfDistribution);

  return [cfDistribution, edgeLambdaVersion, loggingBucket];
}

export function CloudFrontDistributionForS3(scope: cdk.Construct,
  sourceBucket: s3.Bucket,
  cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  httpSecurityHeaders?: boolean): [cloudfront.Distribution,
                                            lambda.Version?, s3.Bucket?] {

  let defaultprops: cloudfront.DistributionProps;
  let edgeLambdaVersion;
  let loggingBucket;
  const _httpSecurityHeaders = (httpSecurityHeaders !== undefined && httpSecurityHeaders === false) ? false : true;

  if (_httpSecurityHeaders) {
    edgeLambdaVersion = new lambda.Version(scope, "SetHttpSecurityHeadersVersion", {
      lambda: defaultLambdaEdgeFunction(scope)
    });
  }

  if (cloudFrontDistributionProps && cloudFrontDistributionProps.loggingConfig) {
    defaultprops = DefaultCloudFrontWebDistributionForS3Props(sourceBucket,
      cloudFrontDistributionProps.loggingConfig.bucket, _httpSecurityHeaders, edgeLambdaVersion);
  } else {
    loggingBucket = createLoggingBucket(scope, 'CloudfrontLoggingBucket');
    defaultprops = DefaultCloudFrontWebDistributionForS3Props(sourceBucket, loggingBucket,
      _httpSecurityHeaders, edgeLambdaVersion);
  }

  const cfprops = cloudFrontDistributionProps ? overrideProps(defaultprops, cloudFrontDistributionProps) : defaultprops;
  // Create the Cloudfront Distribution
  const cfDistribution: cloudfront.Distribution = new cloudfront.Distribution(scope, 'CloudFrontDistribution', cfprops);
  updateSecurityPolicy(cfDistribution);

  // Extract the CfnBucketPolicy from the sourceBucket
  const bucketPolicy = sourceBucket.policy as s3.BucketPolicy;
  const sourceBucketPolicy = bucketPolicy.node.findChild('Resource') as s3.CfnBucketPolicy;
  sourceBucketPolicy.cfnOptions.metadata = {
    cfn_nag: {
      rules_to_suppress: [{
        id: 'F16',
        reason: `Public website bucket policy requires a wildcard principal`
      }]
    }
  };
  return [cfDistribution, edgeLambdaVersion, loggingBucket];
}
