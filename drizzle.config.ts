

import type { Config } from "drizzle-kit";


const connectionString = process.env.DATABASE_URL;

export default {
    schema: "./lib/db/schema.ts",
    out: './drizzle',
    dbCredentials: {
        url: connectionString ?? "",
    },
    dialect: "postgresql",
} satisfies Config;
