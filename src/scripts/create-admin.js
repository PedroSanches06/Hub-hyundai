import dotenv from "dotenv";
dotenv.config();

import prisma from "../db.js";
import argon2 from "argon2";
import readline from "readline";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

async function main() {
  const args = parseArgs();
  let email = args.email;
  let password = args.password;

  if (!email) {
    email = await prompt("Email do admin: ");
  }
  if (!password) {
    password = await prompt("Senha (mínimo 12): ");
  }

  if (!email || !password) {
    console.error("Email e senha são obrigatórios.");
    process.exit(2);
  }
  if (password.length < 12) {
    console.error("Senha precisa ter ao menos 12 caracteres.");
    process.exit(2);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error("Usuário já existe. Abortando.");
    process.exit(2);
  }

  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      emailVerified: true,
      isAdmin: true
    }
  });

  console.log("Admin criado:", user.email, user.id);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
