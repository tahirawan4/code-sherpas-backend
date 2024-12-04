# Banking App Backend

This is the backend of the Banking App, built using **Node.js**, **Express**, **Prisma**, and **SQLite**. It provides RESTful APIs to manage bank accounts, perform transactions, and retrieve account statements.

---

## Technologies Used

- **Node.js**
- **Express.js**
- **Prisma ORM**
- **SQLite** (for database)
- **TypeScript**

---

## Prerequisites

- Node.js (version 16 or higher)
- NPM or Yarn

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up the Database

Prisma will handle database initialization. Run the following command:

```bash
npx prisma migrate dev --name init
```

This will create the SQLite database file (`dev.db`) in the root directory.

### 4. Start the Development Server

```bash
npx ts-node index.ts
```

or

```bash
npm start
```

The server will start at [http://localhost:3001](http://localhost:3001).

---

## API Endpoints

| Endpoint           | Method | Description                     |
| ------------------ | ------ | ------------------------------- |
| `/deposit`         | POST   | Deposit money into an account   |
| `/withdraw`        | POST   | Withdraw money from an account  |
| `/transfer`        | POST   | Transfer money between accounts |
| `/statement/:iban` | GET    | Get transactions for an account |
| `/create-account`  | POST   | Create a new account with IBAN  |
| `/accounts`        | GET    | Fetch all accounts and balances |

---

## Directory Structure

```
src/
├── prisma/
│   ├── schema.prisma      # Database schema
├── index.ts               # Main Express application
└── node_modules/          # Installed dependencies
```

---

## Running in Production

### 1. Transpile TypeScript to JavaScript

Run the following command to build the application:

```bash
npx tsc
```

### 2. Start the Production Server

```bash
node dist/index.js
```
