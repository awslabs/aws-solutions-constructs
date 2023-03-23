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
import { Stack, Duration } from 'aws-cdk-lib';
import { ApiGatewayToKinesisStreams } from '../lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { Template } from 'aws-cdk-lib/assertions';

// --------------------------------------------------------------
// Test construct properties
// --------------------------------------------------------------
test('Test construct properties', () => {
  const stack = new Stack();
  const pattern = new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis', {});

  expect(pattern.apiGateway !== null);
  expect(pattern.apiGatewayRole !== null);
  expect(pattern.apiGatewayCloudWatchRole !== null);
  expect(pattern.apiGatewayLogGroup !== null);
  expect(pattern.kinesisStream !== null);
  expect(pattern.cloudwatchAlarms !== null);
});

// --------------------------------------------------------------
// Test deployment w/ overwritten properties
// --------------------------------------------------------------
test('Test deployment w/ overwritten properties', () => {
  const stack = new Stack();

  new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis', {
    apiGatewayProps: {
      restApiName: 'my-api',
      deployOptions: {
        methodOptions: {
          '/*/*': {
            throttlingRateLimit: 100,
            throttlingBurstLimit: 25
          }
        }
      }
    },
    kinesisStreamProps: {
      shardCount: 1,
      streamName: 'my-stream'
    },
    putRecordRequestTemplate: `{ "Data": "$util.base64Encode($input.json('$.foo'))", "PartitionKey": "$input.path('$.bar')" }`,
    putRecordRequestModel: { schema: {} },
    putRecordsRequestTemplate: `{ "Records": [ #foreach($elem in $input.path('$.records')) { "Data": "$util.base64Encode($elem.foo)", "PartitionKey": "$elem.bar"}#if($foreach.hasNext),#end #end ] }`,
    putRecordsRequestModel: { schema: {} }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Stage', {
    MethodSettings: [
      {
        DataTraceEnabled: false,
        HttpMethod: '*',
        LoggingLevel: 'INFO',
        ResourcePath: '/*'
      },
      {
        HttpMethod: '*',
        ResourcePath: '/*',
        ThrottlingRateLimit: 100,
        ThrottlingBurstLimit: 25
      }
    ]
  });

  template.hasResourceProperties('AWS::Kinesis::Stream', {
    ShardCount: 1,
    Name: 'my-stream'
  });

  // Test for Cloudwatch Alarms
  template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
});

// --------------------------------------------------------------
// Test deployment w/ existing stream without default cloudwatch alarms
// --------------------------------------------------------------
test('Test deployment w/ existing stream', () => {
  const stack = new Stack();

  const construct = new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis', {
    apiGatewayProps: {},
    existingStreamObj: new kinesis.Stream(stack, 'ExistingStream', {
      shardCount: 5,
      retentionPeriod: Duration.days(4)
    }),
    createCloudWatchAlarms: false
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kinesis::Stream', {
    ShardCount: 5,
    RetentionPeriodHours: 96
  });

  expect(construct.cloudwatchAlarms == null);

  // Since createCloudWatchAlars is set to false, no Alarm should exist
  template.resourceCountIs('AWS::CloudWatch::Alarm', 0);
});

test('Construct accepts additional PutRecord request templates', () => {
  const stack = new Stack();
  new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis-streams ', {
    additionalPutRecordRequestTemplates: {
      'text/plain': 'custom-template'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'POST',
    Integration: {
      RequestTemplates: {
        'text/plain': 'custom-template'
      }
    }
  });
});

test('Construct accepts additional PutRecords request templates', () => {
  const stack = new Stack();
  new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis-streams ', {
    additionalPutRecordsRequestTemplates: {
      'text/plain': 'custom-template'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'POST',
    Integration: {
      RequestTemplates: {
        'text/plain': 'custom-template'
      }
    }
  });
});

test('Construct uses default integration responses', () => {
  const stack = new Stack();
  new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis-streams ', {});

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'POST',
    Integration: {
      IntegrationResponses: [
        {
          StatusCode: '200'
        },
        {
          ResponseTemplates: {
            'text/html': 'Error'
          },
          SelectionPattern: '500',
          StatusCode: '500'
        }
      ]
    }
  });
});

test('Construct uses custom putRecordIntegrationResponses property', () => {
  const stack = new Stack();
  new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis-streams ', {
    putRecordIntegrationResponses: [
      {
        statusCode: '200',
        responseTemplates: {
          'text/html': 'OK'
        }
      }
    ]
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'POST',
    Integration: {
      IntegrationResponses: [
        {
          ResponseTemplates: {
            'text/html': 'OK'
          },
          StatusCode: '200'
        }
      ]
    }
  });
});

test('Construct uses custom putRecordsIntegrationResponses property', () => {
  const stack = new Stack();
  new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis-streams ', {
    putRecordsIntegrationResponses: [
      {
        statusCode: '200',
        responseTemplates: {
          'text/html': 'OK'
        }
      }
    ]
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ApiGateway::Method', {
    HttpMethod: 'POST',
    Integration: {
      IntegrationResponses: [
        {
          ResponseTemplates: {
            'text/html': 'OK'
          },
          StatusCode: '200'
        }
      ]
    }
  });
});