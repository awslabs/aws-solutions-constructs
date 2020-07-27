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

import * as api from '@aws-cdk/aws-apigateway';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the CloudFrontToApiGateway Construct
 */
export interface CloudFrontToApiGatewayProps {
  /**
   * Existing instance of api.RestApi object.
   *
   * @default - None
   */
  readonly existingApiGatewayObj: api.RestApi,
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly cloudFrontDistributionProps?: cloudfront.CloudFrontWebDistributionProps | any,
  /**
   * Optional user provided props to turn on/off the automatic injection of best practice HTTP
   * security headers in all responses from cloudfront
   *
   * @default - true
   */
  readonly insertHttpSecurityHeaders?: boolean;
}

export class CloudFrontToApiGateway extends Construct {
  public readonly cloudFrontWebDistribution: cloudfront.CloudFrontWebDistribution;
  public readonly apiGateway: api.RestApi;
  public readonly edgeLambdaFunctionVersion?: lambda.Version;
  public readonly cloudFrontLoggingBucket?: s3.Bucket;

  /**
   * @summary Constructs a new instance of the CloudFrontToApiGateway class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CloudFrontToApiGatewayProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: CloudFrontToApiGatewayProps) {
    super(scope, id);

    this.apiGateway = props.existingApiGatewayObj;

    [this.cloudFrontWebDistribution, this.edgeLambdaFunctionVersion, this.cloudFrontLoggingBucket] =
      defaults.CloudFrontDistributionForApiGateway(this, props.existingApiGatewayObj,
      props.cloudFrontDistributionProps, props.insertHttpSecurityHeaders);
  }
}
