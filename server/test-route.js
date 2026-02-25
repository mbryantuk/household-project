const express = require('express');
const app = express();
const meals = require('./routes/meals');
app.use('/api/households/:id/meals', meals);
app.listen(4003, () => console.log('started'));
