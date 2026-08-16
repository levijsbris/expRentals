import 'dotenv/config';
import express from 'express';
import knex from 'knex';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUI from 'swagger-ui-express';
import swaggerDocument from './docs/openapi.json' with { type: 'json' };
import knexConfig from './knexfile.js';
import rentalRouter from './routes/rentals.js';
import userRouter from './routes/user.js';
import ratingRouter from './routes/rating.js';
import https from 'node:https';
import fs from 'node:fs';

const app = express();
const port = 3000;

morgan.token('res', (req, res) => {
  const headers = {};
  res.getHeaderNames().map(h => headers[h] = res.getHeader(h));
  return JSON.stringify(headers);
});

const db = knex(knexConfig);
app.use((req, res, next) => {
  req.db = db;
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(morgan('dev'));
app.use('/docs', swaggerUI.serve);
app.get('/docs', swaggerUI.setup(swaggerDocument));
app.use('/rentals', rentalRouter);
app.use('/user', userRouter);
app.use('/ratings', ratingRouter);

app.get("/knex", (req, res, next) => {
  req.db.raw("SELECT VERSION()")
  .then(version => {
    res.send("Version logged successfully");
  })
  .catch(err => {
    throw err;
  });
});

app.get('/', (req, res) => {
  res.send('Hello world');
});

const credentials = {
  key: fs.readFileSync('./certs/selfsigned.key'),
  cert: fs.readFileSync('./certs/selfsigned.crt')
};

https.createServer(credentials, app).listen(port, () => {
  console.log(`Server listening on https://localhost:${port}`);
});