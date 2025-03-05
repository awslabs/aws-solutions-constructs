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
                template = template?.replace(new RegExp(templateValue.id, 'g'), templateValue.value);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O0dBV0c7OztBQUVILGtEQUFrRjtBQUNsRixpQ0FBaUM7QUFFakMsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUV2RCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBVSxFQUFFLE9BQVksRUFBRSxFQUFFO0lBQ3hELElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQztJQUN2QixJQUFJLFlBQVksR0FBRyxFQUFFLENBQUM7SUFFdEIsMEZBQTBGO0lBQzFGLDRGQUE0RjtJQUM1RixJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDckUsSUFBSSxDQUFDO1lBQ0gsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUMsY0FBYyxDQUFDO1lBQzFGLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDO1lBQ3pFLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDO1lBQ25FLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixDQUFDO1lBQzNFLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFakUsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSw0QkFBZ0IsQ0FBQztnQkFDakUsTUFBTSxFQUFFLG1CQUFtQjtnQkFDM0IsR0FBRyxFQUFFLGdCQUFnQjthQUN0QixDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksUUFBUSxHQUFHLE1BQU0saUJBQWlCLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFLENBQUM7WUFFakUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGFBQWtCLEVBQUUsRUFBRTtnQkFDNUMsUUFBUSxHQUFHLFFBQVEsRUFBRSxPQUFPLENBQzFCLElBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQ2pDLGFBQWEsQ0FBQyxLQUFLLENBQ3BCLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLDRCQUFnQixDQUFDO2dCQUN2QyxNQUFNLEVBQUUsb0JBQW9CO2dCQUM1QixHQUFHLEVBQUUsaUJBQWlCO2dCQUN0QixJQUFJLEVBQUUsUUFBUTthQUNmLENBQUMsQ0FBQyxDQUFDO1lBRUosWUFBWSxHQUFHO2dCQUNiLGlCQUFpQixFQUFFLGlCQUFpQjthQUNyQyxDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsUUFBUSxDQUFDO1lBQ2xCLFlBQVksR0FBRztnQkFDYixLQUFLLEVBQUUsR0FBRzthQUNYLENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU87UUFDTCxNQUFNLEVBQUUsTUFBTTtRQUNkLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQztRQUNwQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsa0JBQWtCLElBQUksT0FBTyxDQUFDLGFBQWE7UUFDckUsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO1FBQ3RCLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztRQUMxQixpQkFBaUIsRUFBRSxLQUFLLENBQUMsaUJBQWlCO1FBQzFDLElBQUksRUFBRSxZQUFZO0tBQ25CLENBQUM7QUFDSixDQUFDLENBQUM7QUF0RFcsUUFBQSxPQUFPLFdBc0RsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXRcbiAqXG4gKiAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqICBvciBpbiB0aGUgJ2xpY2Vuc2UnIGZpbGUgYWNjb21wYW55aW5nIHRoaXMgZmlsZS4gVGhpcyBmaWxlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFU1xuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCB7IFMzQ2xpZW50LCBHZXRPYmplY3RDb21tYW5kLCBQdXRPYmplY3RDb21tYW5kIH0gZnJvbSBcIkBhd3Mtc2RrL2NsaWVudC1zM1wiO1xuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbmNvbnN0IHMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5SRUdJT04gfSk7XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBhbnksIGNvbnRleHQ6IGFueSkgPT4ge1xuICBsZXQgc3RhdHVzID0gJ1NVQ0NFU1MnO1xuICBsZXQgcmVzcG9uc2VEYXRhID0ge307XG5cbiAgLy8gVGhlc2UgYXJlIHRoZSBzdGFuZGFyZCBDcmVhdGUvVXBkYXRlL0RlbGV0ZSBjdXN0b20gcmVzb3VyY2UgcmVxdWVzdCB0eXBlcyBkZWZpbmVkIGhlcmU6XG4gIC8vIGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9BV1NDbG91ZEZvcm1hdGlvbi9sYXRlc3QvVXNlckd1aWRlL2NycGctcmVmLXJlcXVlc3R0eXBlcy5odG1sXG4gIGlmIChldmVudC5SZXF1ZXN0VHlwZSA9PT0gJ0NyZWF0ZScgfHwgZXZlbnQuUmVxdWVzdFR5cGUgPT09ICdVcGRhdGUnKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVmFsdWVzID0gSlNPTi5wYXJzZShldmVudC5SZXNvdXJjZVByb3BlcnRpZXMuVGVtcGxhdGVWYWx1ZXMpLnRlbXBsYXRlVmFsdWVzO1xuICAgICAgY29uc3QgdGVtcGxhdGVJbnB1dEJ1Y2tldCA9IGV2ZW50LlJlc291cmNlUHJvcGVydGllcy5UZW1wbGF0ZUlucHV0QnVja2V0O1xuICAgICAgY29uc3QgdGVtcGxhdGVJbnB1dEtleSA9IGV2ZW50LlJlc291cmNlUHJvcGVydGllcy5UZW1wbGF0ZUlucHV0S2V5O1xuICAgICAgY29uc3QgdGVtcGxhdGVPdXRwdXRCdWNrZXQgPSBldmVudC5SZXNvdXJjZVByb3BlcnRpZXMuVGVtcGxhdGVPdXRwdXRCdWNrZXQ7XG4gICAgICBjb25zdCB0ZW1wbGF0ZU91dHB1dEtleSA9IGNyeXB0by5yYW5kb21CeXRlcygzMikudG9TdHJpbmcoJ2hleCcpO1xuXG4gICAgICBjb25zdCBnZXRPYmplY3RSZXNwb25zZSA9IGF3YWl0IHMzQ2xpZW50LnNlbmQobmV3IEdldE9iamVjdENvbW1hbmQoe1xuICAgICAgICBCdWNrZXQ6IHRlbXBsYXRlSW5wdXRCdWNrZXQsXG4gICAgICAgIEtleTogdGVtcGxhdGVJbnB1dEtleVxuICAgICAgfSkpO1xuXG4gICAgICBsZXQgdGVtcGxhdGUgPSBhd2FpdCBnZXRPYmplY3RSZXNwb25zZS5Cb2R5Py50cmFuc2Zvcm1Ub1N0cmluZygpO1xuXG4gICAgICB0ZW1wbGF0ZVZhbHVlcy5mb3JFYWNoKCh0ZW1wbGF0ZVZhbHVlOiBhbnkpID0+IHtcbiAgICAgICAgdGVtcGxhdGUgPSB0ZW1wbGF0ZT8ucmVwbGFjZShcbiAgICAgICAgICBuZXcgUmVnRXhwKHRlbXBsYXRlVmFsdWUuaWQsICdnJyksXG4gICAgICAgICAgdGVtcGxhdGVWYWx1ZS52YWx1ZVxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IHMzQ2xpZW50LnNlbmQobmV3IFB1dE9iamVjdENvbW1hbmQoe1xuICAgICAgICBCdWNrZXQ6IHRlbXBsYXRlT3V0cHV0QnVja2V0LFxuICAgICAgICBLZXk6IHRlbXBsYXRlT3V0cHV0S2V5LFxuICAgICAgICBCb2R5OiB0ZW1wbGF0ZVxuICAgICAgfSkpO1xuXG4gICAgICByZXNwb25zZURhdGEgPSB7XG4gICAgICAgIFRlbXBsYXRlT3V0cHV0S2V5OiB0ZW1wbGF0ZU91dHB1dEtleVxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHN0YXR1cyA9ICdGQUlMRUQnO1xuICAgICAgcmVzcG9uc2VEYXRhID0ge1xuICAgICAgICBFcnJvcjogZXJyXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgU3RhdHVzOiBzdGF0dXMsXG4gICAgUmVhc29uOiBKU09OLnN0cmluZ2lmeShyZXNwb25zZURhdGEpLFxuICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogZXZlbnQuUGh5c2ljYWxSZXNvdXJjZUlkID8/IGNvbnRleHQubG9nU3RyZWFtTmFtZSxcbiAgICBTdGFja0lkOiBldmVudC5TdGFja0lkLFxuICAgIFJlcXVlc3RJZDogZXZlbnQuUmVxdWVzdElkLFxuICAgIExvZ2ljYWxSZXNvdXJjZUlkOiBldmVudC5Mb2dpY2FsUmVzb3VyY2VJZCxcbiAgICBEYXRhOiByZXNwb25zZURhdGEsXG4gIH07XG59OyJdfQ==