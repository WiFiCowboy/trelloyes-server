require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const { NODE_ENV } = require('./config');

const app = express();

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

// sets up winston
const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	transports: [ new winston.transports.File({ filename: 'info.log' }) ]
});

if (NODE_ENV !== 'production') {
	logger.add(
		new winston.transports.Console({
			format: winston.format.simple()
		})
	);
}

const cards = [
	{
		id: 1,
		title: 'Task One',
		content: 'This is card one'
	}
];

const list = [
	{
		id: 1,
		header: 'List One',
		cardIds: [ 1 ]
	}
];

app.use(function validateBearerToken(req, res, next) {
	const apiToken = process.env.API_TOKEN;
	console.log(apiToken);

	const authToken = req.get('Authorization');

	if (!authToken || authToken.split(' ')[1] !== apiToken) {
		logger.error(`Unauthorized request to path: ${req.path}`);
		return res.status(401).json({ error: 'Unauthorized request' });
	}
	// moves to the next middleware
	next();
});

app.get('card', (req, res) => {
	res.json(cards);
});

app.get('/list', (req, res) => {
	res.json(lists);
});

app.get('/card/:id', (req, res) => {
	const { id } = req.params;
	const card = cards.find((c) => c.id == id);

	// makes sure card is found
	if (!card) {
		logger.error(`Card with id ${id} not found.`);
		return res.status(404).send('Card Not Found');
	}

	res.json(card);
});
module.exports = app;
