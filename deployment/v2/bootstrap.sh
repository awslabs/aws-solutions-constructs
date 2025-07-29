#!/bin/bash
#!/bin/bash
set -euo pipefail

starting_dir=$PWD
deployment_dir=$(cd $(dirname $0) && pwd)
source_dir="$deployment_dir/../../source"

# Required to update node_modules correctly
echo "============================================================================================="
echo "aligning versions and updating package.json for CDK v2..."
/bin/bash $deployment_dir/align-version.sh

cd $source_dir/

export PATH=$source_dir/node_modules/.bin:$PATH
export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"

# Install CDK Integration Test Tool
npm install -g @aws-cdk/integ-runner@2.189.0
npm install -g aws-cdk
npm install -g npm-license-crawler
npm install -g asciidoctor

# Install cfn-guard and rules
export RULE_BUCKET=solutions-build-assets
# export RULE_FILE_NAME=aws-solutions-constructs.guard
export RULE_FILE_NAME=aws-solutions.guard

mkdir -p  ~/.guard
mkdir -p ~/.guard/bin
mkdir -p ~/.guard/rules
curl -tlsv1.3 -sSf https://$RULE_BUCKET.s3.amazonaws.com/cfn-guard/latest/cfn-guard -o ~/.guard/bin/cfn-guard
chmod +x  ~/.guard/bin/cfn-guard
# Why no PATH update? Because it would be lost when the script exits
curl -tlsv1.3 -sSf https://$RULE_BUCKET.s3.amazonaws.com/cfn-guard-rules/latest/$RULE_FILE_NAME -o ~/.guard/rules/aws-solutions.guard

echo "============================================================================================="
echo "installing..."
npm install --legacy-peer-deps

cd $starting_dir
