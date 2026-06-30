./deployment/v2/align-version.sh revert

rm -rf source/node_modules
rm -rf source/patterns/@aws-solutions-constructs/core/node_modules

CONSTRUCTS_DIR="source/patterns/@aws-solutions-constructs"

for dir in "$CONSTRUCTS_DIR"/*/; do
  [ -d "$dir" ] || continue

  # Remove node_modules
  rm -rf "${dir}node_modules"

  # Remove compiled output from lib (*.js and *.d.ts only — not subdirectories)
  find "${dir}lib" -maxdepth 1 -type f \( -name "*.js" -o -name "*.d.ts" \) -delete 2>/dev/null

  # Remove compiled output from test (*.js and *.d.ts only — not subdirectories)
  find "${dir}test" -maxdepth 1 -type f \( -name "*.js" -o -name "*.d.ts" \) -delete 2>/dev/null

  # Remove dist and coverage
  rm -rf "${dir}dist"
  rm -rf "${dir}coverage"

  # Remove cdk-integ temporary folders
  find "${dir}" -maxdepth 2 -type d -name "cdk-integ*" -exec rm -rf {} + 2>/dev/null
done
