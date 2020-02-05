require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const { NODE_ENV } = require('./config');
const uuid = require('uuid/v4');

const app = express();

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());
app.use(express.json());

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

const lists = [
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

app.get('/card', (req, res) => {
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

app.get('/list/:id', (req, res) => {
	const { id } = req.params;
	const list = cards.find((c) => c.id == id);

	// makes sure list is found
	if (!list) {
		logger.error(`List with id ${id} not found.`);
		return res.status(404).send('List Not Found');
	}

	res.json(list);
});

app.post('/card', (req, res) => {
	const { title, content } = req.body;

	if (!title) {
		logger.error('Title is required');
		return res.status(400).send('Invalid data');
	}

	if (!content) {
		logger.error('Content is required');
		return res.status(400).send('Invalid data');
	}

	// get an id
	const id = uuid();

	const card = {
		id,
		title,
		content
	};

	cards.push(card);

	logger.info(`Card with id ${id} created`);

	res.status(201).location(`http://localhost:8000/card/${id}`).json(card);
});

app.post('/list', (req, res) => {
	const { header, cardIds = [] } = req.body;

	if (!header) {
		logger.error(`Header is required`);
		return res.status(400).send('Invalid data');
	}

	// check card IDs
	if (cardIds.length > 0) {
		let valid = true;
		cardIds.forEach((cid) => {
			const card = cards.find((c) => c.id == cid);
			if (!card) {
				logger.error(`Card with id ${cid} not found in cards array.`);
				valid = false;
			}
		});

		if (!valid) {
			return res.status(400).send('Invalid data');
		}
	}

	// get an id
	const id = uuid();

	const list = {
		id,
		header,
		cardIds
	};

	lists.push(list);

	logger.info(`List with id ${id} created`);

	res.status(201).location(`http://localhost:8000/list/${id}`).json({ id });
});

app.delete('/list/:id', (req, res) => {
	const { id } = req.params;

	const listIndex = lists.findIndex((li) => li.id == id);

	if (listIndex === -1) {
		logger.error(`List with id ${id} not found.`);
		return res.status(404).send('Not Found');
	}

	lists.splice(listIndex, 1);

	logger.info(`List with id ${id} deleted.`);
	res.status(204).end();
});

app.delete('/card/:id', (req, res) => {
	const { id } = req.params;

	const cardIndex = cards.findIndex((c) => c.id == id);

	if (cardIndex === -1) {
		logger.error(`Card with id ${id} not found.`);
		return res.status(404).send('Not found');
	}

	//remove card from lists
	//assume cardIds are not duplicated in the cardIds array
	lists.forEach((list) => {
		const cardIds = list.cardIds.filter((cid) => cid !== id);
		list.cardIds = cardIds;
	});

	cards.splice(cardIndex, 1);

	logger.info(`Card with id ${id} deleted.`);

	res.status(204).end();
});

module.exports = app;
