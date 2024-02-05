import { FirehoseClient, PutRecordCommand } from "@aws-sdk/client-firehose";
const client = new FirehoseClient({});

export const handler = async(event) => {
  var params = {
    DeliveryStreamName: process.env.FIREHOSE_DELIVERYSTREAM_NAME /* required */,
    Record: {
      Data: "",
    },
  };
  try {
    for (let i=0; i<10; i++) {
      params.Record.Data = Buffer.from(JSON.stringify(GenerateRecord()));
      let input = new PutRecordCommand(params);
      let response = await client.send(input);
      console.log(`response: ${JSON.stringify(response, null, 2)}`);
    }
  } catch (e) {
    console.log(`Failed: ${JSON.stringify(e)}`);
  }
};

const directions = [ 'north', 'south', 'east', 'west' ];

function GenerateRecord() {
  const random = Math.floor(Math.random() * directions.length);
  return {
    id: `record-${Math.random()}`,
    direction: directions[random],
    windspeed: Math.floor(Math.random() * 20)
  };
}