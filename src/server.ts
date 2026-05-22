import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import issueRoutes from './routes/issueRoutes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);

// Base route test
app.get('/', (req, res) => {
  res.json({ message: 'Port is 5000' });
  res.json({ message: 'DevPulse API is running' });
  res.json({ message: 'PostgreSQL connection successful' });
  res.json({ message: 'Welcome to DevPulse API Powered by  S M Samiul Hasan' });
});

// Centralized Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;