#!/bin/bash
set -euo pipefail

deployment_dir=$(cd $(dirname $0) && pwd)

source $deployment_dir/bootstrap.sh

source $deployment_dir/build-all.sh
