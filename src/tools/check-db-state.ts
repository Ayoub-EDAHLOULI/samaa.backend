import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ver = await prisma.$queryRawUnsafe<{ version: string }[]>(
    "SELECT version()",
  );
  console.log("postgres:", ver[0].version);

  const ext = await prisma.$queryRawUnsafe<unknown[]>(
    "SELECT extname FROM pg_extension WHERE extname = 'vector'",
  );
  console.log("vector extension:", ext.length ? "INSTALLED" : "MISSING");

  const emb = await prisma.$queryRawUnsafe<{ reciters: bigint; rows: bigint }[]>(
    'SELECT COUNT(DISTINCT "reciterId") AS reciters, COUNT(*) AS rows FROM reciter_embeddings',
  );
  console.log(
    `embeddings: ${emb[0].rows} recording(s) across ${emb[0].reciters} reciter(s)`,
  );

  const reciters = await prisma.reciter.findMany({
    select: {
      slug: true,
      translations: { where: { language: "en" }, select: { name: true } },
    },
  });
  console.log("reciters in DB:", reciters.length);
  for (const r of reciters) {
    console.log(" -", r.slug, "|", r.translations[0]?.name ?? "(no en name)");
  }
}

main()
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
