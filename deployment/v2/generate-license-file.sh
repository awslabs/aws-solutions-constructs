# This script uses npm-license-crawler to generate a list of all licenses
# included in the build of AWS Solutions Constructs.

# This is the body of the function - it's wrapped in a function called from the bottom of
# so this code can be up top but avoid forward references of functions
main() {
  local RAW_LICENSE_DATA_FILE=raw-license-data.json
  local FINAL_LICENSE_DATA_FILE=THIRD_PARTY_LICENSE.txt
  local USE_CASES_FOLDER=use_cases

  #***************
  # Check initial conditions:
  #***************

  #   -Are we in the source folder
  checkCurrentDirectory source

  #   -Has yarn been run? (is there a node_modules folder?)
  checkFolderExistence 'node_modules'

  #***************
  # Clean up existing or leftover files
  #***************
  rm -f $RAW_LICENSE_DATA_FILE
  rm -f $FINAL_LICENSE_DATA_FILE
  rm -f ../$FINAL_LICENSE_DATA_FILE

  #***************
  # Generate the license data
  # (this is where the actual work is being done...)
  #***************
  npm-license-crawler --start . --production --dependencies --json ./$RAW_LICENSE_DATA_FILE --exclude $USE_CASES_FOLDER
  
  # Quick sanity check that the raw data was created and is of reasonable size
  checkFileSize $RAW_LICENSE_DATA_FILE 100000

  # Run parse-raw-licenses-data.js to create final license file
  local LOCAL_FULL_FILE_NAME=$(getAbsoluteFilespec $RAW_LICENSE_DATA_FILE)

  # We need to call a script in the same directory as this script, regardless
  # of the working directory when this script was invoked.
  local RELATIVE_PARSE_SCRIPT_SPEC=$(dirname "$0")/parse-raw-license-data.js
  local PARSE_SCRIPT_SPEC=$(getAbsoluteFilespec $RELATIVE_PARSE_SCRIPT_SPEC)
  node $PARSE_SCRIPT_SPEC $LOCAL_FULL_FILE_NAME >$FINAL_LICENSE_DATA_FILE
  
  # Quick sanity check that the parsed output was created and is of reasonable size
  checkFileSize $FINAL_LICENSE_DATA_FILE 10000

  # Move final license data up to root folder (aws-solutions-constructs)
  mv $FINAL_LICENSE_DATA_FILE ..

  # Clean up workfiles
  rm -f $RAW_LICENSE_DATA_FILE
  rm -f $FINAL_LICENSE_DATA_FILE

  # Create a list of use cases and loop through them, generating licenses for each use case
  export useCases="
    aws-restaurant-management-demo
    aws-s3-static-website"

  cd $USE_CASES_FOLDER
  for useCase in $useCases; do

    cd $useCase
    npm install
    rm -f $RAW_LICENSE_DATA_FILE
    rm -f $FINAL_LICENSE_DATA_FILE

    #***************
    # Generate the license data
    # (this is where the actual work is being done...)
    #***************
    npm-license-crawler --start . --production --dependencies --json ./$RAW_LICENSE_DATA_FILE
    
    # Quick sanity check that the raw data was created and is of reasonable size
    checkFileSize $RAW_LICENSE_DATA_FILE 10000

    # Run parse-raw-licenses-data.js to create final license file
    local LOCAL_FULL_FILE_NAME=$(getAbsoluteFilespec $RAW_LICENSE_DATA_FILE)

    # We need to call a script in the same directory as this script, regardless
    # of the working directory when this script was invoked.
    echo $PARSE_SCRIPT_SPEC
    node $PARSE_SCRIPT_SPEC $LOCAL_FULL_FILE_NAME >$FINAL_LICENSE_DATA_FILE
    
    # Quick sanity check that the parsed output was created and is of reasonable size
    checkFileSize $FINAL_LICENSE_DATA_FILE 1000

    # Clean up workfile
    rm -f $RAW_LICENSE_DATA_FILE

    cd ..
  done
}

# ======================================
# Confirm  the name of the current folder
# (just the folder name, not  the whole  tree)
#  $1: desired folder name
# ======================================
checkCurrentDirectory() {
  if [[ "$1" == "" ]]; then
    checkCurrentDirectory requires  one argument - the desired directory
    exit 1
  fi
  ccd_CURRENT_DIR=${PWD##*/}
  if [[ $ccd_CURRENT_DIR != $1 ]]; then
    echo "This script must be run from the $1 folder"
    exit 1
  fi
}

# ======================================
# Confirm existence of a folder
#  $1: desired folder or file specification
# ======================================
checkFolderExistence() {
  if ! [ -d "$1" ]; then
    echo "Folder $1 does not exist"
    exit 1
  fi
}

# ======================================
# Confirm the minimum size of a file
#  $1: filespec
#  $2: minimum size (bytes)
# ======================================
checkFileSize() {
  local cfs_FILE_SPEC="$1"
  local cfs_MINIMUM_SIZE="$2"

  if [ ! -f "$cfs_FILE_SPEC" ]; then
      echo "File $cfs_FILE_SPEC does not exist"
      exit 1
  fi
  local cfs_ACTUAL_SIZE=$(wc -c <"$cfs_FILE_SPEC")
  if [ $cfs_ACTUAL_SIZE -lt $cfs_MINIMUM_SIZE ]; then
      echo $cfs_FILE_SPEC is less than the expected file size of  $cfs_MINIMUM_SIZE
  fi
}

# ======================================
# Convert a relative filespec to an absolute spec
#  $1: relative spec
#  echoes the full spec for client to grab with $(getAbsoluteFilespec filespec)
# ======================================
getAbsoluteFilespec() {
  echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
}

# This is the actual code that kicks off the script. The $@ argument passes the command line
# arguments so main can access them
main "$@"
