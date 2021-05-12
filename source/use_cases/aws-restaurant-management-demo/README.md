# AWS Solutions Constructs - Restaurant Management System Example

## Overview

This example demonstrates how to build a complex, real-world system using AWS Solutions Constructs. It will implement
a demo restaurant management system for three user types with the various capabilities:

### Service staff
- Create a new order
- Close-out an order

### Kitchen staff
- View all open orders
- Complete/fulfill an order

### Managers
- List all orders (all statuses)
- Close-out service
  - Generate sales report
  - Calculate tips for servers
  - Archive orders to the data warehouse
- Automatic delayed order detection
- View report(s)

## Business logic
This demo features multiple Lambda functions, one assigned to each function for each user role. The business logic that
each of these functions runs can be found organized under the `lib/lambda` folder. Each function is decoupled and managed
within its own folder, with its own package.json file and dependencies.

## API
This demo implements three REST APIs using AWS Gateway, one for each user type. Mappings are provided as follows:

### Service staff
- `/create-order` - POST- creates a new order with status set to 'OPEN'. Request parameters:
  - `createdBy` - the username of the server who created the order.
  - `tableNumber` - the table number for the order to be delivered to.
  - `items` - an array of items that comprise the order.
  - `orderTotal` - the order total in USD, not including tip.
  - `timeOpened` - the date/time in UTC milliseconds that the order was created.
  - `tipAmount` - the amount tipped to the server.
- `/process-payment` - POST - closes out the order and sets the status to 'CLOSED'. Request parameters:
  - `orderId` - the unique order id.

### Kitchen staff
- `/list-open-orders` - GET - lists all orders that have a status of 'OPEN'.
- `/complete-order` - POST - updates the status of an order to 'FILLED'. Request parameters:
  - `orderId` - the unique order id.

### Managers
- `/list-orders` - GET - lists all orders, regardless of status.
- `/close-out-service` - POST - triggers the close-out process, invoking a Step Functions workflow that generates a 
  sales report, calculates tips for all servers, and archives orders from DynamoDB to Redshift.
- `/reports` - POST - get a specific sales report from the static assets bucket.  
  - `filename` - the filename of the report.

## Database
This demo will implement a main database from which all functions read/write to/from. This database will be used for 
managing orders for a specific service. When the restaurant opens, the database should be empty. Throughout the service 
period, the database will become populated with both open and closed orders. At the end of service, orders will be closed
out and archived to the data warehouse.

 - `id` - a unique identifier for the order.
 - `createdBy` - the username of the server who created the order.
 - `tableNumber` - the table number for the order to be delivered to.
 - `items` - an array of items that comprise the order.
 - `orderStatus` - the status of the order, can be either 'OPEN', 'FILLED', or 'CLOSED'
 - `orderTotal` - the order total in USD.
 - `timeOpened` - the date/time in UTC milliseconds that the order was created.
 - `timeClosed` - the date/time in UTC milliseconds that the order was closed.

## Useful commands
The `cdk.json` file tells the CDK Toolkit how to execute your app.

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template