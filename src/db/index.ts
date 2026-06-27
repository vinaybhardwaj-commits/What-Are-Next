import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon HTTP driver (not a pool) — matches the Even stack convention.
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export { schema };
