const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const STORES = [
  { code: "TROISR", name: "Shop Santé Trois-Rivières" },
  { code: "STJEROME", name: "Shop Santé Saint-Jérome" },
  { code: "VAUDREUIL", name: "Shop Santé Vaudreuil-Dorion" },
  { code: "BROSSARD", name: "Shop Santé Brossard" },
  { code: "ROCKFOREST", name: "Shop Santé Rockforest" },
  { code: "FLEURIMONT", name: "Shop Santé Fleurimont" },
  { code: "STHYACINT", name: "Shop Santé Saint-Hyacinthe" },
  { code: "LEVIS", name: "Shop Santé Lévis" },
  { code: "STEFOY", name: "Shop Santé Ste-Foy" },
  { code: "LEBOURGNE", name: "Shop Santé Lebourgneuf" },
  { code: "BEAUPORT", name: "Shop Santé Beauport" },
];

async function main() {
  for (const store of STORES) {
    await prisma.store.upsert({
      where: { code: store.code },
      update: {},
      create: store,
    });
  }
  console.log("✅ Seed des boutiques complété");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
