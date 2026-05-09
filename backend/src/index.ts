import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import express from 'express';
import cors from 'cors';
import goalRoutes from './routes/goal';
import verifyRoutes from './routes/verify';
import poolRoutes from './routes/pool';
import userRoutes from './routes/users';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/goal', goalRoutes);
app.use('/verify', verifyRoutes);
app.use('/pool', poolRoutes);
app.use('/users', userRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Stru backend running on http://localhost:${PORT}`);
});
