"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
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
        res.status(500).json({ message: "Error fetching accounts" });
    }
}));
app.post("/create-account", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { initialBalance } = req.body;
    if (initialBalance < 0) {
        res.status(400).json({ message: "Initial balance cannot be negative." });
        return;
    }
    const iban = `IBAN-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`;
    const account = yield prisma.account.create({
        data: {
            iban,
            balance: initialBalance || 0,
        },
    });
    res.status(201).json(account);
}));
// Deposit API
app.post("/deposit", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { iban, amount } = req.body;
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
}));
// Withdraw API
app.post("/withdraw", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { iban, amount } = req.body;
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
}));
// Transfer API
app.post("/transfer", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fromIban, toIban, amount } = req.body;
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
}));
// Statement API
app.get("/statement/:iban", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { iban } = req.params;
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
}));
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
