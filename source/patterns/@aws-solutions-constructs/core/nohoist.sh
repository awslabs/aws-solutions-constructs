packagess="
deep-diff
deepmerge
npmlog
"

if [ ! -d "node_modules" ]; then
  echo "Error: node_modules folder does not exist."
  echo "deployment/v2/bootstrap.sh must be run before this script"
  exit 1
fi

for package in $packagess; do
  echo "Installing $package"
  cp -r ../../../node_modules/$package ./node_modules/
done
