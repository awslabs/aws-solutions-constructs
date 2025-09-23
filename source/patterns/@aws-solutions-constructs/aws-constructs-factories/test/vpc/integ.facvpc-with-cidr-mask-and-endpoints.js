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
        ec2.SubnetType.PRIVATE_ISOLATED
    ],
    subnetIPAddresses: 160,
    endPoints: [
        lib_1.ServiceEndpointTypes.BEDROCK,
        lib_1.ServiceEndpointTypes.SQS
    ]
});
new integ_tests_alpha_1.IntegTest(stack, 'Integ', {
    testCases: [
        stack
    ]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWcuZmFjdnBjLXdpdGgtY2lkci1tYXNrLWFuZC1lbmRwb2ludHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbnRlZy5mYWN2cGMtd2l0aC1jaWRyLW1hc2stYW5kLWVuZHBvaW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O0dBV0c7O0FBRUgsNkNBQXlDO0FBQ3pDLG1DQUFzRTtBQUN0RSx5REFBd0U7QUFDeEUsa0VBQXVEO0FBQ3ZELDJDQUEyQztBQUUzQyxNQUFNLEdBQUcsR0FBRyxJQUFJLGlCQUFHLEVBQUUsQ0FBQztBQUV0QixNQUFNLEtBQUssR0FBRyxJQUFJLG1CQUFLLENBQUMsR0FBRyxFQUFFLElBQUEsNkJBQXNCLEVBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUVqRSxNQUFNLFNBQVMsR0FBRyxJQUFJLHlCQUFtQixDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztBQUUvRCxTQUFTLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtJQUMzQixXQUFXLEVBQUU7UUFDWCxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtLQUNoQztJQUNELGlCQUFpQixFQUFFLEdBQUc7SUFDdEIsU0FBUyxFQUFFO1FBQ1QsMEJBQW9CLENBQUMsT0FBTztRQUM1QiwwQkFBb0IsQ0FBQyxHQUFHO0tBQ3pCO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsSUFBSSw2QkFBUyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUU7SUFDNUIsU0FBUyxFQUFFO1FBQ1QsS0FBSztLQUNOO0NBQ0YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2VcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnNcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0IHsgQXBwLCBTdGFjayB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ29uc3RydWN0c0ZhY3RvcmllcywgU2VydmljZUVuZHBvaW50VHlwZXMgfSBmcm9tIFwiLi4vLi4vbGliXCI7XG5pbXBvcnQgeyBnZW5lcmF0ZUludGVnU3RhY2tOYW1lIH0gZnJvbSAnQGF3cy1zb2x1dGlvbnMtY29uc3RydWN0cy9jb3JlJztcbmltcG9ydCB7IEludGVnVGVzdCB9IGZyb20gJ0Bhd3MtY2RrL2ludGVnLXRlc3RzLWFscGhhJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcblxuY29uc3QgYXBwID0gbmV3IEFwcCgpO1xuXG5jb25zdCBzdGFjayA9IG5ldyBTdGFjayhhcHAsIGdlbmVyYXRlSW50ZWdTdGFja05hbWUoX19maWxlbmFtZSkpO1xuXG5jb25zdCBmYWN0b3JpZXMgPSBuZXcgQ29uc3RydWN0c0ZhY3RvcmllcyhzdGFjaywgJ2ludGVnLXRlc3QnKTtcblxuZmFjdG9yaWVzLnZwY0ZhY3RvcnkoJ3Rlc3QnLCB7XG4gIHN1Ym5ldFR5cGVzOiBbXG4gICAgZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRFxuICBdLFxuICBzdWJuZXRJUEFkZHJlc3NlczogMTYwLFxuICBlbmRQb2ludHM6IFtcbiAgICBTZXJ2aWNlRW5kcG9pbnRUeXBlcy5CRURST0NLLFxuICAgIFNlcnZpY2VFbmRwb2ludFR5cGVzLlNRU1xuICBdXG59KTtcblxubmV3IEludGVnVGVzdChzdGFjaywgJ0ludGVnJywge1xuICB0ZXN0Q2FzZXM6IFtcbiAgICBzdGFja1xuICBdXG59KTtcbiJdfQ==