// prisma/seedProgressMultiple.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const email = "paul.wehbe97@gmail.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error("Utilisateur non trouvé :", email);
    return;
  }

  const modules = [
    { moduleCode: "1_vitamines", chapterId: "1", pct: 95 },
    { moduleCode: "2_digestive", chapterId: "2", pct: 70 },
    { moduleCode: "3_perf", chapterId: "3", pct: 100 },
    { moduleCode: "4_fatburner", chapterId: "4", pct: 45 },
    { moduleCode: "5_cognitifs", chapterId: "5", pct: 0 },
    { moduleCode: "6_stress", chapterId: "6", pct: 90 },
  ];

  for (const m of modules) {
    await prisma.progress.upsert({
      where: { userId_moduleCode: { userId: user.id, moduleCode: m.moduleCode } },
      update: { pct: m.pct, watched: true, attempts: 1, lastAttemptAt: new Date() },
      create: {
        userId: user.id,
        moduleCode: m.moduleCode,
        levelKey: "Niveau 1",
        chapterId: m.chapterId,
        watched: true,
        attempts: 1,
        pct: m.pct,
        lastAttemptAt: new Date(),
      },
    });
  }

  console.log("✅ Progressions de test créées !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
