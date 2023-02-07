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

// Imports
import * as kinesisAnalytics from 'aws-cdk-lib/aws-kinesisanalytics';
import * as kinesisFirehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as defaults from './kinesis-analytics-defaults';
import { overrideProps } from './utils';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

export interface BuildKinesisAnalyticsAppProps {
    /**
     * A Kinesis Data Firehose for the Kinesis Streams application to connect to.
     *
     * @default - Default props are used
     */
    readonly kinesisFirehose: kinesisFirehose.CfnDeliveryStream
   /**
    * Optional user provided props to override the default props for the Kinesis analytics app.
    *
    * @default - Default props are used
    */
   readonly kinesisAnalyticsProps?: kinesisAnalytics.CfnApplicationProps | any
 }

export function buildKinesisAnalyticsApp(scope: Construct, props: BuildKinesisAnalyticsAppProps): kinesisAnalytics.CfnApplication {

  // Setup the IAM role for Kinesis Analytics
  const analyticsRole = new iam.Role(scope, 'KinesisAnalyticsRole', {
    assumedBy: new iam.ServicePrincipal('kinesisanalytics.amazonaws.com'),
  });

  // Setup the IAM policy for Kinesis Analytics
  const analyticsPolicy = new iam.Policy(scope, 'KinesisAnalyticsPolicy', {
    statements: [
      new iam.PolicyStatement({
        actions: [
          'firehose:DescribeDeliveryStream',
          'firehose:Get*'
        ],
        resources: [props.kinesisFirehose.attrArn]
      })
    ]});

  // Attach policy to role
  analyticsPolicy.attachToRole(analyticsRole);

  // Setup the Kinesis application properties
  const kinesisAnalyticsProps = overrideProps(defaults.DefaultCfnApplicationProps, props.kinesisAnalyticsProps);
  kinesisAnalyticsProps.inputs[0].kinesisFirehoseInput = {
    resourceArn: props.kinesisFirehose.attrArn,
    roleArn: analyticsRole.roleArn
  };

  // Setup the Kinesis application and add dependencies
  const kinesisAnalyticsApp = new kinesisAnalytics.CfnApplication(scope, 'KinesisAnalytics', kinesisAnalyticsProps);
  kinesisAnalyticsApp.addDependency(analyticsPolicy.node.findChild('Resource') as iam.CfnPolicy);

  // Create the application and return
  return kinesisAnalyticsApp;
}