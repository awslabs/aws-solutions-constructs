/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as api from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';

export function DefaultCloudFrontWebDistributionForApiGatewayProps(apiEndPoint: api.RestApi,
                                                                   loggingBucket: s3.Bucket,
                                                                   setHttpSecurityHeaders: boolean,
                                                                   edgeLambda?: lambda.Version): cloudfront.CloudFrontWebDistributionProps {

    const apiEndPointUrlWithoutProtocol = cdk.Fn.select(1, cdk.Fn.split("://", apiEndPoint.url));
    const apiEndPointDomainName = cdk.Fn.select(0, cdk.Fn.split("/", apiEndPointUrlWithoutProtocol));

    if (setHttpSecurityHeaders) {
        return {
            originConfigs: [{
                customOriginSource: {
                    domainName: apiEndPointDomainName
                },
                behaviors: [{
                    isDefaultBehavior: true,
                    lambdaFunctionAssociations: [
                        {
                            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
                            lambdaFunction: edgeLambda
                        }
                    ]
                }]
            }],
            loggingConfig: {
                bucket: loggingBucket
            }
        } as cloudfront.CloudFrontWebDistributionProps;
    } else {
        return {
            originConfigs: [{
                customOriginSource: {
                    domainName: apiEndPointDomainName
                },
                behaviors: [{
                    isDefaultBehavior: true,
                }]
            }],
            loggingConfig: {
                bucket: loggingBucket
            }
        } as cloudfront.CloudFrontWebDistributionProps;
    }
}

export function DefaultCloudFrontWebDistributionForS3Props(sourceBucket: s3.Bucket, loggingBucket: s3.Bucket,
                                                           _originAccessIdentity: cloudfront.IOriginAccessIdentity,
                                                           setHttpSecurityHeaders: boolean,
                                                           edgeLambda?: lambda.Version):
                                                           cloudfront.CloudFrontWebDistributionProps {

    if (setHttpSecurityHeaders) {
        return {
            originConfigs: [{
                s3OriginSource: {
                    s3BucketSource: sourceBucket,
                    originAccessIdentity: _originAccessIdentity
                },
                behaviors: [{
                    isDefaultBehavior: true,
                    lambdaFunctionAssociations: [
                        {
                            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
                            lambdaFunction: edgeLambda
                        }
                    ]
                }]
            }],
            loggingConfig: {
                bucket: loggingBucket
            }
        } as cloudfront.CloudFrontWebDistributionProps;
    } else {
        return {
            originConfigs: [ {
                s3OriginSource: {
                    s3BucketSource: sourceBucket,
                    originAccessIdentity: _originAccessIdentity
                },
                behaviors: [ {
                        isDefaultBehavior: true,
                    } ]
            } ],
            loggingConfig: {
                bucket: loggingBucket
            }
        } as cloudfront.CloudFrontWebDistributionProps;
    }
}