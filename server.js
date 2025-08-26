import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());

// serve static files from /public
app.use(express.static('public'));

// simple API health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    app: process.env.WEBSITE_SITE_NAME || 'local'
  });
});

app.listen(port, () => {
  console.log(`Aurevo server listening on ${port}`);
});

