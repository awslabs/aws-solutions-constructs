#!/bin/bash
set -euo pipefail

if [[ "$PWD" != *aws-solutions-constructs ]]
then
  echo Script must be run from aws-solutions-constructs folder
  exit 1
fi

deployment_dir=$(cd $(dirname $0) && pwd)

source $deployment_dir/bootstrap.sh

source $deployment_dir/build-all.sh
