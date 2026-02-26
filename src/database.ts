import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Contact (
      id SERIAL PRIMARY KEY,
      "phoneNumber" TEXT,
      email TEXT,
      "linkedId" INTEGER REFERENCES Contact(id),
      "linkPrecedence" TEXT NOT NULL CHECK("linkPrecedence" IN ('primary', 'secondary')),
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "deletedAt" TIMESTAMP
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_email ON Contact(email)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_phone ON Contact("phoneNumber")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_linkedId ON Contact("linkedId")`);

  console.log('Database initialized');
}

export interface Contact {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: 'primary' | 'secondary';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export default pool;