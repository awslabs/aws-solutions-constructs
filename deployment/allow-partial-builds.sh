#!/bin/bash
echo    !!!!!!!!!!!!!!!!!!!!
echo
echo Building V1 from the main branch is deprecated.
echo
echo Run source ./deployment/v2/allow-partial-build.sh to prepare the development environment for V2
echo
exit 1

result=${PWD##*/}          # to assign to a variable

(return 0 2>/dev/null) && sourced=1 || sourced=0

if [ $sourced -ne 1 ]
then
  echo 
  echo
  echo 'Error - You must run this script with the source directive:'
  echo 
  echo '       source ./deployment/allow-partial-builds.sh'
  echo
elif [ $result != 'aws-solutions-constructs' ]
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
