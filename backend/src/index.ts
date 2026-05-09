import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import goalRoutes from './routes/goal';
import verifyRoutes from './routes/verify';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/goal', goalRoutes);
app.use('/verify', verifyRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Stru backend running on http://localhost:${PORT}`);
});
