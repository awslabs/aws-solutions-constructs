import json
import boto3
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)
s3 = boto3.resource('s3')

def on_event(event, context):
  logger.info("Received event: %s" % json.dumps(event))
  request_type = event['RequestType']
  if request_type == 'Create': return on_create(event)
  if request_type == 'Update': return on_create(event)
  if request_type == 'Delete': return
  raise Exception("Invalid request type: %s" % request_type)

def on_create(event):
  properties = event['ResourceProperties']
  userPoolId = properties['UserPool']
  clientId = properties['Client']
  region = properties['Region']
  bucket = properties['Bucket']
  restapi = properties['RestApi']

  try:
    s3.Object(bucket, 'js/config.js')
    config_content = """
      var _config = {
          cognito: {
              userPoolId: '%s', // e.g. us-east-2_uXboG5pAb
              userPoolClientId: '%s', // e.g. 25ddkmj4v6hfsfvruhpfi7n4hv
              region: '%s', // e.g. us-east-2
          },
          api: {
              invokeUrl: '%s', // e.g. https://rc7nyt4tql.execute-api.us-west-2.amazonaws.com/prod'
          }
      };
      """
    config_content = config_content % (userPoolId, clientId, region, restapi)
    config = s3.Object(bucket,'js/config.js')
    config.put(Body=config_content)
  except ClientError as e:
    logger.error('Error: %s', e)
    raise e
  return