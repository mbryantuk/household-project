const fs = require('fs');
const swagger = require('./swagger.json');

const modules = {
  '/finance/recurring-costs': ['name', 'amount', 'category_id', 'frequency'],
  '/members': ['first_name', 'type'],
  '/vehicles': ['make', 'model'],
  '/finance/income': ['employer', 'amount'],
  '/finance/credit-cards': ['card_name'],
  '/finance/investments': ['name'],
  '/finance/pensions': ['plan_name'],
  '/finance/savings': ['account_name'],
  '/chores': ['name', 'frequency', 'value'],
  '/calendar': ['title', 'date', 'type'],
  '/shopping-list': ['name', 'quantity'],
  '/assets': ['name', 'purchase_value'],
  '/finance/mortgages': ['name'],
  '/finance/loans': ['name'],
  '/finance/vehicle-finance': ['name'],
};

for (const [basePath, fields] of Object.entries(modules)) {
  const listPath = `/households/{id}${basePath}`;
  const itemPath = `/households/{id}${basePath}/{itemId}`;

  const tags = basePath.includes('/finance')
    ? ['Finance']
    : [basePath.split('/')[1].charAt(0).toUpperCase() + basePath.split('/')[1].slice(1)];

  if (!swagger.paths[listPath]) {
    swagger.paths[listPath] = {};
  }

  swagger.paths[listPath].get = {
    tags,
    summary: `List ${basePath}`,
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Success' } },
  };
  swagger.paths[listPath].post = {
    tags,
    summary: `Create ${basePath}`,
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Success' } },
  };

  if (!swagger.paths[itemPath]) {
    swagger.paths[itemPath] = {};
  }

  swagger.paths[itemPath].get = {
    tags,
    summary: `Get ${basePath} item`,
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Success' } },
  };
  swagger.paths[itemPath].put = {
    tags,
    summary: `Update ${basePath} item`,
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Success' } },
  };
  swagger.paths[itemPath].delete = {
    tags,
    summary: `Delete ${basePath} item`,
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Success' } },
  };
}

// Write the fixed file
fs.writeFileSync('./swagger.json', JSON.stringify(swagger, null, 2));
