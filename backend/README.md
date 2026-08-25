# Shiva Exchange Backend (VaultX)

This is the backend service for the **Shiva Exchange / VaultX** platform, a financial dashboard and gaming account management system. It provides a robust, scalable, and secure REST API to handle user authentication, transactions (deposits/withdrawals), profile settings, and gaming account management.

## 🚀 Tech Stack

- **Framework**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: MongoDB (managed via Prisma & Mongoose)
- **Caching & Rate Limiting**: Redis
- **File Storage**: MinIO (S3-compatible storage)
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **Validation**: class-validator & class-transformer
- **Logging**: Pino

## 📦 Prerequisites

Make sure you have the following installed on your system:

- Node.js (v18 or higher)
- MongoDB
- Redis Server
- MinIO (or an active AWS S3 account). A `docker-compose.yml` is provided for running MinIO locally.

## 🛠️ Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd Shiva-Exchange-BE
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the root directory and add the following variables based on your environment:

   ```env
   PORT=3000
   MONGODB_URL=mongodb://localhost:27017/shiva-exchange

   # JWT Secrets
   JWT_ACCESS_SECRET=your_access_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   COOKIE_SECRET=your_cookie_secret

   # MinIO / S3 Configuration
   MINIO_ENDPOINT=127.0.0.1
   MINIO_PORT=9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   MINIO_BUCKET_NAME=shiva-exchange-bucket
   MINIO_USE_SSL=false
   ```

4. **Start MinIO (Optional, via Docker):**

   ```bash
   docker-compose up -d
   ```

5. **Database Setup:**

   ```bash
   npm run db:generate
   npm run db:push
   ```

6. **Run the Application:**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm run start
   ```

## 📜 Available Scripts

- `npm run dev`: Starts the development server using nodemon.
- `npm run build`: Compiles TypeScript into JavaScript in the `dist/` directory.
- `npm run start`: Starts the application in production mode from the `dist/` folder.
- `npm run db:push`: Pushes the Prisma schema state to the database.
- `npm run db:migrate`: Creates and runs database migrations.
- `npm run db:generate`: Generates the Prisma Client.

## 📁 Project Structure

```text
├── src/
│   ├── api/          # Controllers and Routes
│   ├── config/       # Global configuration files (Database, CORS, Helmet)
│   ├── dto/          # Data Transfer Objects (Validation schemas)
│   ├── helpers/      # Reusable helper functions
│   ├── interface/    # TypeScript interfaces
│   ├── models/       # Database models/schemas
│   ├── repository/   # Data access layer
│   ├── services/     # Business logic
│   ├── types/        # Custom TypeScript types
│   ├── utils/        # Utilities (Auth, Logger, Error Handler)
│   ├── expressApp.ts # Express app setup and middleware configuration
│   └── server.ts     # Application entry point
├── docker-compose.yml# Docker configuration for MinIO
├── package.json      # Dependencies and scripts
└── tsconfig.json     # TypeScript configuration
```

## 🔒 Security & Performance

- **Helmet**: Secures HTTP headers.
- **CORS**: Configured to restrict unauthorized cross-origin requests.
- **Rate Limiting**: Protects against brute-force attacks (backed by Redis).
- **Pino Logger**: High-performance JSON logging for HTTP requests.
