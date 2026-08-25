import "./config/env.config";
import { expressApp } from "./expressApp";
import { logger } from "./utils/logger";

const PORT = Number(process.env.PORT) || 3000;

const StartServer = async () => {
  const ExpressApp = await expressApp();

  ExpressApp.listen(PORT, "0.0.0.0", () => {
    logger.info(`Local:   http://localhost:${PORT}`);
    logger.info(`Network: http://192.168.1.25:${PORT}`);
  });

  process.on("uncaughtException", async (err) => {
    logger.error(err);
    process.exit(1);
  });
};

StartServer().then(() => {
  logger.info("Server is up!");
});
