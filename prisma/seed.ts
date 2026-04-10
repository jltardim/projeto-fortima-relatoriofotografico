import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@fortima.com" },
    update: {},
    create: {
      email: "admin@fortima.com",
      password: hashedPassword,
      nome: "Administrador",
    },
  });

  console.log("Seed concluido: usuario admin@fortima.com criado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
