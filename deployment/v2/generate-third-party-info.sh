
# Install wget
cd source
sudo apt update
sudo apt-get install wget
rm /usr/share/keyrings/corretto-keyring.gpg
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
export ort__analyzer__skipExcluded=true
export ort__forceOverwrite=true

# Final configuration
cd use_cases/aws-s3-static-website
npm install
cd ../aws-restaurant-management-system
npm install
cd ../..

# Finally - run!
ort --info analyze -i . -o results -f jSON

node ../deployment/v2/generate-license-csv.js > license-list.csv

ort --info report -i ./results/analyzer-result.json -o ./reports -f PlainTextTemplate,CycloneDx
