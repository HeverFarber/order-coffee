const fastify = require('fastify')();
const {HmacSHA1} = require("crypto-js");
const settings = require('./conf/settings.json');
const request = require('request-promise-native').defaults({});
const _ = require("lodash");

const validate = {
    schema: {
        body: {
            type: 'object',
            properties: {
                name: {type: 'string'},
                phone: {type: 'string'},
                address: {type: 'string'},
                details: {type: 'string'}
            },
            required: ['name', 'phone', 'address', 'details']
        }
    }
};

fastify.post('/order', validate, async (request, reply) => {
    const customer = await createCustomer({
        name: request.body.name,
        phone: request.body.phone,
        address: request.body.address
    });
    const order = await createOrder({
        customer_id: customer.customer.id,
        address: request.body.address,
        title: request.body.details
    });

    reply.type('application/json').code(202);
    return {
        message: 'The order was received and forwarded for further processing',
        order_id: order.task.id,
        customer_id:customer.customer.id
    };
});

fastify.get('/customer/:customerId', async (request) => {
    return await getCustomer(request.params.customerId);
});

fastify.get('/tasks', async (request) => {
    return await getTasks(request.query.page);
});

fastify.get('/tasks/:phone', async (request) => {
    return await getTasksUntil(minusDays(Date.now(), 7), t => t.customer.phone == request.params.phone);
});

async function createCustomer(customer) {
    return await postData('http://developer-api.bringg.com/partner_api/customers', customer);
}

async function createOrder(order) {
    return await postData('http://developer-api.bringg.com/partner_api/tasks', order);
}

async function getCustomer(id) {
    return await getData(`http://developer-api.bringg.com/partner_api/customers/${id}`);
}

async function getTasks(page = 1) {
    return await getData(`http://developer-api.bringg.com/partner_api/tasks`, {page});
}

async function getTasksUntil(until, filterBy) {
    let tasks = [];
    let page = 1;

    while (true) {
        const result = await getTasks(page++);
        const pageTasks = result.filter(t => new Date(t.created_at).getTime() > until);

        tasks = tasks.concat(pageTasks.filter(filterBy));

        if (pageTasks.length == 0) {
            break;
        }
    }

    return tasks;
}

async function postData(url, body) {
    return await requestData(url, 'POST', body);
}

async function getData(url, body = {}) {
    return await requestData(url, 'GET', body);
}

async function requestData(url, method, body) {
    setSignature(body);
    const result = await request({
        method: method,
        url: url,
        body: body,
        json: true,
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    });

    requireSuccess(result);
    return result;
}

function setSignature(json) {
    json.company_id = settings.company_id;
    json.timestamp = Date.now();
    json.access_token = settings.access_token;
    const query_params = Object.keys(json).map(k => `${k}=${encodeURIComponent(json[k])}`).join('&');
    json.signature = HmacSHA1(query_params, settings.secret_key).toString();
}

function requireSuccess(result) {
    if (!_.isArray(result) && !result.success) {
        throw new Error(result.message);
    }
}

const DAY_IN_MS = 1000*60*60*24;

function minusDays(date = Date.now(), daysToMinus) {
    return date - (daysToMinus * DAY_IN_MS);
}

fastify.listen(3000, function (err) {
    if (err) throw err;
    console.log(`server listening on ${fastify.server.address().port}`);
});