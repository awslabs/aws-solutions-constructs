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
exports.updateKeyPolicy = exports.handler = void 0;
const client_kms_1 = require("@aws-sdk/client-kms");
const kmsClient = new client_kms_1.KMSClient();
const handler = async (event, context) => {
    let status = 'SUCCESS';
    let responseData = {};
    if (event.RequestType === 'Create' || event.RequestType === 'Update') {
        try {
            const kmsKeyId = event.ResourceProperties.KmsKeyId;
            const cloudFrontDistributionId = event.ResourceProperties.CloudFrontDistributionId;
            const accountId = event.ResourceProperties.AccountId;
            const region = process.env.AWS_REGION;
            const describeKeyCommandResponse = await kmsClient.send(new client_kms_1.DescribeKeyCommand({
                KeyId: kmsKeyId
            }));
            if (describeKeyCommandResponse.KeyMetadata?.KeyManager === client_kms_1.KeyManagerType.AWS) {
                return {
                    Status: 'SUCCESS',
                    Reason: 'An AWS managed key was provided, no action needed from the custom resource, exiting now.',
                    PhysicalResourceId: event.PhysicalResourceId ?? context.logStreamName,
                    StackId: event.StackId,
                    RequestId: event.RequestId,
                    LogicalResourceId: event.LogicalResourceId,
                    Data: 'An AWS managed key was provided, no action needed from the custom resource, exiting now.',
                };
            }
            // The PolicyName is specified as "default" below because that is the only valid name as
            // written in the documentation for @aws-sdk/client-kms.GetKeyPolicyCommandInput:
            // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-kms/Interface/GetKeyPolicyCommandInput/
            const getKeyPolicyCommandResponse = await kmsClient.send(new client_kms_1.GetKeyPolicyCommand({
                KeyId: kmsKeyId,
                PolicyName: 'default'
            }));
            if (!getKeyPolicyCommandResponse.Policy) {
                return {
                    Status: 'FAILED',
                    Reason: 'An error occurred while retrieving the key policy.',
                    PhysicalResourceId: event.PhysicalResourceId ?? context.logStreamName,
                    StackId: event.StackId,
                    RequestId: event.RequestId,
                    LogicalResourceId: event.LogicalResourceId,
                    Data: 'An error occurred while retrieving the key policy.',
                };
            }
            // Define the updated key policy to allow CloudFront access
            const keyPolicy = JSON.parse(getKeyPolicyCommandResponse?.Policy);
            const keyPolicyStatement = {
                Sid: 'Grant-CloudFront-Distribution-Key-Usage',
                Effect: 'Allow',
                Principal: {
                    Service: 'cloudfront.amazonaws.com',
                },
                Action: [
                    'kms:Decrypt',
                    'kms:Encrypt',
                    'kms:GenerateDataKey*',
                    'kms:ReEncrypt*'
                ],
                Resource: `arn:aws:kms:${region}:${accountId}:key/${kmsKeyId}`,
                Condition: {
                    StringEquals: {
                        'AWS:SourceArn': `arn:aws:cloudfront::${accountId}:distribution/${cloudFrontDistributionId}`
                    }
                }
            };
            const updatedKeyPolicy = (0, exports.updateKeyPolicy)(keyPolicy, keyPolicyStatement);
            await kmsClient.send(new client_kms_1.PutKeyPolicyCommand({
                KeyId: kmsKeyId,
                Policy: JSON.stringify(updatedKeyPolicy),
                PolicyName: 'default'
            }));
        }
        catch (err) {
            status = 'FAILED';
            responseData = {
                Error: JSON.stringify(err)
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
/**
 * Updates a provided key policy with a provided key policy statement. First checks whether the provided key policy statement
 * already exists. If an existing key policy is found with a matching sid, the provided key policy will overwrite the existing
 * key policy. If no matching key policy is found, the provided key policy will be appended onto the array of policy statements.
 * @param keyPolicy - the JSON.parse'd result of the otherwise stringified key policy.
 * @param keyPolicyStatement - the key policy statement to be added to the key policy.
 * @returns keyPolicy - the updated key policy.
 */
const updateKeyPolicy = (keyPolicy, keyPolicyStatement) => {
    // Check to see if a duplicate key policy exists by matching on the sid. This is to prevent duplicate key policies
    // from being added/updated in response to a stack being updated one or more times after initial creation.
    const existingKeyPolicyIndex = keyPolicy.Statement.findIndex((statement) => statement.Sid === keyPolicyStatement.Sid);
    // If a match is found, overwrite the key policy statement...
    // Otherwise, push the new key policy to the array of statements
    if (existingKeyPolicyIndex > -1) {
        keyPolicy.Statement[existingKeyPolicyIndex] = keyPolicyStatement;
    }
    else {
        keyPolicy.Statement.push(keyPolicyStatement);
    }
    // Return the result
    return keyPolicy;
};
exports.updateKeyPolicy = updateKeyPolicy;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O0dBV0c7OztBQUVILG9EQUE4SDtBQUU5SCxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLEVBQUUsQ0FBQztBQUUzQixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBVSxFQUFFLE9BQVksRUFBRSxFQUFFO0lBRXhELElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQztJQUN2QixJQUFJLFlBQVksR0FBRyxFQUFFLENBQUM7SUFFdEIsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBRXJFLElBQUksQ0FBQztZQUNILE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUM7WUFDbkQsTUFBTSx3QkFBd0IsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUMsd0JBQXdCLENBQUM7WUFDbkYsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQztZQUNyRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztZQUV0QyxNQUFNLDBCQUEwQixHQUFHLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLCtCQUFrQixDQUFDO2dCQUM3RSxLQUFLLEVBQUUsUUFBUTthQUNoQixDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksMEJBQTBCLENBQUMsV0FBVyxFQUFFLFVBQVUsS0FBSywyQkFBYyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUM5RSxPQUFPO29CQUNMLE1BQU0sRUFBRSxTQUFTO29CQUNqQixNQUFNLEVBQUUsMEZBQTBGO29CQUNsRyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsa0JBQWtCLElBQUksT0FBTyxDQUFDLGFBQWE7b0JBQ3JFLE9BQU8sRUFBRSxL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QUFzQixHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsU0FBYyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxLQUFLLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNILDZEQUE2RDtJQUM3RCxnRUFBZ0U7SUFDaEUsSUFBSSxzQkFBc0IsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2hDLFNBQVMsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsR0FBRyxrQkFBa0IsQ0FBQztJQUNuRSxDQUFDO1NBQU0sQ0FBQztRQUNOLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUNELG9CQUFvQjtJQUNwQixPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDLENBQUM7QUFiVyxRQUFBLGVBQWUsbUJBYTFCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2VcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnNcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0IHsgS01TQ2xpZW50LCBHZXRLZXlQb2xpY3lDb21tYW5kLCBEZXNjcmliZUtleUNvbW1hbmQsIFB1dEtleVBvbGljeUNvbW1hbmQsIEtleU1hbmFnZXJUeXBlIH0gZnJvbSBcIkBhd3Mtc2RrL2NsaWVudC1rbXNcIjtcblxuY29uc3Qga21zQ2xpZW50ID0gbmV3IEtNU0NsaWVudCgpO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogYW55LCBjb250ZXh0OiBhbnkpID0+IHtcblxuICBsZXQgc3RhdHVzID0gJ1NVQ0NFU1MnO1xuICBsZXQgcmVzcG9uc2VEYXRhID0ge307XG5cbiAgaWYgKGV2ZW50LlJlcXVlc3RUeXBlID09PSAnQ3JlYXRlJyB8fCBldmVudC5SZXF1ZXN0VHlwZSA9PT0gJ1VwZGF0ZScpIHtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBrbXNLZXlJZCA9IGV2ZW50LlJlc291cmNlUHJvcGVydGllcy5LbXNLZXlJZDtcbiAgICAgIGNvbnN0IGNsb3VkRnJvbnREaXN0cmlidXRpb25JZCA9IGV2ZW50LlJlc291cmNlUHJvcGVydGllcy5DbG91ZEZyb250RGlzdHJpYnV0aW9uSWQ7XG4gICAgICBjb25zdCBhY2NvdW50SWQgPSBldmVudC5SZXNvdXJjZVByb3BlcnRpZXMuQWNjb3VudElkO1xuICAgICAgY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTjtcblxuICAgICAgY29uc3QgZGVzY3JpYmVLZXlDb21tYW5kUmVzcG9uc2UgPSBhd2FpdCBrbXNDbGllbnQuc2VuZChuZXcgRGVzY3JpYmVLZXlDb21tYW5kKHtcbiAgICAgICAgS2V5SWQ6IGttc0tleUlkXG4gICAgICB9KSk7XG5cbiAgICAgIGlmIChkZXNjcmliZUtleUNvbW1hbmRSZXNwb25zZS5LZXlNZXRhZGF0YT8uS2V5TWFuYWdlciA9PT0gS2V5TWFuYWdlclR5cGUuQVdTKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgU3RhdHVzOiAnU1VDQ0VTUycsXG4gICAgICAgICAgUmVhc29uOiAnQW4gQVdTIG1hbmFnZWQga2V5IHdhcyBwcm92aWRlZCwgbm8gYWN0aW9uIG5lZWRlZCBmcm9tIHRoZSBjdXN0b20gcmVzb3VyY2UsIGV4aXRpbmcgbm93LicsXG4gICAgICAgICAgUGh5c2ljYWxSZXNvdXJjZUlkOiBldmVudC5QaHlzaWNhbFJlc291cmNlSWQgPz8gY29udGV4dC5sb2dTdHJlYW1OYW1lLFxuICAgICAgICAgIFN0YWNrSWQ6IGV2ZW50LlN0YWNrSWQsXG4gICAgICAgICAgUmVxdWVzdElkOiBldmVudC5SZXF1ZXN0SWQsXG4gICAgICAgICAgTG9naWNhbFJlc291cmNlSWQ6IGV2ZW50LkxvZ2ljYWxSZXNvdXJjZUlkLFxuICAgICAgICAgIERhdGE6ICdBbiBBV1MgbWFuYWdlZCBrZXkgd2FzIHByb3ZpZGVkLCBubyBhY3Rpb24gbmVlZGVkIGZyb20gdGhlIGN1c3RvbSByZXNvdXJjZSwgZXhpdGluZyBub3cuJyxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIFBvbGljeU5hbWUgaXMgc3BlY2lmaWVkIGFzIFwiZGVmYXVsdFwiIGJlbG93IGJlY2F1c2UgdGhhdCBpcyB0aGUgb25seSB2YWxpZCBuYW1lIGFzXG4gICAgICAvLyB3cml0dGVuIGluIHRoZSBkb2N1bWVudGF0aW9uIGZvciBAYXdzLXNkay9jbGllbnQta21zLkdldEtleVBvbGljeUNvbW1hbmRJbnB1dDpcbiAgICAgIC8vIGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9BV1NKYXZhU2NyaXB0U0RLL3YzL2xhdGVzdC9QYWNrYWdlLy1hd3Mtc2RrLWNsaWVudC1rbXMvSW50ZXJmYWNlL0dldEtleVBvbGljeUNvbW1hbmRJbnB1dC9cbiAgICAgIGNvbnN0IGdldEtleVBvbGljeUNvbW1hbmRSZXNwb25zZSA9IGF3YWl0IGttc0NsaWVudC5zZW5kKG5ldyBHZXRLZXlQb2xpY3lDb21tYW5kKHtcbiAgICAgICAgS2V5SWQ6IGttc0tleUlkLFxuICAgICAgICBQb2xpY3lOYW1lOiAnZGVmYXVsdCdcbiAgICAgIH0pKTtcblxuICAgICAgaWYgKCFnZXRLZXlQb2xpY3lDb21tYW5kUmVzcG9uc2UuUG9saWN5KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgU3RhdHVzOiAnRkFJTEVEJyxcbiAgICAgICAgICBSZWFzb246ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSByZXRyaWV2aW5nIHRoZSBrZXkgcG9saWN5LicsXG4gICAgICAgICAgUGh5c2ljYWxSZXNvdXJjZUlkOiBldmVudC5QaHlzaWNhbFJlc291cmNlSWQgPz8gY29udGV4dC5sb2dTdHJlYW1OYW1lLFxuICAgICAgICAgIFN0YWNrSWQ6IGV2ZW50LlN0YWNrSWQsXG4gICAgICAgICAgUmVxdWVzdElkOiBldmVudC5SZXF1ZXN0SWQsXG4gICAgICAgICAgTG9naWNhbFJlc291cmNlSWQ6IGV2ZW50LkxvZ2ljYWxSZXNvdXJjZUlkLFxuICAgICAgICAgIERhdGE6ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSByZXRyaWV2aW5nIHRoZSBrZXkgcG9saWN5LicsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIERlZmluZSB0aGUgdXBkYXRlZCBrZXkgcG9saWN5IHRvIGFsbG93IENsb3VkRnJvbnQgYWNjZXNzXG4gICAgICBjb25zdCBrZXlQb2xpY3kgPSBKU09OLnBhcnNlKGdldEtleVBvbGljeUNvbW1hbmRSZXNwb25zZT8uUG9saWN5KTtcbiAgICAgIGNvbnN0IGtleVBvbGljeVN0YXRlbWVudCA9IHtcbiAgICAgICAgU2lkOiAnR3JhbnQtQ2xvdWRGcm9udC1EaXN0cmlidXRpb24tS2V5LVVzYWdlJyxcbiAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICBQcmluY2lwYWw6IHtcbiAgICAgICAgICBTZXJ2aWNlOiAnY2xvdWRmcm9udC5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgfSxcbiAgICAgICAgQWN0aW9uOiBbXG4gICAgICAgICAgJ2ttczpEZWNyeXB0JyxcbiAgICAgICAgICAna21zOkVuY3J5cHQnLFxuICAgICAgICAgICdrbXM6R2VuZXJhdGVEYXRhS2V5KicsXG4gICAgICAgICAgJ2ttczpSZUVuY3J5cHQqJ1xuICAgICAgICBdLFxuICAgICAgICBSZXNvdXJjZTogYGFybjphd3M6a21zOiR7cmVnaW9ufToke2FjY291bnRJZH06a2V5LyR7a21zS2V5SWR9YCxcbiAgICAgICAgQ29uZGl0aW9uOiB7XG4gICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XG4gICAgICAgICAgICAnQVdTOlNvdXJjZUFybic6IGBhcm46YXdzOmNsb3VkZnJvbnQ6OiR7YWNjb3VudElkfTpkaXN0cmlidXRpb24vJHtjbG91ZEZyb250RGlzdHJpYnV0aW9uSWR9YFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0IHVwZGF0ZWRLZXlQb2xpY3kgPSB1cGRhdGVLZXlQb2xpY3koa2V5UG9saWN5LCBrZXlQb2xpY3lTdGF0ZW1lbnQpO1xuXG4gICAgICBhd2FpdCBrbXNDbGllbnQuc2VuZChuZXcgUHV0S2V5UG9saWN5Q29tbWFuZCh7XG4gICAgICAgIEtleUlkOiBrbXNLZXlJZCxcbiAgICAgICAgUG9saWN5OiBKU09OLnN0cmluZ2lmeSh1cGRhdGVkS2V5UG9saWN5KSxcbiAgICAgICAgUG9saWN5TmFtZTogJ2RlZmF1bHQnXG4gICAgICB9KSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBzdGF0dXMgPSAnRkFJTEVEJztcbiAgICAgIHJlc3BvbnNlRGF0YSA9IHtcbiAgICAgICAgRXJyb3I6IEpTT04uc3RyaW5naWZ5KGVycilcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBTdGF0dXM6IHN0YXR1cyxcbiAgICBSZWFzb246IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlRGF0YSksXG4gICAgUGh5c2ljYWxSZXNvdXJjZUlkOiBldmVudC5QaHlzaWNhbFJlc291cmNlSWQgPz8gY29udGV4dC5sb2dTdHJlYW1OYW1lLFxuICAgIFN0YWNrSWQ6IGV2ZW50LlN0YWNrSWQsXG4gICAgUmVxdWVzdElkOiBldmVudC5SZXF1ZXN0SWQsXG4gICAgTG9naWNhbFJlc291cmNlSWQ6IGV2ZW50LkxvZ2ljYWxSZXNvdXJjZUlkLFxuICAgIERhdGE6IHJlc3BvbnNlRGF0YSxcbiAgfTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyBhIHByb3ZpZGVkIGtleSBwb2xpY3kgd2l0aCBhIHByb3ZpZGVkIGtleSBwb2xpY3kgc3RhdGVtZW50LiBGaXJzdCBjaGVja3Mgd2hldGhlciB0aGUgcHJvdmlkZWQga2V5IHBvbGljeSBzdGF0ZW1lbnRcbiAqIGFscmVhZHkgZXhpc3RzLiBJZiBhbiBleGlzdGluZyBrZXkgcG9saWN5IGlzIGZvdW5kIHdpdGggYSBtYXRjaGluZyBzaWQsIHRoZSBwcm92aWRlZCBrZXkgcG9saWN5IHdpbGwgb3ZlcndyaXRlIHRoZSBleGlzdGluZ1xuICoga2V5IHBvbGljeS4gSWYgbm8gbWF0Y2hpbmcga2V5IHBvbGljeSBpcyBmb3VuZCwgdGhlIHByb3ZpZGVkIGtleSBwb2xpY3kgd2lsbCBiZSBhcHBlbmRlZCBvbnRvIHRoZSBhcnJheSBvZiBwb2xpY3kgc3RhdGVtZW50cy5cbiAqIEBwYXJhbSBrZXlQb2xpY3kgLSB0aGUgSlNPTi5wYXJzZSdkIHJlc3VsdCBvZiB0aGUgb3RoZXJ3aXNlIHN0cmluZ2lmaWVkIGtleSBwb2xpY3kuXG4gKiBAcGFyYW0ga2V5UG9saWN5U3RhdGVtZW50IC0gdGhlIGtleSBwb2xpY3kgc3RhdGVtZW50IHRvIGJlIGFkZGVkIHRvIHRoZSBrZXkgcG9saWN5LlxuICogQHJldHVybnMga2V5UG9saWN5IC0gdGhlIHVwZGF0ZWQga2V5IHBvbGljeS5cbiAqL1xuZXhwb3J0IGNvbnN0IHVwZGF0ZUtleVBvbGljeSA9IChrZXlQb2xpY3k6IGFueSwga2V5UG9saWN5U3RhdGVtZW50OiBhbnkpID0+IHtcbiAgLy8gQ2hlY2sgdG8gc2VlIGlmIGEgZHVwbGljYXRlIGtleSBwb2xpY3kgZXhpc3RzIGJ5IG1hdGNoaW5nIG9uIHRoZSBzaWQuIFRoaXMgaXMgdG8gcHJldmVudCBkdXBsaWNhdGUga2V5IHBvbGljaWVzXG4gIC8vIGZyb20gYmVpbmcgYWRkZWQvdXBkYXRlZCBpbiByZXNwb25zZSB0byBhIHN0YWNrIGJlaW5nIHVwZGF0ZWQgb25lIG9yIG1vcmUgdGltZXMgYWZ0ZXIgaW5pdGlhbCBjcmVhdGlvbi5cbiAgY29uc3QgZXhpc3RpbmdLZXlQb2xpY3lJbmRleCA9IGtleVBvbGljeS5TdGF0ZW1lbnQuZmluZEluZGV4KChzdGF0ZW1lbnQ6IGFueSkgPT4gc3RhdGVtZW50LlNpZCA9PT0ga2V5UG9saWN5U3RhdGVtZW50LlNpZCk7XG4gIC8vIElmIGEgbWF0Y2ggaXMgZm91bmQsIG92ZXJ3cml0ZSB0aGUga2V5IHBvbGljeSBzdGF0ZW1lbnQuLi5cbiAgLy8gT3RoZXJ3aXNlLCBwdXNoIHRoZSBuZXcga2V5IHBvbGljeSB0byB0aGUgYXJyYXkgb2Ygc3RhdGVtZW50c1xuICBpZiAoZXhpc3RpbmdLZXlQb2xpY3lJbmRleCA+IC0xKSB7XG4gICAga2V5UG9saWN5LlN0YXRlbWVudFtleGlzdGluZ0tleVBvbGljeUluZGV4XSA9IGtleVBvbGljeVN0YXRlbWVudDtcbiAgfSBlbHNlIHtcbiAgICBrZXlQb2xpY3kuU3RhdGVtZW50LnB1c2goa2V5UG9saWN5U3RhdGVtZW50KTtcbiAgfVxuICAvLyBSZXR1cm4gdGhlIHJlc3VsdFxuICByZXR1cm4ga2V5UG9saWN5O1xufTtcbiJdfQ==