/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { App } from "aws-cdk-lib";
import { AwsCustomGlueEtlStack } from "../lib/aws-custom-glue-etl-stack";

const app = new App();
const stack = new AwsCustomGlueEtlStack(app, 'IntegTestGlueJob');
stack.templateOptions.description = 'Integration Test for sample application that uses aws-kineisstream-glue-job construct';