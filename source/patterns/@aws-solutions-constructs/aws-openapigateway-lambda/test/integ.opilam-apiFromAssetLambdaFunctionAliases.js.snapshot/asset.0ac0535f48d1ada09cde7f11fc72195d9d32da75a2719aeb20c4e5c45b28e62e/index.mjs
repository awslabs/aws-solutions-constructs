export const handler = async (event) => {
  switch (event.httpMethod) {
    case 'POST':
      return {
        statusCode: 200,
        body: JSON.stringify({"message": "NEW - successfully handled POST from messages lambda"})
      };
    case 'GET':
      return {
        statusCode: 200,
        body: JSON.stringify({"message": "NEW - successfully handled GET from messages lambda"})
      };
    default:
      throw new Error(`cannot handle httpMethod: ${event.httpMethod}`);
  }
};
