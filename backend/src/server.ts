import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import http from 'http';

dotenv.config({ path: '.env' });

const app = express();
let server = http.createServer(app);

const SERVER_PORT = process.env.PORT;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Or restrict in production
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/heartbeat', (req: Request, res: Response) => {
  res.send('OK');
});

server.listen(Number(SERVER_PORT), '0.0.0.0', async () => {  // Listen on all network interfaces
  console.log(`Server is running on port:${SERVER_PORT}`);

  process.on("uncaughtException", (innerErr: Error) => {
    console.error(`UNCAUGHT EXCEPTION AT SYSTEM LEVEL: ${innerErr.message}`);
    console.warn(`Stack Trace: ${innerErr.stack}`);
  });

  process.on("unhandledRejection", (reason: any) => {
    console.warn(`Unhandled Rejection at: Promise, reason: ${reason}`);
  });
});

//get ingredients
app.post('/api/upload', async (req: Request, res: Response) => {

  try {
    
    

  } catch (err) {

    res.status(500).json({ error: 'Internal Server Error' });
  }
});