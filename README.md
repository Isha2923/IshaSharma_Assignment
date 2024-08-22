Vehicle Management API
Overview
The Vehicle Management API provides endpoints to manage vehicles and organizations. It supports operations such as adding vehicles, fetching vehicle details, and creating/updating organizations with specific policies.

API Endpoints
Link of video : https://drive.google.com/file/d/1fMbVSj1zWBGdnmiuaHdBrexqC-y_RHtg/view?usp=sharing
GET /vehicles/decode/:vin
Description: Each vehicle has a unique identifier called a VIN (Vehicle Identification Number). This endpoint calls NHTSA’s DecodeVin API to decode the VIN and fetch details about the vehicle, specifically the manufacturer, model, and year.

Parameters:

vin (path parameter): A 17-digit alphanumeric string representing the VIN of the vehicle.
Response:

Success (200): Returns details of the vehicle (manufacturer, model, year).
Error (400): Returns an error message if the VIN format is invalid.
Error (429): Returns an error message if more than 5 requests per minute are made to NHTSA.
Important: Implement client-side rate limiting to make no more than 5 NHTSA API calls per minute. Consider caching results for repeated VIN requests.

POST /vehicles
Description: Adds a new vehicle to the system. The request should include the VIN and the organization to which the vehicle belongs. This endpoint decodes the VIN and adds the vehicle along with the associated organization to the system.

Request Body:

{
  "vin": "xxxxxxxx",
  "org": "yyyyyy"
}
