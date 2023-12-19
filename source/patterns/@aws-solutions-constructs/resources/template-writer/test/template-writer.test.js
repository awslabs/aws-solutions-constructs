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
const assertions_1 = require("aws-cdk-lib/assertions");
const template_writer_1 = require("../lib/template-writer");
const aws_s3_assets_1 = require("aws-cdk-lib/aws-s3-assets");
const path = require("path");
test('TemplateWriter sets properties correctly', () => {
    const stack = new aws_cdk_lib_1.Stack();
    const templateAsset = new aws_s3_assets_1.Asset(stack, 'TemplateAsset', {
        path: path.join(__dirname, 'template/sample-template')
    });
    const templateValues = new Array({
        id: 'placeholder',
        value: 'resolved_value'
    });
    (0, template_writer_1.createTemplateWriterCustomResource)(stack, 'Test', {
        templateBucket: templateAsset.bucket,
        templateKey: templateAsset.s3ObjectKey,
        templateValues
    });
    const cfnTemplate = assertions_1.Template.fromStack(stack);
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
    const stack = new aws_cdk_lib_1.Stack();
    const templateAsset = new aws_s3_assets_1.Asset(stack, 'TemplateAsset', {
        path: path.join(__dirname, 'template/sample-template')
    });
    const templateValues = new Array({
        id: 'placeholder',
        value: 'resolved_value'
    });
    (0, template_writer_1.createTemplateWriterCustomResource)(stack, 'Test', {
        templateBucket: templateAsset.bucket,
        templateKey: templateAsset.s3ObjectKey,
        templateValues,
        timeout: aws_cdk_lib_1.Duration.minutes(7),
        memorySize: 4096
    });
    const cfnTemplate = assertions_1.Template.fromStack(stack);
    cfnTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 420,
        MemorySize: 4096
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtd3JpdGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZW1wbGF0ZS13cml0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O0dBV0c7O0FBRUgsNkNBQThDO0FBQzlDLHVEQUFrRDtBQUNsRCw0REFBMkY7QUFDM0YsNkRBQWtEO0FBQ2xELDZCQUE2QjtBQUU3QixJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO0lBQ3BELE1BQU0sS0FBSyxHQUFHLElBQUksbUJBQUssRUFBRSxDQUFDO0lBRTFCLE1BQU0sYUFBYSxHQUFHLElBQUkscUJBQUssQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFO1FBQ3RELElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwwQkFBMEIsQ0FBQztLQUN2RCxDQUFDLENBQUM7SUFFSCxNQUFNLGNBQWMsR0FBb0IsSUFBSSxLQUFLLENBQy9DO1FBQ0UsRUFBRSxFQUFFLGFBQWE7UUFDakIsS0FBSyxFQUFFLGdCQUFnQjtLQUN4QixDQUNGLENBQUM7SUFFRixJQUFBLG9EQUFrQyxFQUFDLEtBQUssRUFBRSxNQUFNLEVBQUU7UUFDaEQsY0FBYyxFQUFFLGFBQWEsQ0FBQyxNQUFNO1FBQ3BDLFdBQVcsRUFBRSxhQUFhLENBQUMsV0FBVztRQUN0QyxjQUFjO0tBQ2YsQ0FBQyxDQUFDO0lBRUgsTUFBTSxXQUFXLEdBQUcscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFOUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixFQUFFO1FBQzFELGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsY0FBYyxFQUFFLENBQUM7UUFDbEQsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLFdBQVc7UUFDM0MsbUJBQW1CLEVBQUU7WUFDbkIsU0FBUyxFQUFFLHVEQUF1RDtTQUNuRTtRQUNELG9CQUFvQixFQUFFO1lBQ3BCLFNBQVMsRUFBRSx1REFBdUQ7U0FDbkU7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyx1RUFBdUUsRUFBRSxHQUFHLEVBQUU7SUFDakYsTUFBTSxLQUFLLEdBQUcsSUFBSSxtQkFBSyxFQUFFLENBQUM7SUFFMUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxxQkFBSyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUU7UUFDdEQsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDBCQUEwQixDQUFDO0tBQ3ZELENBQUMsQ0FBQztJQUVILE1BQU0sY0FBYyxHQUFvQixJQUFJLEtBQUssQ0FDL0M7UUFDRSxFQUFFLEVBQUUsYUFBYTtRQUNqQixLQUFLLEVBQUUsZ0JBQWdCO0tBQ3hCLENBQ0YsQ0FBQztJQUVGLElBQUEsb0RBQWtDLEVBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRTtRQUNoRCxjQUFjLEVBQUUsYUFBYSxDQUFDLE1BQU07UUFDcEMsV0FBVyxFQUFFLGFBQWEsQ0FBQyxXQUFXO1FBQ3RDLGNBQWM7UUFDZCxPQUFPLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzVCLFVBQVUsRUFBRSxJQUFJO0tBQ2pCLENBQUMsQ0FBQztJQUVILE1BQU0sV0FBVyxHQUFHLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTlDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsRUFBRTtRQUN6RCxPQUFPLEVBQUUsR0FBRztRQUNaLFVBQVUsRUFBRSxJQUFJO0tBQ2pCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2VcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnNcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0IHsgRHVyYXRpb24sIFN0YWNrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgVGVtcGxhdGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcbmltcG9ydCB7IFRlbXBsYXRlVmFsdWUsIGNyZWF0ZVRlbXBsYXRlV3JpdGVyQ3VzdG9tUmVzb3VyY2UgfSBmcm9tICcuLi9saWIvdGVtcGxhdGUtd3JpdGVyJztcbmltcG9ydCB7IEFzc2V0IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWFzc2V0cyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG50ZXN0KCdUZW1wbGF0ZVdyaXRlciBzZXRzIHByb3BlcnRpZXMgY29ycmVjdGx5JywgKCkgPT4ge1xuICBjb25zdCBzdGFjayA9IG5ldyBTdGFjaygpO1xuXG4gIGNvbnN0IHRlbXBsYXRlQXNzZXQgPSBuZXcgQXNzZXQoc3RhY2ssICdUZW1wbGF0ZUFzc2V0Jywge1xuICAgIHBhdGg6IHBhdGguam9pbihfX2Rpcm5hbWUsICd0ZW1wbGF0ZS9zYW1wbGUtdGVtcGxhdGUnKVxuICB9KTtcblxuICBjb25zdCB0ZW1wbGF0ZVZhbHVlczogVGVtcGxhdGVWYWx1ZVtdID0gbmV3IEFycmF5KFxuICAgIHtcbiAgICAgIGlkOiAncGxhY2Vob2xkZXInLFxuICAgICAgdmFsdWU6ICdyZXNvbHZlZF92YWx1ZSdcbiAgICB9XG4gICk7XG5cbiAgY3JlYXRlVGVtcGxhdGVXcml0ZXJDdXN0b21SZXNvdXJjZShzdGFjaywgJ1Rlc3QnLCB7XG4gICAgdGVtcGxhdGVCdWNrZXQ6IHRlbXBsYXRlQXNzZXQuYnVja2V0LFxuICAgIHRlbXBsYXRlS2V5OiB0ZW1wbGF0ZUFzc2V0LnMzT2JqZWN0S2V5LFxuICAgIHRlbXBsYXRlVmFsdWVzXG4gIH0pO1xuXG4gIGNvbnN0IGNmblRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICBjZm5UZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0N1c3RvbTo6VGVtcGxhdGVXcml0ZXInLCB7XG4gICAgVGVtcGxhdGVWYWx1ZXM6IEpTT04uc3RyaW5naWZ5KHsgdGVtcGxhdGVWYWx1ZXMgfSksXG4gICAgVGVtcGxhdGVJbnB1dEtleTogdGVtcGxhdGVBc3NldC5zM09iamVjdEtleSxcbiAgICBUZW1wbGF0ZUlucHV0QnVja2V0OiB7XG4gICAgICBcIkZuOjpTdWJcIjogXCJjZGstaG5iNjU5ZmRzLWFzc2V0cy0ke0FXUzo6QWNjb3VudElkfS0ke0FXUzo6UmVnaW9ufVwiXG4gICAgfSxcbiAgICBUZW1wbGF0ZU91dHB1dEJ1Y2tldDoge1xuICAgICAgXCJGbjo6U3ViXCI6IFwiY2RrLWhuYjY1OWZkcy1hc3NldHMtJHtBV1M6OkFjY291bnRJZH0tJHtBV1M6OlJlZ2lvbn1cIlxuICAgIH0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ1RlbXBsYXRlV3JpdGVyIGFjY2VwdHMgY3VzdG9tIGxhbWJkYSBmdW5jdGlvbiB0aW1lb3V0IGFuZCBtZW1vcnkgc2l6ZScsICgpID0+IHtcbiAgY29uc3Qgc3RhY2sgPSBuZXcgU3RhY2soKTtcblxuICBjb25zdCB0ZW1wbGF0ZUFzc2V0ID0gbmV3IEFzc2V0KHN0YWNrLCAnVGVtcGxhdGVBc3NldCcsIHtcbiAgICBwYXRoOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAndGVtcGxhdGUvc2FtcGxlLXRlbXBsYXRlJylcbiAgfSk7XG5cbiAgY29uc3QgdGVtcGxhdGVWYWx1ZXM6IFRlbXBsYXRlVmFsdWVbXSA9IG5ldyBBcnJheShcbiAgICB7XG4gICAgICBpZDogJ3BsYWNlaG9sZGVyJyxcbiAgICAgIHZhbHVlOiAncmVzb2x2ZWRfdmFsdWUnXG4gICAgfVxuICApO1xuXG4gIGNyZWF0ZVRlbXBsYXRlV3JpdGVyQ3VzdG9tUmVzb3VyY2Uoc3RhY2ssICdUZXN0Jywge1xuICAgIHRlbXBsYXRlQnVja2V0OiB0ZW1wbGF0ZUFzc2V0LmJ1Y2tldCxcbiAgICB0ZW1wbGF0ZUtleTogdGVtcGxhdGVBc3NldC5zM09iamVjdEtleSxcbiAgICB0ZW1wbGF0ZVZhbHVlcyxcbiAgICB0aW1lb3V0OiBEdXJhdGlvbi5taW51dGVzKDcpLFxuICAgIG1lbW9yeVNpemU6IDQwOTZcbiAgfSk7XG5cbiAgY29uc3QgY2ZuVGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuXG4gIGNmblRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywge1xuICAgIFRpbWVvdXQ6IDQyMCxcbiAgICBNZW1vcnlTaXplOiA0MDk2XG4gIH0pO1xufSk7XG4iXX0=