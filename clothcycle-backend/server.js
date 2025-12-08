import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import binRoutes from './routes/bins.js';
import scanRoutes from './routes/scan.js';
import leaderboardRoutes from './routes/leaderboard.js';
import userRoutes from './routes/user.js';

dotenv.config();
const app = express();

app.use(helmet());

// 🔥 FIXED CORS — REQUIRED FOR LIVE SERVER (5502)
app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://localhost:5501",
    "http://localhost:5502",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501",
    "http://127.0.0.1:5502"
  ],
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"]
}));





app.use(express.json());

app.get('/', (req, res) => res.send('ClothCycle backend running'));

app.use('/api/auth', authRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/user', userRoutes);

app.use('/qr', express.static('qr'));

const PORT = process.env.PORT || 5001;

app.listen(PORT, () =>
  console.log(`Backend running at http://localhost:${PORT}`)
);
