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

import * as sagemaker from '@aws-cdk/aws-sagemaker';
import { DefaultSagemakerNotebookProps } from './sagemaker-defaults';
import * as cdk from '@aws-cdk/core';
import { overrideProps } from './utils';

export function buildSagemakerNotebook(scope: cdk.Construct, _roleArn: string, props: sagemaker.CfnNotebookInstanceProps): sagemaker.CfnNotebookInstance {
    //props = (props === undefined) ? {} : props;
    //Setup the notebook properties
    let sagemakerNotebookProps;
    if (props) {
        // If property overrides have been provided, incorporate them and deploy
        sagemakerNotebookProps = overrideProps(DefaultSagemakerNotebookProps, props);
    } else {
        // If no property overrides, deploy using the default configuration
        sagemakerNotebookProps = DefaultSagemakerNotebookProps;
    }

    // Create the notebook and return
    return new sagemaker.CfnNotebookInstance(scope, 'SagemakerNotebook', sagemakerNotebookProps);
}