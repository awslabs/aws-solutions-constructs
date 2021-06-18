# AWS Solutions Constructs - Restaurant Management System Example

## Sample Requests
This document provides a series of sample requests to get started with the use case after deploying it into your
AWS account. A sample request is provided for each POST-like request, and can be used either via the test capabilities
offered in the API Gateway Management Console, or through a 3rd party testing tool with the appropriate Cognito
authorizer.

## Service staff

### create-order
This POST request will create a new entry in the table with the below attributes, as well as an orderStatus set to `OPEN`.
```
{
	"createdBy": "serverNameHere",
	"tableNumber": "12",
	"items": ["Caesar Salad", "Mozzarella Sticks"],
	"orderTotal": "13.50"
}
```
This request will create a new entry in the table with the above attributes, as well as an orderStatus set to `OPEN`.

### process-payment
This POST request will update a specific entry in the table (based on the unique order ID provided), and assign a tipAmount
as well as an updated status of `CLOSED`.
```
{
	"orderId": "18af2123-9ba8-4a08-95f8-ff493a5a8c37",
	"orderTotal": "13.50",
	"tipAmount": "5.00"
}
```

## Kitchen staff

### get-open-orders
This GET request will return an array of all entries in the table with `orderStatus` = `OPEN`.

### complete-order
This POST request will update a specific entry in the table (based on the unique order ID provided), and assign an updated status of `FILLED`.
```
{
	"orderId": "18af2123-9ba8-4a08-95f8-ff493a5a8c37"
}
```

## Manager

### get-all-orders
This GET request will return an array of all entries in the table.

### get-report
This POST request will return a specific report entry from the reporting bucket.
```
{
	"filename": "//REPORT_FILENAME_HERE//.json"
}
```

### close-out-service
This ANY request will initiate the close-out process by calling a Lambda function which triggers a Step Functions workflow 
for calculating tips, archiving orders, and creating end-of-day reports.



***
&copy; Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.