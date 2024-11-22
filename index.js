const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const bodyParser = require('body-parser');

const usersRouter = require('./routes/userRoutes.js');

require('dotenv').config();
const app = express();

connectDB();

const port = process.env.PORT || 8000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use('/users', usersRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
