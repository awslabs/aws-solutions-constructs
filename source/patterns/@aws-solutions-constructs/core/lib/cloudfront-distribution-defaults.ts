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
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as s3 from '@aws-cdk/aws-s3';
import * as api from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';

export function DefaultCloudFrontWebDistributionForApiGatewayProps(apiEndPoint: api.RestApi,
                                                                   loggingBucket: s3.Bucket,
                                                                   setHttpSecurityHeaders: boolean,
                                                                   edgeLambda?: lambda.Version): cloudfront.DistributionProps {

    const apiEndPointUrlWithoutProtocol = cdk.Fn.select(1, cdk.Fn.split("://", apiEndPoint.url));
    const apiEndPointDomainName = cdk.Fn.select(0, cdk.Fn.split("/", apiEndPointUrlWithoutProtocol));

    if (setHttpSecurityHeaders) {
        return {
            defaultBehavior: {
                    origin: new origins.HttpOrigin(apiEndPointDomainName, {
                        originPath: `/${apiEndPoint.deploymentStage.stageName}`
                    }),
                    edgeLambdas: [
                            {
                                eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
                                functionVersion: edgeLambda
                            }
                    ],
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
                },
                enableLogging: true,
                logBucket: loggingBucket,
                } as cloudfront.DistributionProps;
    } else {
        return {
            defaultBehavior: {
                origin: new origins.HttpOrigin(apiEndPointDomainName, {
                    originPath: `/${apiEndPoint.deploymentStage.stageName}`
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            },
            enableLogging: true,
            logBucket: loggingBucket,
            } as cloudfront.DistributionProps;
    }
}

export function DefaultCloudFrontWebDistributionForS3Props(sourceBucket: s3.Bucket, loggingBucket: s3.Bucket,
                                                           setHttpSecurityHeaders: boolean,
                                                           edgeLambda?: lambda.Version):
                                                           cloudfront.DistributionProps {

    if (setHttpSecurityHeaders) {
        return {
            defaultBehavior: {
                origin: new origins.S3Origin(sourceBucket),
                edgeLambdas: [
                    {
                        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
                        functionVersion: edgeLambda
                    }
                ],
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            },
            enableLogging: true,
            logBucket: loggingBucket,
            defaultRootObject: 'index.html'
            } as cloudfront.DistributionProps;
    } else {
        return {
            defaultBehavior: {
                origin: new origins.S3Origin(sourceBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            },
            enableLogging: true,
            logBucket: loggingBucket,
            defaultRootObject: 'index.html'
        } as cloudfront.DistributionProps;
    }
}