const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 12);

  await prisma.user.upsert({
    where: { email: "admin@oms.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@oms.com",
      password,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@oms.com" },
    update: {},
    create: {
      name: "Manager User",
      email: "manager@oms.com",
      password,
      role: "MANAGER",
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@oms.com" },
    update: {},
    create: {
      name: "Customer User",
      email: "customer@oms.com",
      password,
      role: "CUSTOMER",
    },
  });

  console.log("Seed complete — 3 users created");
  console.log("admin@oms.com    / password123");
  console.log("manager@oms.com  / password123");
  console.log("customer@oms.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
