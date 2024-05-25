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

import { Match, Template } from 'aws-cdk-lib/assertions';
import * as kms from 'aws-cdk-lib/aws-kms';

/*
 * Checking the specific type of key associated  with a resource is non-trivial. We've
 * extracted the functionality here to keep the code  that checks the test result cleaner
 */

export enum keyType {
  cmk,
  sse,
  none
}

export function CheckTopicKeyType(template: Template, type: keyType) {
  // First ensure there's an encryption key
  if (type === keyType.none) {
    template.hasResourceProperties("AWS::SNS::Topic", Match.not({
      KmsMasterKeyId: Match.anyValue()
    }));
  } else {
    template.hasResourceProperties("AWS::SNS::Topic", {
      KmsMasterKeyId: Match.anyValue()
    });

    // Now confirm is is the correct  type
    if (type === keyType.cmk) {
      template.hasResourceProperties("AWS::SNS::Topic", Match.not({
        KmsMasterKeyId: {
          "Fn::Join": ["", Match.arrayWith([":alias/aws/sns"])]
        }
      }));
    } else if (type === keyType.sse) {
      template.hasResourceProperties("AWS::SNS::Topic", {
        KmsMasterKeyId: {
          "Fn::Join": ["", Match.arrayWith([":alias/aws/sns"])]
        }
      });
    } else {
      throw new Error('Invalid Key Type');
    }
  }
}

export function CheckQueueKeyType(template: Template, type: keyType) {
  if (type === keyType.none) {
    template.hasResourceProperties("AWS::SQS::Queue", Match.not({
      KmsMasterKeyId: Match.anyValue()
    }));
  } else {
    template.hasResourceProperties("AWS::SQS::Queue", {
      KmsMasterKeyId: Match.anyValue()
    });

    // Now confirm is is the correct  type
    if (type === keyType.cmk) {
      template.hasResourceProperties("AWS::SQS::Queue", Match.not({
        KmsMasterKeyId: {
          "Fn::Join": ["", Match.arrayWith([":alias/aws/sqs"])]
        }
      }));
    } else if (type === keyType.sse) {
      template.hasResourceProperties("AWS::SQS::Queue", {
        KmsMasterKeyId: {
          "Fn::Join": ["", Match.arrayWith([":alias/aws/sqs"])]
        }
      });
    } else {
      throw new Error('Invalid Key Type');
    }
  }
}

export function CheckKeyProperty(encryptionKey: kms.Key | undefined, type: keyType) {
  // Ensure the value  is set
  if (type === keyType.none) {
    expect(encryptionKey).toBeUndefined();
  } else {
    expect(encryptionKey).toBeDefined();

    // Now confirm it is the correct type\
    if (type === keyType.cmk) {
      expect(encryptionKey?.keyArn).not.toContain('alias/aws/sns');
    } else if (type === keyType.sse) {
      expect(encryptionKey?.keyArn).toContain('alias/aws/sns');
    } else {
      throw new Error('Invalid Key Type');
    }
  }
}