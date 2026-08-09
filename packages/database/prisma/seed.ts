import { prisma } from "../src/index";
import { hashPassword } from "../src/password";

async function main() {
  const email = "owner@agrodata.dev";
  const password = "AgroData123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Ya existe un usuario demo con email ${email}, no se crea de nuevo.`);
    return;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: "Lucas",
      lastname: "Owner",
      email,
      passwordHash,
      isSuperAdmin: true,
      platformRole: "OWNER",
      profileType: "PRODUCTOR",
    },
  });

  console.log("Usuario demo creado:");
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);
  console.log(`  id: ${user.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
