// Seeds reciter_embeddings (pgvector) from the JSON exported by
// samaa.ai/enroll_reciters.py — one row PER ENROLLMENT RECORDING.
//
// Usage (from samaa.backend):
//   npx ts-node src/tools/seed-embeddings.ts [path/to/reciter_vectors.json]
//
// The JSON maps enrollment folder names to per-recording embeddings:
//   { "Ahmad Saud": [ { "file": "1.mp3", "vector": [0.01, ...] }, ... ], ... }
//
// Re-running is safe: each reciter's existing embedding rows are replaced.
//
// Folder names rarely match DB spellings exactly, so resolution is:
//   1. FOLDER_TO_SLUG explicit mapping below
//   2. normalized comparison (lowercase, alphanumerics only) against every
//      reciter slug and English translation name
// Anything unresolved is reported at the end — fix by adding it to
// FOLDER_TO_SLUG or creating the reciter record first.

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMBEDDING_DIMENSIONS = 192;

// Enrollment folder name → DB reciter slug, for spellings that differ.
const FOLDER_TO_SLUG: Record<string, string> = {
  "Ahmad Saud": "ahmed-saoud",
  "Maher Al Meaqli": "maher-al-muaiqly",
  "Abdelbari Al-Toubayti": "abdul-bari-ath-thubaity",
  // "Abdelaziz sheim": no matching reciter record in the DB yet —
  // create the reciter (admin or seed), then map its slug here.
};

// "Maher Al-Muaiqly" → "maheralmuaiqly"
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

interface RecordingEntry {
  file: string;
  vector: number[];
}

async function main() {
  const jsonPath = path.resolve(
    process.cwd(),
    process.argv[2] ?? "../samaa.ai/reciter_vectors.json",
  );

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Vectors file not found: ${jsonPath}`);
    console.error("   Run enroll_reciters.py in samaa.ai first.");
    process.exitCode = 1;
    return;
  }

  // Fail fast with a clear message if pgvector isn't set up in this DB
  const ext = await prisma.$queryRawUnsafe<unknown[]>(
    "SELECT extname FROM pg_extension WHERE extname = 'vector'",
  );
  if (ext.length === 0) {
    console.error("❌ The 'vector' extension is not installed in this database.");
    console.error("   Apply the pgvector migration first (npx prisma migrate deploy");
    console.error("   against a pgvector-enabled Postgres).");
    process.exitCode = 1;
    return;
  }

  const vectors: Record<string, RecordingEntry[]> = JSON.parse(
    fs.readFileSync(jsonPath, "utf-8"),
  );

  const reciters = await prisma.reciter.findMany({
    select: {
      id: true,
      slug: true,
      translations: { where: { language: "en" }, select: { name: true } },
    },
  });

  const bySlug = new Map(reciters.map((r) => [r.slug, r]));
  const byNormalized = new Map<string, (typeof reciters)[number]>();
  for (const r of reciters) {
    byNormalized.set(normalize(r.slug), r);
    const enName = r.translations[0]?.name;
    if (enName) byNormalized.set(normalize(enName), r);
  }

  const seeded: string[] = [];
  const unmatched: string[] = [];

  for (const [folderName, recordings] of Object.entries(vectors)) {
    const reciter =
      bySlug.get(FOLDER_TO_SLUG[folderName] ?? "") ??
      byNormalized.get(normalize(folderName));

    if (!reciter) {
      unmatched.push(folderName);
      continue;
    }

    const valid = recordings.filter((rec) => {
      if (rec.vector.length !== EMBEDDING_DIMENSIONS) {
        console.error(
          `⚠️  "${folderName}/${rec.file}": expected ${EMBEDDING_DIMENSIONS} dims, got ${rec.vector.length} — skipped`,
        );
        return false;
      }
      return true;
    });
    if (valid.length === 0) continue;

    // Replace this reciter's embeddings atomically so re-seeding never
    // leaves a mix of old and new recordings.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM reciter_embeddings WHERE "reciterId" = ${reciter.id}`,
      );
      for (const rec of valid) {
        // pgvector literal is "[0.1,0.2,...]"; passed as a bound parameter and
        // cast server-side, so no SQL injection surface despite raw SQL.
        const vectorLiteral = `[${rec.vector.join(",")}]`;
        await tx.$executeRaw(
          Prisma.sql`INSERT INTO reciter_embeddings (id, "reciterId", "sourceFile", embedding)
                     VALUES (${crypto.randomUUID()}, ${reciter.id}, ${rec.file}, ${vectorLiteral}::vector)`,
        );
      }
    });

    seeded.push(`${folderName} → ${reciter.slug} (${valid.length} recording(s))`);
  }

  const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    "SELECT COUNT(*) AS count FROM reciter_embeddings",
  );

  console.log(`\n✅ Seeded ${seeded.length} reciter(s):`);
  for (const s of seeded) console.log("   -", s);
  if (unmatched.length > 0) {
    console.log(`\n❌ Unmatched folder(s) — add to FOLDER_TO_SLUG or create the reciter:`);
    for (const u of unmatched) console.log("   -", u);
  }
  console.log(`\n📊 Total embedding rows in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
