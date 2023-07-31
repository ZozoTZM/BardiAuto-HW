const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const seatController = require('./Controller/seatController');
const seatModel = require('./Model/seatModel');

const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

app.use('/', seatController);

seatModel.initializeDatabase();

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
