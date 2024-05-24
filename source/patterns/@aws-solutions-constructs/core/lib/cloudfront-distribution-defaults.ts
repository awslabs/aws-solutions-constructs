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

import * as api from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { FunctionEventType, IOrigin } from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as mediastore from 'aws-cdk-lib/aws-mediastore';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import {BehaviorOptions} from "aws-cdk-lib/aws-cloudfront/lib/distribution";

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultCloudFrontWebDistributionForApiGatewayProps(apiEndPoint: api.RestApi,
  loggingBucket: s3.Bucket | undefined,
  setHttpSecurityHeaders: boolean,
  cfFunction?: cloudfront.IFunction,
  responseHeadersPolicy?: cloudfront.ResponseHeadersPolicy,
): cloudfront.DistributionProps {

  const apiEndPointUrlWithoutProtocol = cdk.Fn.select(1, cdk.Fn.split("://", apiEndPoint.url));
  const apiEndPointDomainName = cdk.Fn.select(0, cdk.Fn.split("/", apiEndPointUrlWithoutProtocol));

  let defaultBehavior: BehaviorOptions = {
    origin: new origins.HttpOrigin(apiEndPointDomainName, {
      originPath: `/${apiEndPoint.deploymentStage.stageName}`
    }),
    ...getFunctionAssociationsProp(setHttpSecurityHeaders, cfFunction),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  };
  if (responseHeadersPolicy) {
    defaultBehavior = {...defaultBehavior, responseHeadersPolicy };
  }
  return {
    defaultBehavior,
    enableLogging: true,
    logBucket: loggingBucket,
  };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultCloudFrontWebDistributionForS3Props(
  origin: IOrigin,
  loggingBucket: s3.Bucket | undefined,
  setHttpSecurityHeaders: boolean,
  cfFunction?: cloudfront.IFunction,
  responseHeadersPolicy?: cloudfront.ResponseHeadersPolicy,
): cloudfront.DistributionProps {

  let defaultBehavior: BehaviorOptions = {
    origin,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    ...getFunctionAssociationsProp(setHttpSecurityHeaders, cfFunction)
  };

  if (responseHeadersPolicy) {
    defaultBehavior = {...defaultBehavior, responseHeadersPolicy };
  }
  return {
    defaultBehavior,
    enableLogging: true,
    logBucket: loggingBucket,
    defaultRootObject: 'index.html'
  };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultCloudFrontDistributionForMediaStoreProps(mediastoreContainer: mediastore.CfnContainer,
  loggingBucket: s3.Bucket | undefined,
  originRequestPolicy: cloudfront.OriginRequestPolicy,
  setHttpSecurityHeaders: boolean,
  customHeaders?: Record<string, string>,
  cfFunction?: cloudfront.IFunction,
  responseHeadersPolicy?: cloudfront.ResponseHeadersPolicy
): cloudfront.DistributionProps {

  const mediaStoreContainerUrlWithoutProtocol = cdk.Fn.select(1, cdk.Fn.split('://', mediastoreContainer.attrEndpoint));
  const mediaStoreContainerDomainName = cdk.Fn.select(0, cdk.Fn.split('/', mediaStoreContainerUrlWithoutProtocol));

  const httpOrigin: origins.HttpOrigin = customHeaders ?
    new origins.HttpOrigin(mediaStoreContainerDomainName, { customHeaders }) :
    new origins.HttpOrigin(mediaStoreContainerDomainName);

  let defaultBehavior: BehaviorOptions = {
    origin: httpOrigin,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
    cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
    originRequestPolicy,
    ...getFunctionAssociationsProp(setHttpSecurityHeaders, cfFunction),
  };
  if (responseHeadersPolicy) {
    defaultBehavior = {...defaultBehavior, responseHeadersPolicy };
  }
  return {
    defaultBehavior,
    enableLogging: true,
    logBucket: loggingBucket
  };
}

function getFunctionAssociationsProp(setHttpSecurityHeaders: boolean, cfFunction: cloudfront.IFunction | undefined) {
  return (setHttpSecurityHeaders && cfFunction) ? {
    functionAssociations: [
      {
        eventType: FunctionEventType.VIEWER_RESPONSE,
        function: cfFunction
      }
    ]
  } : {};
}
