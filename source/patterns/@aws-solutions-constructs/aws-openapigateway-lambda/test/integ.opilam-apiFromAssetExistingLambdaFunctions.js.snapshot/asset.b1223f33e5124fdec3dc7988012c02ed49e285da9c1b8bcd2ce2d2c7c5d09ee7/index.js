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
exports.handler = async (event, context) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O0dBV0c7OztBQUVILGtEQUFrRjtBQUNsRixpQ0FBaUM7QUFFakMsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUVqRCxRQUFBLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBVSxFQUFFLE9BQVksRUFBRSxFQUFFO0lBQ3hELElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQztJQUN2QixJQUFJLFlBQVksR0FBRyxFQUFFLENBQUM7SUFFdEIsMEZBQTBGO0lBQzFGLDRGQUE0RjtJQUM1RixJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssUUFBUSxFQUFFO1FBQ3BFLElBQUk7WUFDRixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxjQUFjLENBQUM7WUFDMUYsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLENBQUM7WUFDekUsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUM7WUFDbkUsTUFBTSxvQkFBb0IsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUMsb0JBQW9CLENBQUM7WUFDM0UsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVqRSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLDRCQUFnQixDQUFDO2dCQUNqRSxNQUFNLEVBQUUsbUJBQW1CO2dCQUMzQixHQUFHLEVBQUUsZ0JBQWdCO2FBQ3RCLENBQUMsQ0FBQyxDQUFDO1lBRUosSUFBSSxRQUFRLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztZQUVqRSxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBa0IsRUFBRSxFQUFFO2dCQUM1QyxRQUFRLEdBQUcsUUFBUSxFQUFFLE9BQU8sQ0FDMUIsSUFBSSxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFDakMsYUFBYSxDQUFDLEtBQUssQ0FDcEIsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksNEJBQWdCLENBQUM7Z0JBQ3ZDLE1BQU0sRUFBRSxvQkFBb0I7Z0JBQzVCLEdBQUcsRUFBRSxpQkFBaUI7Z0JBQ3RCLElBQUksRUFBRSxRQUFRO2FBQ2YsQ0FBQyxDQUFDLENBQUM7WUFFSixZQUFZLEdBQUc7Z0JBQ2IsaUJBQWlCLEVBQUUsaUJBQWlCO2FBQ3JDLENBQUM7U0FDSDtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osTUFBTSxHQUFHLFFBQVEsQ0FBQztZQUNsQixZQUFZLEdBQUc7Z0JBQ2IsS0FBSyxFQUFFLEdBQUc7YUFDWCxDQUFDO1NBQ0g7S0FDRjtJQUVELE9BQU87UUFDTCxNQUFNLEVBQUUsTUFBTTtRQUNkLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQztRQUNwQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsa0JBQWtCLElBQUksT0FBTyxDQUFDLGFBQWE7UUFDckUsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO1FBQ3RCLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztRQUMxQixpQkFBaUIsRUFBRSxLQUFLLENBQUMsaUJBQWlCO1FBQzFDLElBQUksRUFBRSxZQUFZO0tBQ25CLENBQUM7QUFDSixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqICBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuICogIHdpdGggdGhlIExpY2Vuc2UuIEEgY29weSBvZiB0aGUgTGljZW5zZSBpcyBsb2NhdGVkIGF0XG4gKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiAgb3IgaW4gdGhlICdsaWNlbnNlJyBmaWxlIGFjY29tcGFueWluZyB0aGlzIGZpbGUuIFRoaXMgZmlsZSBpcyBkaXN0cmlidXRlZCBvbiBhbiAnQVMgSVMnIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVNcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9uc1xuICogIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgeyBTM0NsaWVudCwgR2V0T2JqZWN0Q29tbWFuZCwgUHV0T2JqZWN0Q29tbWFuZCB9IGZyb20gXCJAYXdzLXNkay9jbGllbnQtczNcIjtcbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xuXG5jb25zdCBzM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuUkVHSU9OIH0pO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogYW55LCBjb250ZXh0OiBhbnkpID0+IHtcbiAgbGV0IHN0YXR1cyA9ICdTVUNDRVNTJztcbiAgbGV0IHJlc3BvbnNlRGF0YSA9IHt9O1xuXG4gIC8vIFRoZXNlIGFyZSB0aGUgc3RhbmRhcmQgQ3JlYXRlL1VwZGF0ZS9EZWxldGUgY3VzdG9tIHJlc291cmNlIHJlcXVlc3QgdHlwZXMgZGVmaW5lZCBoZXJlOlxuICAvLyBodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vQVdTQ2xvdWRGb3JtYXRpb24vbGF0ZXN0L1VzZXJHdWlkZS9jcnBnLXJlZi1yZXF1ZXN0dHlwZXMuaHRtbFxuICBpZiAoZXZlbnQuUmVxdWVzdFR5cGUgPT09ICdDcmVhdGUnIHx8IGV2ZW50LlJlcXVlc3RUeXBlID09PSAnVXBkYXRlJykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVZhbHVlcyA9IEpTT04ucGFyc2UoZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzLlRlbXBsYXRlVmFsdWVzKS50ZW1wbGF0ZVZhbHVlcztcbiAgICAgIGNvbnN0IHRlbXBsYXRlSW5wdXRCdWNrZXQgPSBldmVudC5SZXNvdXJjZVByb3BlcnRpZXMuVGVtcGxhdGVJbnB1dEJ1Y2tldDtcbiAgICAgIGNvbnN0IHRlbXBsYXRlSW5wdXRLZXkgPSBldmVudC5SZXNvdXJjZVByb3BlcnRpZXMuVGVtcGxhdGVJbnB1dEtleTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlT3V0cHV0QnVja2V0ID0gZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzLlRlbXBsYXRlT3V0cHV0QnVja2V0O1xuICAgICAgY29uc3QgdGVtcGxhdGVPdXRwdXRLZXkgPSBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdoZXgnKTtcblxuICAgICAgY29uc3QgZ2V0T2JqZWN0UmVzcG9uc2UgPSBhd2FpdCBzM0NsaWVudC5zZW5kKG5ldyBHZXRPYmplY3RDb21tYW5kKHtcbiAgICAgICAgQnVja2V0OiB0ZW1wbGF0ZUlucHV0QnVja2V0LFxuICAgICAgICBLZXk6IHRlbXBsYXRlSW5wdXRLZXlcbiAgICAgIH0pKTtcblxuICAgICAgbGV0IHRlbXBsYXRlID0gYXdhaXQgZ2V0T2JqZWN0UmVzcG9uc2UuQm9keT8udHJhbnNmb3JtVG9TdHJpbmcoKTtcblxuICAgICAgdGVtcGxhdGVWYWx1ZXMuZm9yRWFjaCgodGVtcGxhdGVWYWx1ZTogYW55KSA9PiB7XG4gICAgICAgIHRlbXBsYXRlID0gdGVtcGxhdGU/LnJlcGxhY2UoXG4gICAgICAgICAgbmV3IFJlZ0V4cCh0ZW1wbGF0ZVZhbHVlLmlkLCAnZycpLFxuICAgICAgICAgIHRlbXBsYXRlVmFsdWUudmFsdWVcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCBzM0NsaWVudC5zZW5kKG5ldyBQdXRPYmplY3RDb21tYW5kKHtcbiAgICAgICAgQnVja2V0OiB0ZW1wbGF0ZU91dHB1dEJ1Y2tldCxcbiAgICAgICAgS2V5OiB0ZW1wbGF0ZU91dHB1dEtleSxcbiAgICAgICAgQm9keTogdGVtcGxhdGVcbiAgICAgIH0pKTtcblxuICAgICAgcmVzcG9uc2VEYXRhID0ge1xuICAgICAgICBUZW1wbGF0ZU91dHB1dEtleTogdGVtcGxhdGVPdXRwdXRLZXlcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBzdGF0dXMgPSAnRkFJTEVEJztcbiAgICAgIHJlc3BvbnNlRGF0YSA9IHtcbiAgICAgICAgRXJyb3I6IGVyclxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIFN0YXR1czogc3RhdHVzLFxuICAgIFJlYXNvbjogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2VEYXRhKSxcbiAgICBQaHlzaWNhbFJlc291cmNlSWQ6IGV2ZW50LlBoeXNpY2FsUmVzb3VyY2VJZCA/PyBjb250ZXh0LmxvZ1N0cmVhbU5hbWUsXG4gICAgU3RhY2tJZDogZXZlbnQuU3RhY2tJZCxcbiAgICBSZXF1ZXN0SWQ6IGV2ZW50LlJlcXVlc3RJZCxcbiAgICBMb2dpY2FsUmVzb3VyY2VJZDogZXZlbnQuTG9naWNhbFJlc291cmNlSWQsXG4gICAgRGF0YTogcmVzcG9uc2VEYXRhLFxuICB9O1xufTsiXX0=