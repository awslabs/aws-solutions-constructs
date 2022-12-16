import { KinesisClient, PutRecordCommand } from "@aws-sdk/client-kinesis";

const kinesis = new KinesisClient({ region: process.env.REGION });
const streamName = process.env.KINESIS_DATASTREAM_NAME;

export const handler = async(event) => {
    
    const result = await kinesis.send(new PutRecordCommand({
      StreamName: streamName,
      Data: Buffer.from('hello from solutions constructs'),
      PartitionKey: '1'
    }));
    
    console.log(JSON.stringify(result));
};
