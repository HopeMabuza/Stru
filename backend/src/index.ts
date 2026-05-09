import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import express from 'express';
import cors from 'cors';
import goalRoutes from './routes/goal';
import verifyRoutes from './routes/verify';
import poolRoutes from './routes/pool';
import userRoutes from './routes/users';
import faucetRoutes from './routes/faucet';

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.use('/goal', goalRoutes);
app.use('/verify', verifyRoutes);
app.use('/pool', poolRoutes);
app.use('/users', userRoutes);
app.use('/faucet', faucetRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stru backend running on port ${PORT}`);
});
