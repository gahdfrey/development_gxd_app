import "dotenv/config";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);

async function main() {
  const start = new Date("2024-01-01").getTime();
  const end = new Date("2026-03-27").getTime(); // no future dates
  const rangeMs = end - start;

  const ids = await client`SELECT id FROM patients ORDER BY id`;

  for (const { id } of ids) {
    const randomMs = Math.floor(Math.random() * rangeMs);
    const date = new Date(start + randomMs);
    await client`UPDATE patients SET created_at = ${date}, updated_at = ${date} WHERE id = ${id}`;
  }

  console.log(`✅ Updated ${ids.length} patients with random dates.`);
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
