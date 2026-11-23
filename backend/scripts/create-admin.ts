import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { createPrismaAdapter } from "../src/prisma/prisma-adapter";
import { hashPassword } from "../src/modules/admin/password";

config({ path: resolve(__dirname, "../../.env") });

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function promptHiddenPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    const input = createInterface({ input: process.stdin, output: process.stdout });
    return input.question(prompt).finally(() => input.close());
  }

  return new Promise((resolvePassword, reject) => {
    let password = "";
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();

    const finish = (error?: Error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolvePassword(password);
    };

    const onData = (chunk: Buffer | string) => {
      for (const character of String(chunk)) {
        if (character === "\u0003") {
          finish(new Error("Admin creation cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          password = password.slice(0, -1);
        } else {
          password += character;
        }
      }
    };

    process.stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  const name = (await input.question("Admin name: ")).trim();
  const email = (await input.question("Admin email: ")).trim().toLowerCase();
  input.close();
  const password = await promptHiddenPassword("Admin password (12+ characters): ");

  if (name.length < 2 || name.length > 80) {
    throw new Error("Admin name must be between 2 and 80 characters.");
  }
  if (!emailPattern.test(email) || email.length > 254) {
    throw new Error("Enter a valid admin email address.");
  }
  if (password.length < 12 || password.length > 200 || !password.trim()) {
    throw new Error("Admin password must be between 12 and 200 characters.");
  }

  const passwordConfirmation = await promptHiddenPassword("Confirm admin password: ");
  if (password !== passwordConfirmation) {
    throw new Error("The passwords do not match.");
  }

  if (await prisma.adminAccount.findUnique({ where: { email } })) {
    throw new Error("An account already uses that email address.");
  }

  await prisma.adminAccount.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "admin",
    },
    select: { id: true },
  });
  console.info("Admin account created.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Admin account creation failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
