var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(bodyParser.json());
const PORT = process.env.PORT || 3001;
app.get("/accounts", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const accounts = yield prisma.account.findMany({
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
    }
    catch (error) {
        console.error("Error fetching accounts:", error);
        res
            .status(500)
            .json({ message: "Error fetching accounts", details: error.message });
    }
}));
app.post("/create-account", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { initialBalance } = req.body;
    try {
        if (initialBalance < 0) {
            res
                .status(400)
                .json({ message: "Initial balance cannot be negative." });
            return;
        }
        const iban = `IBAN-${uuidv4().slice(0, 8).toUpperCase()}`;
        const account = yield prisma.account.create({
            data: {
                iban,
                balance: initialBalance || 0,
            },
        });
        res.status(201).json(account);
    }
    catch (error) {
        console.error("Error in creating account:", error);
        res.status(500).json({
            message: "Internal server error while creating account",
            details: error.message,
        });
    }
}));
// Deposit API
app.post("/deposit", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { iban, amount } = req.body;
    try {
        if (!iban || amount <= 0) {
            res.status(400).json({ message: "Invalid input" });
            return;
        }
        const account = yield prisma.account.findUnique({ where: { iban } });
        if (!account) {
            res.status(404).json({ message: "Account not found" });
            return;
        }
        const updatedAccount = yield prisma.account.update({
            where: { iban },
            data: { balance: { increment: amount } },
        });
        yield prisma.transaction.create({
            data: { accountId: updatedAccount.id, amount, type: "DEPOSIT" },
        });
        res.status(200).json(updatedAccount);
    }
    catch (error) {
        console.error("Error during deposit:", error);
        res
            .status(500)
            .json({ message: "Error during deposit", details: error.message });
    }
}));
// Withdraw API
app.post("/withdraw", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { iban, amount } = req.body;
    try {
        if (!iban || amount <= 0) {
            res.status(400).json({ message: "Invalid input" });
            return;
        }
        const account = yield prisma.account.findUnique({ where: { iban } });
        if (!account) {
            res.status(404).json({ message: "Account not found" });
            return;
        }
        if (account.balance < amount) {
            res.status(400).json({ message: "Insufficient funds" });
            return;
        }
        const updatedAccount = yield prisma.account.update({
            where: { iban },
            data: { balance: { decrement: amount } },
        });
        yield prisma.transaction.create({
            data: { accountId: updatedAccount.id, amount, type: "WITHDRAW" },
        });
        res.status(200).json(updatedAccount);
    }
    catch (error) {
        console.error("Error during withdrawal:", error);
        res
            .status(500)
            .json({ message: "Error during withdrawal", details: error.message });
    }
}));
// Transfer API
app.post("/transfer", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fromIban, toIban, amount } = req.body;
    try {
        if (!fromIban || !toIban || amount <= 0 || fromIban === toIban) {
            res.status(400).json({ message: "Invalid input" });
            return;
        }
        const fromAccount = yield prisma.account.findUnique({
            where: { iban: fromIban },
        });
        const toAccount = yield prisma.account.findUnique({
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
        yield prisma.account.update({
            where: { iban: fromIban },
            data: { balance: { decrement: amount } },
        });
        yield prisma.account.update({
            where: { iban: toIban },
            data: { balance: { increment: amount } },
        });
        yield prisma.transaction.create({
            data: { accountId: fromAccount.id, amount, type: "TRANSFER_OUT" },
        });
        yield prisma.transaction.create({
            data: { accountId: toAccount.id, amount, type: "TRANSFER_IN" },
        });
        res.status(200).json({ message: "Transfer successful" });
    }
    catch (error) {
        console.error("Error during transfer:", error);
        res
            .status(500)
            .json({ message: "Error during transfer", details: error.message });
    }
}));
// Statement API
app.get("/statement/:iban", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { iban } = req.params;
    try {
        const account = yield prisma.account.findUnique({ where: { iban } });
        if (!account) {
            res.status(404).json({ message: "Account not found" });
            return;
        }
        const transactions = yield prisma.transaction.findMany({
            where: { accountId: account.id },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(transactions);
    }
    catch (error) {
        console.error("Error fetching statement:", error);
        res
            .status(500)
            .json({ message: "Error fetching statement", details: error.message });
    }
}));
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
