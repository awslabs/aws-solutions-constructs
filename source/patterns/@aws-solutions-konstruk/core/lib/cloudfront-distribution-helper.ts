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
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as api from '@aws-cdk/aws-apigateway';
import { DefaultS3Props } from './s3-bucket-defaults';
import { DefaultCloudFrontWebDistributionForS3Props, DefaultCloudFrontWebDistributionForApiGatewayProps } from './cloudfront-distribution-defaults';
import { overrideProps } from './utils';

export function CloudFrontDistributionForApiGateway(scope: cdk.Construct, apiEndPoint: api.RestApi, cloudFrontDistributionProps?:
    cloudfront.CloudFrontWebDistributionProps | any): cloudfront.CloudFrontWebDistribution {

    let defaultprops;

    if (cloudFrontDistributionProps && cloudFrontDistributionProps.loggingBucket) {
        defaultprops = DefaultCloudFrontWebDistributionForApiGatewayProps(apiEndPoint);
    } else {
        // Create the Logging Bucket
        const loggingBucket: s3.Bucket = new s3.Bucket(scope, 'CloudfrontLoggingBucket', DefaultS3Props());

        // Extract the CfnBucket from the loggingBucket
        const loggingBucketResource = loggingBucket.node.findChild('Resource') as s3.CfnBucket;

        // Override accessControl configuration and add metadata for the logging bucket
        loggingBucketResource.addPropertyOverride('AccessControl', 'LogDeliveryWrite');
        loggingBucketResource.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                    id: 'W35',
                    reason: `This S3 bucket is used as the access logging bucket for CloudFront Distribution`
                }, {
                    id: 'W51',
                    reason: `This S3 bucket is used as the access logging bucket for CloudFront Distribution`
                }]
            }
        };

        defaultprops = DefaultCloudFrontWebDistributionForApiGatewayProps(apiEndPoint, loggingBucket);
    }

    // Create the Cloudfront Distribution
    let cfprops = defaultprops;
    if (cloudFrontDistributionProps) {
        cfprops = overrideProps(defaultprops, cloudFrontDistributionProps);
    }
    const cfDistribution: cloudfront.CloudFrontWebDistribution = new cloudfront.CloudFrontWebDistribution(scope, 'CloudFrontDistribution', cfprops);

    return cfDistribution;
}

export function CloudFrontDistributionForS3(scope: cdk.Construct, sourceBucket: s3.Bucket, cloudFrontDistributionProps?:
                                            cloudfront.CloudFrontWebDistributionProps | any): cloudfront.CloudFrontWebDistribution {
    // Create the Logging Bucket
    const loggingBucket: s3.Bucket = new s3.Bucket(scope, 'CloudfrontLoggingBucket', DefaultS3Props());

    // Extract the CfnBucket from the loggingBucket
    const loggingBucketResource = loggingBucket.node.findChild('Resource') as s3.CfnBucket;

    // Override accessControl configuration and add metadata for the logging bucket
    loggingBucketResource.addPropertyOverride('AccessControl', 'LogDeliveryWrite');
    loggingBucketResource.cfnOptions.metadata = {
        cfn_nag: {
            rules_to_suppress: [{
                id: 'W35',
                reason: `This S3 bucket is used as the access logging bucket for CloudFront Distribution`
            }, {
                id: 'W51',
                reason: `This S3 bucket is used as the access logging bucket for CloudFront Distribution`
            }]
        }
    };

    // Create CloudFront Origin Access Identity User
    const cfnOrigAccessId = new cloudfront.CfnCloudFrontOriginAccessIdentity(scope, 'CloudFrontOriginAccessIdentity', {
        cloudFrontOriginAccessIdentityConfig: {
            comment: 'Access S3 bucket content only through CloudFront'
        }
    });

    const oaiImported = cloudfront.OriginAccessIdentity.fromOriginAccessIdentityName(
        scope,
        'OAIImported',
        cfnOrigAccessId.ref
    );

    // Create the Cloudfront Distribution
    const defaultprops = DefaultCloudFrontWebDistributionForS3Props(sourceBucket, loggingBucket, oaiImported);
    let cfprops = defaultprops;
    if (cloudFrontDistributionProps) {
        cfprops = overrideProps(defaultprops, cloudFrontDistributionProps);
    }
    const cfDistribution: cloudfront.CloudFrontWebDistribution = new cloudfront.CloudFrontWebDistribution(scope, 'CloudFrontDistribution', cfprops);

    // Add S3 Bucket Policy to allow s3:GetObject for CloudFront Origin Access Identity User
    sourceBucket.addToResourcePolicy(new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [sourceBucket.arnForObjects('*')],
        principals: [new iam.CanonicalUserPrincipal(cfnOrigAccessId.attrS3CanonicalUserId)]
    }));

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
    return cfDistribution;
}
