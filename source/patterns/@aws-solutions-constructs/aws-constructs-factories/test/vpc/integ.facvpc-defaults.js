"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const aws_cdk_lib_1 = require("aws-cdk-lib");
const lib_1 = require("../../lib");
const core_1 = require("@aws-solutions-constructs/core");
const integ_tests_alpha_1 = require("@aws-cdk/integ-tests-alpha");
const ec2 = require("aws-cdk-lib/aws-ec2");
const app = new aws_cdk_lib_1.App();
const stack = new aws_cdk_lib_1.Stack(app, (0, core_1.generateIntegStackName)(__filename));
const factories = new lib_1.ConstructsFactories(stack, 'integ-test');
factories.vpcFactory('test', {
    subnetTypes: [
        ec2.SubnetType.PUBLIC,
        ec2.SubnetType.PRIVATE_ISOLATED
    ]
});
new integ_tests_alpha_1.IntegTest(stack, 'Integ', { testCases: [
        stack
    ] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWcuZmFjdnBjLWRlZmF1bHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaW50ZWcuZmFjdnBjLWRlZmF1bHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7R0FXRzs7QUFFSCw2Q0FBeUM7QUFDekMsbUNBQWdEO0FBQ2hELHlEQUF3RTtBQUN4RSxrRUFBdUQ7QUFDdkQsMkNBQTJDO0FBRTNDLE1BQU0sR0FBRyxHQUFHLElBQUksaUJBQUcsRUFBRSxDQUFDO0FBRXRCLE1BQU0sS0FBSyxHQUFHLElBQUksbUJBQUssQ0FBQyxHQUFHLEVBQUUsSUFBQSw2QkFBc0IsRUFBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBRWpFLE1BQU0sU0FBUyxHQUFHLElBQUkseUJBQW1CLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBRS9ELFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFO0lBQzNCLFdBQVcsRUFBRTtRQUNaLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTtRQUNyQixHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtLQUMvQjtDQUNGLENBQUMsQ0FBQztBQUVILElBQUksNkJBQVMsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFO1FBQ3pDLEtBQUs7S0FDTixFQUFFLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFU1xuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCB7IEFwcCwgU3RhY2sgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdHNGYWN0b3JpZXMgfSBmcm9tIFwiLi4vLi4vbGliXCI7XG5pbXBvcnQgeyBnZW5lcmF0ZUludGVnU3RhY2tOYW1lIH0gZnJvbSAnQGF3cy1zb2x1dGlvbnMtY29uc3RydWN0cy9jb3JlJztcbmltcG9ydCB7IEludGVnVGVzdCB9IGZyb20gJ0Bhd3MtY2RrL2ludGVnLXRlc3RzLWFscGhhJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcblxuY29uc3QgYXBwID0gbmV3IEFwcCgpO1xuXG5jb25zdCBzdGFjayA9IG5ldyBTdGFjayhhcHAsIGdlbmVyYXRlSW50ZWdTdGFja05hbWUoX19maWxlbmFtZSkpO1xuXG5jb25zdCBmYWN0b3JpZXMgPSBuZXcgQ29uc3RydWN0c0ZhY3RvcmllcyhzdGFjaywgJ2ludGVnLXRlc3QnKTtcblxuZmFjdG9yaWVzLnZwY0ZhY3RvcnkoJ3Rlc3QnLCB7XG4gIHN1Ym5ldFR5cGVzOiBbXG4gICBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVEXG4gIF1cbn0pO1xuXG5uZXcgSW50ZWdUZXN0KHN0YWNrLCAnSW50ZWcnLCB7IHRlc3RDYXNlczogW1xuICBzdGFja1xuXSB9KTtcbiJdfQ==