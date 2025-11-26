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
exports.handler = void 0;
exports.replaceTarget = replaceTarget;
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const s3Client = new client_s3_1.S3Client({ region: process.env.REGION });
const handler = async (event, context) => {
    let status = 'SUCCESS';
    let responseData = {};
    // These are the standard Create/Update/Delete custom resource request types defined here:
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref-requesttypes.html
    if (event.RequestType === 'Create' || event.RequestType === 'Update') {
        try {
            const templateValues = JSON.parse(event.ResourceProperties.TemplateValues).templateValues;
            const templateInputBucket = event.ResourceProperties.TemplateInputBucket;
            const templateInputKey = event.ResourceProperties.TemplateInputKey;
            const templateOutputBucket = event.ResourceProperties.TemplateOutputBucket;
            const templateOutputKey = crypto.randomBytes(32).toString('hex');
            const getObjectResponse = await s3Client.send(new client_s3_1.GetObjectCommand({
                Bucket: templateInputBucket,
                Key: templateInputKey
            }));
            let template = await getObjectResponse.Body?.transformToString();
            templateValues.forEach((templateValue) => {
                template = replaceTarget(template, templateValue);
            });
            await s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: templateOutputBucket,
                Key: templateOutputKey,
                Body: template
            }));
            responseData = {
                TemplateOutputKey: templateOutputKey
            };
        }
        catch (err) {
            status = 'FAILED';
            responseData = {
                Error: err
            };
        }
    }
    return {
        Status: status,
        Reason: JSON.stringify(responseData),
        PhysicalResourceId: event.PhysicalResourceId ?? context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData,
    };
};
exports.handler = handler;
function replaceTarget(template, templateValue) {
    template = template?.replace(new RegExp(`\\b${templateValue.id}\\b`, 'g'), templateValue.value);
    return template;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O0dBV0c7OztBQTRESCxzQ0FNQztBQWhFRCxrREFBa0Y7QUFDbEYsaUNBQWlDO0FBRWpDLE1BQU0sUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFFdkQsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQVUsRUFBRSxPQUFZLEVBQUUsRUFBRTtJQUN4RCxJQUFJLE1BQU0sR0FBRyxTQUFTLENBQUM7SUFDdkIsSUFBSSxZQUFZLEdBQUcsRUFBRSxDQUFDO0lBRXRCLDBGQUEwRjtJQUMxRiw0RkFBNEY7SUFDNUYsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3JFLElBQUksQ0FBQztZQUNILE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDLGNBQWMsQ0FBQztZQUMxRixNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQztZQUN6RSxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQztZQUNuRSxNQUFNLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FBQztZQUMzRSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRWpFLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksNEJBQWdCLENBQUM7Z0JBQ2pFLE1BQU0sRUFBRSxtQkFBbUI7Z0JBQzNCLEdBQUcsRUFBRSxnQkFBZ0I7YUFDdEIsQ0FBQyxDQUFDLENBQUM7WUFFSixJQUFJLFFBQVEsR0FBRyxNQUFNLGlCQUFpQixDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxDQUFDO1lBRWpFLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxhQUFrQixFQUFFLEVBQUU7Z0JBQzVDLFFBQVEsR0FBRyxhQUFhLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksNEJBQWdCLENBQUM7Z0JBQ3ZDLE1BQU0sRUFBRSxvQkFBb0I7Z0JBQzVCLEdBQUcsRUFBRSxpQkFBaUI7Z0JBQ3RCLElBQUksRUFBRSxRQUFRO2FBQ2YsQ0FBQyxDQUFDLENBQUM7WUFFSixZQUFZLEdBQUc7Z0JBQ2IsaUJBQWlCLEVBQUUsaUJBQWlCO2FBQ3JDLENBQUM7UUFDSixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNiLE1BQU0sR0FBRyxRQUFRLENBQUM7WUFDbEIsWUFBWSxHQUFHO2dCQUNiLEtBQUssRUFBRSxHQUFHO2FBQ1gsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0lBRUQsT0FBTztRQUNMLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDO1FBQ3BDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxrQkFBa0IsSUFBSSxPQUFPLENBQUMsYUFBYTtRQUNyRSxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87UUFDdEIsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO1FBQzFCLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxpQkFBaUI7UUFDMUMsSUFBSSxFQUFFLFlBQVk7S0FDbkIsQ0FBQztBQUNKLENBQUMsQ0FBQztBQW5EVyxRQUFBLE9BQU8sV0FtRGxCO0FBRUYsU0FBZ0IsYUFBYSxDQUFDLFFBQTRCLEVBQUUsYUFBa0I7SUFDNUUsUUFBUSxHQUFHLFFBQVEsRUFBRSxPQUFPLENBQzFCLElBQUksTUFBTSxDQUFDLE1BQU0sYUFBYSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUM1QyxhQUFhLENBQUMsS0FBSyxDQUNwQixDQUFDO0lBQ0YsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFU1xuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCB7IFMzQ2xpZW50LCBHZXRPYmplY3RDb21tYW5kLCBQdXRPYmplY3RDb21tYW5kIH0gZnJvbSBcIkBhd3Mtc2RrL2NsaWVudC1zM1wiO1xuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbmNvbnN0IHMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5SRUdJT04gfSk7XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBhbnksIGNvbnRleHQ6IGFueSkgPT4ge1xuICBsZXQgc3RhdHVzID0gJ1NVQ0NFU1MnO1xuICBsZXQgcmVzcG9uc2VEYXRhID0ge307XG5cbiAgLy8gVGhlc2UgYXJlIHRoZSBzdGFuZGFyZCBDcmVhdGUvVXBkYXRlL0RlbGV0ZSBjdXN0b20gcmVzb3VyY2UgcmVxdWVzdCB0eXBlcyBkZWZpbmVkIGhlcmU6XG4gIC8vIGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9BV1NDbG91ZEZvcm1hdGlvbi9sYXRlc3QvVXNlckd1aWRlL2NycGctcmVmLXJlcXVlc3R0eXBlcy5odG1sXG4gIGlmIChldmVudC5SZXF1ZXN0VHlwZSA9PT0gJ0NyZWF0ZScgfHwgZXZlbnQuUmVxdWVzdFR5cGUgPT09ICdVcGRhdGUnKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVmFsdWVzID0gSlNPTi5wYXJzZShldmVudC5SZXNvdXJjZVByb3BlcnRpZXMuVGVtcGxhdGVWYWx1ZXMpLnRlbXBsYXRlVmFsdWVzO1xuICAgICAgY29uc3QgdGVtcGxhdGVJbnB1dEJ1Y2tldCA9IGV2ZW50LlJlc291cmNlUHJvcGVydGllcy5UZW1wbGF0ZUlucHV0QnVja2V0O1xuICAgICAgY29uc3QgdGVtcGxhdGVJbnB1dEtleSA9IGV2ZW50LlJlc291cmNlUHJvcGVydGllcy5UZW1wbGF0ZUlucHV0S2V5O1xuICAgICAgY29uc3QgdGVtcGxhdGVPdXRwdXRCdWNrZXQgPSBldmVudC5SZXNvdXJjZVByb3BlcnRpZXMuVGVtcGxhdGVPdXRwdXRCdWNrZXQ7XG4gICAgICBjb25zdCB0ZW1wbGF0ZU91dHB1dEtleSA9IGNyeXB0by5yYW5kb21CeXRlcygzMikudG9TdHJpbmcoJ2hleCcpO1xuXG4gICAgICBjb25zdCBnZXRPYmplY3RSZXNwb25zZSA9IGF3YWl0IHMzQ2xpZW50LnNlbmQobmV3IEdldE9iamVjdENvbW1hbmQoe1xuICAgICAgICBCdWNrZXQ6IHRlbXBsYXRlSW5wdXRCdWNrZXQsXG4gICAgICAgIEtleTogdGVtcGxhdGVJbnB1dEtleVxuICAgICAgfSkpO1xuXG4gICAgICBsZXQgdGVtcGxhdGUgPSBhd2FpdCBnZXRPYmplY3RSZXNwb25zZS5Cb2R5Py50cmFuc2Zvcm1Ub1N0cmluZygpO1xuXG4gICAgICB0ZW1wbGF0ZVZhbHVlcy5mb3JFYWNoKCh0ZW1wbGF0ZVZhbHVlOiBhbnkpID0+IHtcbiAgICAgICAgdGVtcGxhdGUgPSByZXBsYWNlVGFyZ2V0KHRlbXBsYXRlLCB0ZW1wbGF0ZVZhbHVlKTtcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCBzM0NsaWVudC5zZW5kKG5ldyBQdXRPYmplY3RDb21tYW5kKHtcbiAgICAgICAgQnVja2V0OiB0ZW1wbGF0ZU91dHB1dEJ1Y2tldCxcbiAgICAgICAgS2V5OiB0ZW1wbGF0ZU91dHB1dEtleSxcbiAgICAgICAgQm9keTogdGVtcGxhdGVcbiAgICAgIH0pKTtcblxuICAgICAgcmVzcG9uc2VEYXRhID0ge1xuICAgICAgICBUZW1wbGF0ZU91dHB1dEtleTogdGVtcGxhdGVPdXRwdXRLZXlcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBzdGF0dXMgPSAnRkFJTEVEJztcbiAgICAgIHJlc3BvbnNlRGF0YSA9IHtcbiAgICAgICAgRXJyb3I6IGVyclxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIFN0YXR1czogc3RhdHVzLFxuICAgIFJlYXNvbjogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2VEYXRhKSxcbiAgICBQaHlzaWNhbFJlc291cmNlSWQ6IGV2ZW50LlBoeXNpY2FsUmVzb3VyY2VJZCA/PyBjb250ZXh0LmxvZ1N0cmVhbU5hbWUsXG4gICAgU3RhY2tJZDogZXZlbnQuU3RhY2tJZCxcbiAgICBSZXF1ZXN0SWQ6IGV2ZW50LlJlcXVlc3RJZCxcbiAgICBMb2dpY2FsUmVzb3VyY2VJZDogZXZlbnQuTG9naWNhbFJlc291cmNlSWQsXG4gICAgRGF0YTogcmVzcG9uc2VEYXRhLFxuICB9O1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlcGxhY2VUYXJnZXQodGVtcGxhdGU6IHN0cmluZyB8IHVuZGVmaW5lZCwgdGVtcGxhdGVWYWx1ZTogYW55KSB7XG4gIHRlbXBsYXRlID0gdGVtcGxhdGU/LnJlcGxhY2UoXG4gICAgbmV3IFJlZ0V4cChgXFxcXGIke3RlbXBsYXRlVmFsdWUuaWR9XFxcXGJgLCAnZycpLFxuICAgIHRlbXBsYXRlVmFsdWUudmFsdWVcbiAgKTtcbiAgcmV0dXJuIHRlbXBsYXRlO1xufVxuIl19