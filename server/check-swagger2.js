const swagger = require('./swagger.json');
Object.keys(swagger.paths).forEach((path) => {
  if (path.includes('households/{id}')) {
    console.log(path);
  }
});
