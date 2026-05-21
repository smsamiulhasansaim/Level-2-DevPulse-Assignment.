import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Uncomment the line below if using NeonDB, Supabase, or Render
   ssl: { rejectUnauthorized: false }
});