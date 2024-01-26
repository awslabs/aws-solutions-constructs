#!/bin/bash
# ------------------------------------
#
# Runs the steps required to be able to build and test individual
# constructs from within their project folders. e.g. - after
# running this script you can 
#
#  cd aws-sqs-lambda
#  npm run build+lint+test
#
#  to focus your efforts on just that construct
# ------------------------------------

# Obtains the current folder name (with no folder hierarchy)
currentFolderName=${PWD##*/}          # to assign to a variable

# Some forgotten mysticism that allows us to check whether this
# script was invoked within a 'source' command. This is required
# so that it runs in the context of the window, not in a new context - thus
# ensuring the environment variables set by the script persist.
(return 0 2>/dev/null) && sourced=1 || sourced=0

if [ $sourced -ne 1 ]
then
  echo 
  echo
  echo 'Error - You must run this script with the source directive:'
  echo 
  echo '       source ./deployment/allow-partial-builds.sh'
  echo
elif [ $currentFolderName != 'aws-solutions-constructs' ]
then
  echo 
  echo
  echo 'Error - You must run this script from the aws-solutions-constructs folder.'
  echo
else
  ./deployment/align-version.sh
  cd source
  export PATH=$(npm bin):$PATH
  cd  patterns/@aws-solutions-constructs
fi
