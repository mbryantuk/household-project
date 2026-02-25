const express = require('express');
const app = express();
const router = express.Router({ mergeParams: true });
router.post('/plan', (req, res) => res.send('OK POST PLAN'));
router.post('/', (req, res) => res.send('OK POST ROOT'));
app.use('/api/households/:id/meals', router);
const request = require('supertest');
request(app).post('/api/households/1830/meals/plan').expect(200).end((err, res) => {
  console.log('Meals/plan:', res.status, res.text || res.error?.message);
});
request(app).post('/api/households/1830/meals').expect(200).end((err, res) => {
  console.log('Meals:', res.status, res.text || res.error?.message);
});
