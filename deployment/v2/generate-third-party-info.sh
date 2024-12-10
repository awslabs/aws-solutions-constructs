#!/bin/bash          
set -e
set -x

# Document in Wiki, add instructions here (Open a container just to to this)
ORIGINAL_PATH=$PATH

# $1 is version number string
InstallOrt() {
  export io_ORT_VERSION=$1
  rm -f ort-$io_ORT_VERSION.tgz
  rm -rf ort-$io_ORT_VERSION
  wget https://github.com/oss-review-toolkit/ort/releases/download/$io_ORT_VERSION/ort-$io_ORT_VERSION.tgz
  tar -xzf ort-$io_ORT_VERSION.tgz -C /bin
  export PATH=$PATH:/bin/ort-$io_ORT_VERSION/bin
}

# $1 is version number string
UninstallOrt() {
  export uo_ORT_VERSION=$1
  rm -f ort-$uo_ORT_VERSION.tgz
  rm -rf ort-$uo_ORT_VERSION
  PATH=$ORIGINAL_PATH
}

# Confirm current location is repo root
CURRENT_DIR=${PWD##*/}
if [[ $CURRENT_DIR != "aws-solutions-constructs" ]]; then
  echo "This script must be run from the aws-solutions-constructs (top level) folder"
  exit 1
fi

SOURCE_DIR=$PWD/source
RMS_USE_CASE_DIR=$PWD/source/use_cases/aws-restaurant-management-demo
WEBSITE_USE_CASE_DIR=$PWD/source/use_cases/aws-s3-static-website

ORT_RESULTS_SUBDIR=ort_results
ORT_REPORTS_SUBDIR=ort_reports

# Install wget
cd source
sudo apt update
sudo apt-get install wget
rm -f /usr/share/keyrings/corretto-keyring.gpg
wget -O - https://apt.corretto.aws/corretto.key | sudo gpg --dearmor -o /usr/share/keyrings/corretto-keyring.gpg && \
echo "deb [signed-by=/usr/share/keyrings/corretto-keyring.gpg] https://apt.corretto.aws stable main" | sudo tee /etc/apt/sources.list.d/corretto.list
sudo dpkg --remove java-20-amazon-corretto-jdk
rm -rf /etc/apt/sources.list.d/amazon-corretto.list
mkdir -p /usr/share/man/man1
sudo apt-get update; sudo apt-get install -y java-23-amazon-corretto-jdk
export JAVA_HOME=/usr/lib/jvm/java-23-amazon-corretto

InstallOrt 40.0.1
export ort__analyzer__allowDynamicVersions=true
export ort__analyzer__skipExcluded=true
export ort__forceOverwrite=true

# Finally - run!
ort --info analyze -i . -o $ORT_RESULTS_SUBDIR -f jSON

node ../deployment/v2/generate-license-csv.js ../../source/$ORT_RESULTS_SUBDIR/analyzer-result.json > license-list.csv

ort --info report -i ./$ORT_RESULTS_SUBDIR/analyzer-result.json -o ./$ORT_REPORTS_SUBDIR -f PlainTextTemplate,CycloneDx

cp $ORT_REPORTS_SUBDIR/NOTICE_DEFAULT ../THIRD_PARTY_LICENSE

UninstallOrt 40.0.1

InstallOrt 39.0.0
cd $WEBSITE_USE_CASE_DIR
ort --info analyze -i . -o $ORT_RESULTS_SUBDIR -f jSON
ort --info report -i ./$ORT_RESULTS_SUBDIR/analyzer-result.json -o ./$ORT_REPORTS_SUBDIR -f PlainTextTemplate,CycloneDx

cp $ORT_REPORTS_SUBDIR/NOTICE_DEFAULT THIRD_PARTY_LICENSES.txt

# *************************************
# Create attribution list for use case aws-restaurant-management-demo
# *************************************

cd $RMS_USE_CASE_DIR
npm install

ort --info analyze -i . -o $ORT_RESULTS_SUBDIR -f jSON
ort --info report -i ./$ORT_RESULTS_SUBDIR/analyzer-result.json -o ./$ORT_REPORTS_SUBDIR -f PlainTextTemplate,CycloneDx

cp $ORT_REPORTS_SUBDIR/NOTICE_DEFAULT THIRD_PARTY_LICENSES.txt

cd $SOURCE_DIR
UninstallOrt 39.0.0

echo "Check ort folders"
