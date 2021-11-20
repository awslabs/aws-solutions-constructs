/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as api from '@aws-cdk/aws-apigateway';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import { FunctionEventType, IOrigin } from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as mediastore from '@aws-cdk/aws-mediastore';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';

export function DefaultCloudFrontWebDistributionForApiGatewayProps(apiEndPoint: api.RestApi,
  loggingBucket: s3.Bucket | undefined,
  setHttpSecurityHeaders: boolean,
  cfFunction?: cloudfront.IFunction): cloudfront.DistributionProps {

  const apiEndPointUrlWithoutProtocol = cdk.Fn.select(1, cdk.Fn.split("://", apiEndPoint.url));
  const apiEndPointDomainName = cdk.Fn.select(0, cdk.Fn.split("/", apiEndPointUrlWithoutProtocol));

  return {
    defaultBehavior: {
      origin: new origins.HttpOrigin(apiEndPointDomainName, {
        originPath: `/${apiEndPoint.deploymentStage.stageName}`
      }),
      ...getFunctionAssociationsProp(setHttpSecurityHeaders, cfFunction),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
    },
    enableLogging: true,
    logBucket: loggingBucket,
  };
}

export function DefaultCloudFrontWebDistributionForS3Props(sourceBucket: s3.IBucket, loggingBucket: s3.Bucket | undefined,
  setHttpSecurityHeaders: boolean,
  originPath?: string,
  cfFunction?: cloudfront.IFunction): cloudfront.DistributionProps {

  let origin: IOrigin;

  if (originPath) {
    origin = new origins.S3Origin(sourceBucket, { originPath });
  } else {
    origin = new origins.S3Origin(sourceBucket);
  }

  return {
    defaultBehavior: {
      origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      ...getFunctionAssociationsProp(setHttpSecurityHeaders, cfFunction)
    },
    enableLogging: true,
    logBucket: loggingBucket,
    defaultRootObject: 'index.html'
  };
}

export function DefaultCloudFrontDisributionForMediaStoreProps(mediastoreContainer: mediastore.CfnContainer,
  loggingBucket: s3.Bucket | undefined,
  originRequestPolicy: cloudfront.OriginRequestPolicy,
  setHttpSecurityHeaders: boolean,
  customHeaders?: Record<string, string>,
  cfFunction?: cloudfront.IFunction): cloudfront.DistributionProps {

  const mediaStoreContainerUrlWithoutProtocol = cdk.Fn.select(1, cdk.Fn.split('://', mediastoreContainer.attrEndpoint));
  const mediaStoreContainerDomainName = cdk.Fn.select(0, cdk.Fn.split('/', mediaStoreContainerUrlWithoutProtocol));

  const httpOrigin: origins.HttpOrigin = customHeaders ?
    new origins.HttpOrigin(mediaStoreContainerDomainName, { customHeaders }) :
    new origins.HttpOrigin(mediaStoreContainerDomainName);

  return {
    defaultBehavior: {
      origin: httpOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      originRequestPolicy,
      ...getFunctionAssociationsProp(setHttpSecurityHeaders, cfFunction)
    },
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
