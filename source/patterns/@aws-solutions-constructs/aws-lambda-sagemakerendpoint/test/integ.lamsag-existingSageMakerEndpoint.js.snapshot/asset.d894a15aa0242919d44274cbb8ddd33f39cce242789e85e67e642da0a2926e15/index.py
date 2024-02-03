import os
import json
import boto3

sagemaker_client = boto3.client("sagemaker-runtime")

def handler(event, context):
    event_body = json.loads(event["body"])
    endpoint_name = os.environ["SAGEMAKER_ENDPOINT_NAME"]
    return invoke(event_body, endpoint_name)

def invoke(event_body, endpoint_name, sm_client=sagemaker_client):
    response = sm_client.invoke_endpoint(
        EndpointName=endpoint_name,
        Body=event_body["payload"],
        ContentType=event_body["ContentType"]
    )
    print(response)
    predictions = response['Body'].read().decode()
    print(predictions)
    return {
        "statusCode": 200,
        "isBase64Encoded": False,
        "body": predictions,
        "headers": {"Content-Type": "plain/text"},
    }
