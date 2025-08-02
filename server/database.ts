import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL!;

// Create the connection
const sql = postgres(connectionString);
export const db = drizzle(sql, { schema });

export type Database = typeof db;