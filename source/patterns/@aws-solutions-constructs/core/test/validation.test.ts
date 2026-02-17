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

test('ValidateApplicationLoadBalancerProps - props object is undefined', () => {
  expect(() => defaults.ValidateApplicationLoadBalancerProps()).not.toThrow();
});

test('ValidateApplicationLoadBalancerProps - valid property', () => {
  expect(() => defaults.ValidateApplicationLoadBalancerProps({ ipAddressType: 'ipv4' })).not.toThrow();
});

test('ValidateApplicationLoadBalancerProps - invalid property', () => {
  expect(() => defaults.ValidateApplicationLoadBalancerProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of ApplicationLoadBalancerProps/);
});

test('ValidateApplicationListenerProps - valid property', () => {
  expect(() => defaults.ValidateApplicationListenerProps({ port: 443 })).not.toThrow();
});

test('ValidateApplicationListenerProps - invalid property', () => {
  expect(() => defaults.ValidateApplicationListenerProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of ApplicationListenerProps/);
});

test('ValidateContainerDefinitionProps - valid property', () => {
  expect(() => defaults.ValidateContainerDefinitionProps({ memoryLimitMiB: 512 })).not.toThrow();
});

test('ValidateContainerDefinitionProps - invalid property', () => {
  expect(() => defaults.ValidateContainerDefinitionProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of ContainerDefinitionProps/);
});

test('ValidateFargateTaskDefinitionProps - valid property', () => {
  expect(() => defaults.ValidateFargateTaskDefinitionProps({ cpu: 256 })).not.toThrow();
});

test('ValidateFargateTaskDefinitionProps - invalid property', () => {
  expect(() => defaults.ValidateFargateTaskDefinitionProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of FargateTaskDefinitionProps/);
});

test('ValidateFargateServiceProps - valid property', () => {
  expect(() => defaults.ValidateFargateServiceProps({ platformVersion: {} as any })).not.toThrow();
});

test('ValidateFargateServiceProps - invalid property', () => {
  expect(() => defaults.ValidateFargateServiceProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of FargateServiceProps/);
});

test('ValidateLambdaRestApiProps - valid property', () => {
  expect(() => defaults.ValidateLambdaRestApiProps({ proxy: false })).not.toThrow();
});

test('ValidateLambdaRestApiProps - invalid property', () => {
  expect(() => defaults.ValidateLambdaRestApiProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of LambdaRestApiProps/);
});

test('ValidateRestApiProps - valid property', () => {
  expect(() => defaults.ValidateRestApiProps({ binaryMediaTypes: ['image/png'] })).not.toThrow();
});

test('ValidateRestApiProps - invalid property', () => {
  expect(() => defaults.ValidateRestApiProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of RestApiProps/);
});

test('ValidateDistributionProps - valid property', () => {
  expect(() => defaults.ValidateDistributionProps({ comment: 'My distribution' })).not.toThrow();
});

test('ValidateDistributionProps - invalid property', () => {
  expect(() => defaults.ValidateDistributionProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of DistributionProps/);
});

test('ValidateUserPoolClientProps - valid property', () => {
  expect(() => defaults.ValidateUserPoolClientProps({ userPoolClientName: 'my-client' })).not.toThrow();
});

test('ValidateUserPoolClientProps - invalid property', () => {
  expect(() => defaults.ValidateUserPoolClientProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of UserPoolClientProps/);
});

test('ValidateCfnPipeProps - valid property', () => {
  expect(() => defaults.ValidateCfnPipeProps({ name: 'my-pipe' })).not.toThrow();
});

test('ValidateCfnPipeProps - invalid property', () => {
  expect(() => defaults.ValidateCfnPipeProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnPipeProps/);
});

test('ValidateCfnDeliveryStreamProps - valid property', () => {
  expect(() => defaults.ValidateCfnDeliveryStreamProps({ deliveryStreamName: 'my-stream' })).not.toThrow();
});

test('ValidateCfnDeliveryStreamProps - invalid property', () => {
  expect(() => defaults.ValidateCfnDeliveryStreamProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnDeliveryStreamProps/);
});

test('ValidateStreamProps - valid property', () => {
  expect(() => defaults.ValidateStreamProps({ streamName: 'my-stream' })).not.toThrow();
});

test('ValidateStreamProps - invalid property', () => {
  expect(() => defaults.ValidateStreamProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of StreamProps/);
});

test('ValidateCfnJobProps - valid property', () => {
  expect(() => defaults.ValidateCfnJobProps({ name: 'my-job' })).not.toThrow();
});

test('ValidateCfnJobProps - invalid property', () => {
  expect(() => defaults.ValidateCfnJobProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnJobProps/);
});

test('ValidateKinesisEventSourceProps - valid property', () => {
  expect(() => defaults.ValidateKinesisEventSourceProps({ startingPositionTimestamp: 123456 })).not.toThrow();
});

test('ValidateKinesisEventSourceProps - invalid property', () => {
  expect(() => defaults.ValidateKinesisEventSourceProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of KinesisEventSourceProps/);
});

test('ValidateCfnCacheClusterProps - valid property', () => {
  expect(() => defaults.ValidateCfnCacheClusterProps({ cacheNodeType: 'cache.t2.micro' })).not.toThrow();
});

test('ValidateCfnCacheClusterProps - invalid property', () => {
  expect(() => defaults.ValidateCfnCacheClusterProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnCacheClusterProps/);
});

test('ValidateCfnIndexProps - valid property', () => {
  expect(() => defaults.ValidateCfnIndexProps({ name: 'my-index' })).not.toThrow();
});

test('ValidateCfnIndexProps - invalid property', () => {
  expect(() => defaults.ValidateCfnIndexProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnIndexProps/);
});

test('ValidateCfnDataSourceProps - valid property', () => {
  expect(() => defaults.ValidateCfnDataSourceProps({ name: 'my-datasource' })).not.toThrow();
});

test('ValidateCfnDataSourceProps - invalid property', () => {
  expect(() => defaults.ValidateCfnDataSourceProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnDataSourceProps/);
});

test('ValidateTopicProps - valid property', () => {
  expect(() => defaults.ValidateTopicProps({ topicName: 'my-topic' })).not.toThrow();
});

test('ValidateTopicProps - invalid property', () => {
  expect(() => defaults.ValidateTopicProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of TopicProps/);
});

test('ValidateKeyProps - valid property', () => {
  expect(() => defaults.ValidateKeyProps({ description: 'My key' })).not.toThrow();
});

test('ValidateKeyProps - invalid property', () => {
  expect(() => defaults.ValidateKeyProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of KeyProps/);
});

test('ValidateVpcProps - valid property', () => {
  expect(() => defaults.ValidateVpcProps({ maxAzs: 2 })).not.toThrow();
});

test('ValidateVpcProps - invalid property', () => {
  expect(() => defaults.ValidateVpcProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of VpcProps/);
});

test('ValidateCfnModelProps - valid property', () => {
  expect(() => defaults.ValidateCfnModelProps({ modelName: 'my-model' })).not.toThrow();
});

test('ValidateCfnModelProps - invalid property', () => {
  expect(() => defaults.ValidateCfnModelProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnModelProps/);
});

test('ValidatePrivateHostedZoneProps - valid property', () => {
  expect(() => defaults.ValidatePrivateHostedZoneProps({ zoneName: 'example.com' })).not.toThrow();
});

test('ValidatePrivateHostedZoneProps - invalid property', () => {
  expect(() => defaults.ValidatePrivateHostedZoneProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of PrivateHostedZoneProps/);
});

test('ValidateQueueProps - valid property', () => {
  expect(() => defaults.ValidateQueueProps({ queueName: 'my-queue' })).not.toThrow();
});

test('ValidateQueueProps - invalid property', () => {
  expect(() => defaults.ValidateQueueProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of QueueProps/);
});

test('ValidateCfnWebACLProps - valid property', () => {
  expect(() => defaults.ValidateCfnWebACLProps({ name: 'my-webacl' })).not.toThrow();
});

test('ValidateCfnWebACLProps - invalid property', () => {
  expect(() => defaults.ValidateCfnWebACLProps({ invalidProp: 'value' }))
    .toThrow(/ERROR - invalidProp is not a valid property of CfnWebACLProps/);
});
