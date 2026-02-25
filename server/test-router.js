const app = require('./App');
const stack = app._router.stack;
stack.forEach(layer => {
  if (layer.name === 'router') {
    console.log(layer.regexp);
  }
});
