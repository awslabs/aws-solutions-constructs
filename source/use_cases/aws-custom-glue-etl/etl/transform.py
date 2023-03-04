"""
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
"""

import base64
import datetime
import sys

import boto3
from awsglue import DynamicFrame
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.sql import DataFrame, Row
from pyspark.sql.functions import *
from pyspark.sql.types import *

args = getResolvedOptions(sys.argv, ["JOB_NAME", "output_path", "database_name", "table_name"])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args["JOB_NAME"], args)

# S3 sink locations
output_path = args["output_path"]
databasename = args["database_name"]
tablename = args["table_name"]

s3_target = output_path + "ventilator_metrics"
checkpoint_location = output_path + "cp/"
temp_path = output_path + "temp/"


def processBatch(data_frame, batchId):
    now = datetime.datetime.now()
    year = now.year
    month = now.month
    day = now.day
    hour = now.hour
    minute = now.minute
    if data_frame.count() > 0:
        dynamic_frame = DynamicFrame.fromDF(data_frame, glueContext, "from_data_frame")
        apply_mapping = ApplyMapping.apply(
            frame=dynamic_frame,
            mappings=[
                ("ventilatorid", "long", "ventilatorid", "long"),
                ("eventtime", "string", "eventtime", "timestamp"),
                ("serialnumber", "string", "serialnumber", "string"),
                ("pressurecontrol", "long", "pressurecontrol", "long"),
                ("o2stats", "long", "o2stats", "long"),
                ("minutevolume", "long", "minutevolume", "long"),
                ("manufacturer", "string", "manufacturer", "string"),
            ],
            transformation_ctx="apply_mapping",
        )

        dynamic_frame.printSchema()

        # Write to S3 Sink
        s3path = (
            s3_target
            + "/ingest_year="
            + "{:0>4}".format(str(year))
            + "/ingest_month="
            + "{:0>2}".format(str(month))
            + "/ingest_day="
            + "{:0>2}".format(str(day))
            + "/ingest_hour="
            + "{:0>2}".format(str(hour))
            + "/"
        )
        s3sink = glueContext.write_dynamic_frame.from_options(
            frame=apply_mapping,
            connection_type="s3",
            connection_options={"path": s3path},
            format="parquet",
            transformation_ctx="s3sink",
        )


# Read from Kinesis Data Stream
sourceData = glueContext.create_data_frame.from_catalog(
    database=databasename,
    table_name=tablename,
    transformation_ctx="datasource0",
    additional_options={"startingPosition": "TRIM_HORIZON", "inferSchema": "true"},
)

sourceData.printSchema()

glueContext.forEachBatch(
    frame=sourceData,
    batch_function=processBatch,
    options={"windowSize": "100 seconds", "checkpointLocation": checkpoint_location},
)
job.commit()
