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
import * as defaults from '../';
import * as cdk from 'aws-cdk-lib';

test('ValidateApplicationLoadBalancerProps - props object is undefined', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateApplicationLoadBalancerProps(stack)).not.toThrow();
});

test('ValidateApplicationLoadBalancerProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateApplicationLoadBalancerProps(stack, { ipAddressType: 'ipv4' })).not.toThrow();
});

test('ValidateApplicationLoadBalancerProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateApplicationLoadBalancerProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of ApplicationLoadBalancerProps/);
});

test('ValidateApplicationListenerProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateApplicationListenerProps(stack, { port: 443 })).not.toThrow();
});

test('ValidateApplicationListenerProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateApplicationListenerProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of ApplicationListenerProps/);
});

test('ValidateContainerDefinitionProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateContainerDefinitionProps(stack, { memoryLimitMiB: 512 })).not.toThrow();
});

test('ValidateContainerDefinitionProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateContainerDefinitionProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of ContainerDefinitionProps/);
});

test('ValidateFargateTaskDefinitionProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateFargateTaskDefinitionProps(stack, { cpu: 256 })).not.toThrow();
});

test('ValidateFargateTaskDefinitionProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateFargateTaskDefinitionProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of FargateTaskDefinitionProps/);
});

test('ValidateFargateServiceProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateFargateServiceProps(stack, { platformVersion: {} as any })).not.toThrow();
});

test('ValidateFargateServiceProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateFargateServiceProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of FargateServiceProps/);
});

test('ValidateLambdaRestApiProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateLambdaRestApiProps(stack, { proxy: false })).not.toThrow();
});

test('ValidateLambdaRestApiProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateLambdaRestApiProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of LambdaRestApiProps/);
});

test('ValidateRestApiProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateRestApiProps(stack, { binaryMediaTypes: ['image/png'] })).not.toThrow();
});

test('ValidateRestApiProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateRestApiProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of RestApiProps/);
});

test('ValidateDistributionProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateDistributionProps(stack, { comment: 'My distribution' })).not.toThrow();
});

test('ValidateDistributionProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateDistributionProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of DistributionProps/);
});

test('ValidateUserPoolClientProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateUserPoolClientProps(stack, { userPoolClientName: 'my-client' })).not.toThrow();
});

test('ValidateUserPoolClientProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateUserPoolClientProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of UserPoolClientProps/);
});

test('ValidateCfnPipeProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnPipeProps(stack, { name: 'my-pipe' })).not.toThrow();
});

test('ValidateCfnPipeProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnPipeProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnPipeProps/);
});

test('ValidateCfnDeliveryStreamProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnDeliveryStreamProps(stack, { deliveryStreamName: 'my-stream' })).not.toThrow();
});

test('ValidateCfnDeliveryStreamProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnDeliveryStreamProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnDeliveryStreamProps/);
});

test('ValidateStreamProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateStreamProps(stack, { streamName: 'my-stream' })).not.toThrow();
});

test('ValidateStreamProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateStreamProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of StreamProps/);
});

test('ValidateCfnJobProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnJobProps(stack, { name: 'my-job' })).not.toThrow();
});

test('ValidateCfnJobProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnJobProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnJobProps/);
});

test('ValidateKinesisEventSourceProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateKinesisEventSourceProps(stack, { startingPositionTimestamp: 123456 })).not.toThrow();
});

test('ValidateKinesisEventSourceProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateKinesisEventSourceProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of KinesisEventSourceProps/);
});

test('ValidateCfnCacheClusterProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnCacheClusterProps(stack, { cacheNodeType: 'cache.t2.micro' })).not.toThrow();
});

test('ValidateCfnCacheClusterProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnCacheClusterProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnCacheClusterProps/);
});

test('ValidateCfnIndexProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnIndexProps(stack, { name: 'my-index' })).not.toThrow();
});

test('ValidateCfnIndexProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnIndexProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnIndexProps/);
});

test('ValidateCfnDataSourceProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnDataSourceProps(stack, { name: 'my-datasource' })).not.toThrow();
});

test('ValidateCfnDataSourceProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnDataSourceProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnDataSourceProps/);
});

test('ValidateKeyProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateKeyProps(stack, { description: 'My key' })).not.toThrow();
});

test('ValidateKeyProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateKeyProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of KeyProps/);
});

test('ValidateVpcProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateVpcProps(stack, { maxAzs: 2 })).not.toThrow();
});

test('ValidateVpcProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateVpcProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of VpcProps/);
});

test('ValidateCfnModelProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnModelProps(stack, { modelName: 'my-model' })).not.toThrow();
});

test('ValidateCfnModelProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnModelProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnModelProps/);
});

test('ValidatePrivateHostedZoneProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidatePrivateHostedZoneProps(stack, { zoneName: 'example.com' })).not.toThrow();
});

test('ValidatePrivateHostedZoneProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidatePrivateHostedZoneProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of PrivateHostedZoneProps/);
});

test('ValidateCfnWebACLProps - valid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnWebACLProps(stack, { name: 'my-webacl' })).not.toThrow();
});

test('ValidateCfnWebACLProps - invalid property', () => {
  const stack = new cdk.Stack();
  expect(() => defaults.ValidateCfnWebACLProps(stack, { invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnWebACLProps/);
});

test('Confirm that validation can be disabled with a feature flag', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  // ConstructsFeatureFlagsReport.ensure(stack);
  stack.node.setContext(defaults.DISABLE_PROPERTY_VALIDATION, true);

  expect(() => defaults.ValidateCfnWebACLProps(stack, { invalidProp: 'my-webacl' })).not.toThrow();
});
