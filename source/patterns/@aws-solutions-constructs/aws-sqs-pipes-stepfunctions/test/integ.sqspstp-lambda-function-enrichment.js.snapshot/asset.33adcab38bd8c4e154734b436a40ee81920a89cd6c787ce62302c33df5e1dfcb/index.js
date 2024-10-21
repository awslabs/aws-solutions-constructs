exports.handler = async (event) => { 
  console.log(event); 
  const response = event.map((x) =>{
    const body = JSON.parse(x.body);
    body.newAttrib = "content";
    return body;
  });
  return response;
}