"""
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 *
"""

import argparse
import datetime as dt
import io
import json
import os
import random
import sys

import boto3
from faker import *


# Create a client with aws service and region
def create_client(service, region):
    return boto3.client(service, region_name=region)


class RecordGenerator(object):
    """
    A class used to generate ventilator data used as input for Glue Streaming ETL.
    """

    def __init__(self):
        self.ventilatorid = 0
        self.eventtime = None
        self.serialnumber = ""
        self.pressurecontrol = 0
        self.o2stats = 0
        self.minutevolume = 0
        self.manufacturer = None

    def get_ventilator_record(self, fake):
        """
        Generates fake ventilator metrics
        """
        record = {
            "ventilatorid": fake.pyint(min_value=1, max_value=50),
            "eventtime": fake.date_time_between(start_date="-10m", end_date="now").isoformat(),
            "serialnumber": fake.uuid4(),
            "pressurecontrol": fake.pyint(min_value=3, max_value=40),
            "o2stats": fake.pyint(min_value=90, max_value=100),
            "minutevolume": fake.pyint(min_value=2, max_value=10),
            "manufacturer": random.choice(["3M", "GE", "Vyaire", "Getinge"]),
        }
        data = json.dumps(record)
        return {"Data": bytes(data, "utf-8"), "PartitionKey": "partition_key"}

    def get_ventilator_records(self, rate, fake):
        return [self.get_ventilator_record(fake) for _ in range(rate)]

    def dumps_lines(objs):
        for obj in objs:
            yield json.dumps(obj, separators=(",", ":")) + "\n"


# main function
def main():

    parser = argparse.ArgumentParser(description="Faker based streaming data generator")

    parser.add_argument(
        "--streamname", action="store", dest="stream_name", help="Provide Kinesis Data Stream name to stream data"
    )
    parser.add_argument("--region", action="store", dest="region", default="us-east-1")

    args = parser.parse_args()

    # print (args)
    # Make sure to set credentials here or use profile_name. Also make sure that the user role for which credentials
    # are set has write premissions to the Kinesis Data Streams
    # session = boto3.Session(
    #     aws_access_key_id="FAKE_ID_UPDATE_ACCESS_KEY_ID",
    #     aws_secret_access_key="FAKE_KEY_UPDATE_ACCESS_KEY",
    #     aws_session_token="FACKE_TOKEN_UPDATE_SESSION_TOKEN",
    # )

    # OR

    session = boto3.Session(profile_name="default")

    try:
        # Intialize Faker library
        fake = Faker()

        # Kinesis settings
        kinesis_client = session.client("kinesis", args.region)

        # Rate at which records are generated
        rate = 500
        generator = RecordGenerator()

        # Generates ventilator data
        while True:
            fake_ventilator_records = generator.get_ventilator_records(rate, fake)
            print(fake_ventilator_records)
            kinesis_client.put_records(StreamName=args.stream_name, Records=fake_ventilator_records)
            # fakeIO = StringIO()
            # fakeIO.write(str(''.join(dumps_lines(fake_ventilator_records))))
            # fakeIO.close()

    except:
        print("Error:", sys.exc_info()[0])
        raise


if __name__ == "__main__":
    # run main
    main()
