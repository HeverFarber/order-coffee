## order coffee

### Install
* git clone https://github.com/Sparta-Code/order-coffee.git
* npm install (requires above node v8)
* edit conf/settings.json with key and secret
* node app

### Using API by curl

##### create order

````
curl -H "Content-Type: application/json" \
     -X POST \ 
     -d '{ "name": "Big Customer", "phone": "+972581234567", "address": "Ramat Gan", "details": "new2 pizza" }' \
     http://localhost:3000/order 
````

##### show all orders for customer by phone number (Up to 7 days)

````
curl http://localhost:3000/tasks/+972581234567
````
