
# Install wget
sudo apt update
sudo apt-get install wget
wget -O - https://apt.corretto.aws/corretto.key | sudo gpg --dearmor -o /usr/share/keyrings/corretto-keyring.gpg && \
echo "deb [signed-by=/usr/share/keyrings/corretto-keyring.gpg] https://apt.corretto.aws stable main" | sudo tee /etc/apt/sources.list.d/corretto.list
sudo dpkg --remove java-20-amazon-corretto-jdk
rm -rf /etc/apt/sources.list.d/amazon-corretto.list
mkdir -p /usr/share/man/man1
sudo apt-get update; sudo apt-get install -y java-23-amazon-corretto-jdk
export JAVA_HOME=/usr/lib/jvm/java-23-amazon-corretto

wget https://github.com/oss-review-toolkit/ort/releases/download/40.0.1/ort-40.0.1.tgz
tar -xzf ort-40.0.1.tgz -C /bin
export PATH=$PATH:/bin/ort-40.0.1/bin
export ort__analyzer__allowDynamicVersions=true

# extraneous packages left around by yarn, deleting them until we
# find a way to suppress yarn from doing this in the future
rm -rf /Users/biffgaut/Documents/Active/AWS/Constructs/github/OptimizeDependencies/aws-solutions-constructs/source/node_modules/@balena/dockerignore
rm -rf /Users/biffgaut/Documents/Active/AWS/Constructs/github/OptimizeDependencies/aws-solutions-constructs/source/node_modules/jsonschema
rm -rf /Users/biffgaut/Documents/Active/AWS/Constructs/github/OptimizeDependencies/aws-solutions-constructs/source/node_modules/lodash.truncate
rm -rf /Users/biffgaut/Documents/Active/AWS/Constructs/github/OptimizeDependencies/aws-solutions-constructs/source/node_modules/yaml

ort --info analyze -i . -o results -f jSON
