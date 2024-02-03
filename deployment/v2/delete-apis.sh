# How to use this script
#
# This script will refresh integration tests for multiple
# Solutions Constructs sequentially and unattended. If you're 
# doing a release and have to update many integration tests, this is
# for you.

# Authenticate the terminal to the account in question
# List all the constructs with API Gateways in constructs below
# Run script
#

export constructs="
wafapi-partial-arguments
apiddb-additional-request-templates-custom-resource-name
s3lam-no-arguments
apikin-additional-request-templates
opilam-apiFromAssetWithCognitoAuth
apisqs-additional-request-templates
apiddb-additional-request-templates
apikin-apigateway-kinesis-overwrite
apiiot-overrideParams
apisag-additional-request-templates
apiddb-apigateway-dynamodb-CRUD
apikin-custom-integration-responses
apiddb-apigateway-dynamodb-existing-table
apiddb-custom-integration-responses
apisag-no-overwrite
apilam-existingFunction
apiiot-override-auth-api-keys
"

for construct in $constructs; do
  echo Deleting $construct
  aws cloudformation delete-stack --stack-name $construct
  sleep 120
done
