import { CorsOptions } from "cors";

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:80",
  "http://localhost:8080",
  "http://localhost:3010",
  process.env.NGROK_URL,
  process.env.FRONTEND_URL, // your actual production frontend domain if in env
];

export const corsOptions: CorsOptions = {
  origin: (origin: any, callback: any) => {
    // Allow requests with no origin (e.g., mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
