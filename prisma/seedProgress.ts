// prisma/seedProgress.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // On retrouve l’utilisateur par son email
  const user = await prisma.user.findUnique({
    where: { email: "paul.wehbe97@gmail.com" },
  });

  if (!user) {
    console.error("Utilisateur non trouvé !");
    return;
  }

  // On insère un faux Progress
  const progress = await prisma.progress.create({
    data: {
      userId: user.id,
      moduleCode: "1_vitamines",   // identifiant module
      levelKey: "Niveau 1",        // cohérent avec ton curriculum
      chapterId: "1",
      watched: true,
      attempts: 1,
      pct: 95,                     // >90% → considéré comme réussi
      lastAttemptAt: new Date(),
    },
  });

  console.log("Progress inséré :", progress);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
