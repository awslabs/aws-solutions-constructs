export const handler = async (event) => {
  switch (event.httpMethod) {
    case 'POST':
      return {
        statusCode: 200,
        body: JSON.stringify({"message": "successfully handled POST from photos lambda"})
      };
    case 'GET':
      return {
        statusCode: 200,
        body: JSON.stringify({"message": "successfully handled GET from photos lambda"})
      };
    default:
      throw new Error(`cannot handle httpMethod: ${event.httpMethod}`);
  }
};
