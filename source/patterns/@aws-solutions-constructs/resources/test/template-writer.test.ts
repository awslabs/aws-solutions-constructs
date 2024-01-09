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

import { Duration, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import * as path from 'path';
import { TemplateValue, createTemplateWriterCustomResource } from '../lib/template-writer';

test('TemplateWriter sets properties correctly', () => {
  const stack = new Stack();

  const templateAsset = new Asset(stack, 'TemplateAsset', {
    path: path.join(__dirname, 'template/sample-template')
  });

  const templateValues: TemplateValue[] = new Array(
    {
      id: 'placeholder',
      value: 'resolved_value'
    }
  );

  createTemplateWriterCustomResource(stack, 'Test', {
    templateBucket: templateAsset.bucket,
    templateKey: templateAsset.s3ObjectKey,
    templateValues
  });

  const cfnTemplate = Template.fromStack(stack);

  cfnTemplate.hasResourceProperties('Custom::TemplateWriter', {
    TemplateValues: JSON.stringify({ templateValues }),
    TemplateInputKey: templateAsset.s3ObjectKey,
    TemplateInputBucket: {
      "Fn::Sub": "cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}"
    },
    TemplateOutputBucket: {
      "Fn::Sub": "cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}"
    },
  });
});

test('TemplateWriter accepts custom lambda function timeout and memory size', () => {
  const stack = new Stack();

  const templateAsset = new Asset(stack, 'TemplateAsset', {
    path: path.join(__dirname, 'template/sample-template')
  });

  const templateValues: TemplateValue[] = new Array(
    {
      id: 'placeholder',
      value: 'resolved_value'
    }
  );

  createTemplateWriterCustomResource(stack, 'Test', {
    templateBucket: templateAsset.bucket,
    templateKey: templateAsset.s3ObjectKey,
    templateValues,
    timeout: Duration.minutes(7),
    memorySize: 4096
  });

  const cfnTemplate = Template.fromStack(stack);

  cfnTemplate.hasResourceProperties('AWS::Lambda::Function', {
    Timeout: 420,
    MemorySize: 4096
  });
});
