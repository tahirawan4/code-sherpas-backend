require("dotenv").config();
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;

app.get("/accounts", async (req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await prisma.account.findMany({
      select: {
        iban: true,
        balance: true,
        createdAt: true,
      },
    });

    if (accounts.length === 0) {
      res.status(404).json({ message: "No accounts found" });
      return;
    }

    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching accounts" });
  }
});

app.post(
  "/create-account",
  async (req: Request, res: Response): Promise<void> => {
    const { initialBalance } = req.body;

    if (initialBalance < 0) {
      res.status(400).json({ message: "Initial balance cannot be negative." });
      return;
    }

    const iban = `IBAN-${uuidv4().slice(0, 8).toUpperCase()}`;

    const account = await prisma.account.create({
      data: {
        iban,
        balance: initialBalance || 0,
      },
    });

    res.status(201).json(account);
  }
);

// Deposit API
app.post("/deposit", async (req: Request, res: Response): Promise<void> => {
  const { iban, amount } = req.body;

  if (!iban || amount <= 0) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  const account = await prisma.account.findUnique({ where: { iban } });
  if (!account) {
    res.status(404).json({ message: "Account not found" });
    return;
  }

  const updatedAccount = await prisma.account.update({
    where: { iban },
    data: { balance: { increment: amount } },
  });

  await prisma.transaction.create({
    data: { accountId: updatedAccount.id, amount, type: "DEPOSIT" },
  });

  res.status(200).json(updatedAccount);
});

// Withdraw API
app.post("/withdraw", async (req: Request, res: Response): Promise<void> => {
  const { iban, amount } = req.body;

  if (!iban || amount <= 0) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  const account = await prisma.account.findUnique({ where: { iban } });
  if (!account) {
    res.status(404).json({ message: "Account not found" });
    return;
  }

  if (account.balance < amount) {
    res.status(400).json({ message: "Insufficient funds" });
    return;
  }

  const updatedAccount = await prisma.account.update({
    where: { iban },
    data: { balance: { decrement: amount } },
  });

  await prisma.transaction.create({
    data: { accountId: updatedAccount.id, amount, type: "WITHDRAW" },
  });

  res.status(200).json(updatedAccount);
});

// Transfer API
app.post("/transfer", async (req: Request, res: Response): Promise<void> => {
  const { fromIban, toIban, amount } = req.body;

  if (!fromIban || !toIban || amount <= 0 || fromIban === toIban) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  const fromAccount = await prisma.account.findUnique({
    where: { iban: fromIban },
  });
  const toAccount = await prisma.account.findUnique({
    where: { iban: toIban },
  });

  if (!fromAccount || !toAccount) {
    res.status(404).json({ message: "Account not found" });
    return;
  }

  if (fromAccount.balance < amount) {
    res.status(400).json({ message: "Insufficient funds" });
    return;
  }

  await prisma.account.update({
    where: { iban: fromIban },
    data: { balance: { decrement: amount } },
  });

  await prisma.account.update({
    where: { iban: toIban },
    data: { balance: { increment: amount } },
  });

  await prisma.transaction.create({
    data: { accountId: fromAccount.id, amount, type: "TRANSFER_OUT" },
  });

  await prisma.transaction.create({
    data: { accountId: toAccount.id, amount, type: "TRANSFER_IN" },
  });

  res.status(200).json({ message: "Transfer successful" });
});

// Statement API
app.get(
  "/statement/:iban",
  async (req: Request, res: Response): Promise<void> => {
    const { iban } = req.params;

    const account = await prisma.account.findUnique({ where: { iban } });
    if (!account) {
      res.status(404).json({ message: "Account not found" });
      return;
    }

    const transactions = await prisma.transaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(transactions);
  }
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
