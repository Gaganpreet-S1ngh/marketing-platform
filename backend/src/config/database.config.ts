import mongoose, { Connection, ConnectOptions, mongo } from "mongoose";
import { logger } from "../utils/logger";

export class DatabaseManager {
  private static _instance: DatabaseManager;
  private isConnected: boolean = false;
  private retryCount: number = 0;

  //function accessed as a property of class
  static get instance() {
    if (!this._instance) {
      //create the instance and store in the static value
      this._instance = new DatabaseManager();
    }

    return this._instance;
  }

  public async connect(url: string, options: ConnectOptions): Promise<void> {
    if (this.isConnected) {
      logger.info("Database is already connected");
      return;
    }

    try {
      await this.connectWithRetry(url, options);

      mongoose.connection.on("connected", () => {
        logger.info("Mongoose connected to MongoDB");
        this.isConnected = true;
      });

      mongoose.connection.on("error", (error) => {
        logger.error(error, " : Mongoose connection error");
        this.isConnected = false;
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("Mongoose disconnected from MongoDB");
        this.isConnected = false;
        this.handleDisconnection(url, options);
      });

      process.on("SIGINT", this.gracefulShutdown.bind(this));
      process.on("SIGTERM", this.gracefulShutdown.bind(this));

      this.isConnected = true;
      logger.info("Successfully connected to MongoDB");
    } catch (error) {
      logger.error(
        error, " : Failed to connect to MongoDB after all retry attempts",

      );
      throw error;
    }

  }

  private async connectWithRetry(
    url: string,
    options: ConnectOptions,
  ): Promise<void> {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await mongoose.connect(url, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferCommands: false,

          ...options,
        });
        this.retryCount = 0;
        return;
      } catch (error) {
        console.log(error);
        logger.warn(
          `Connection attempt ${attempt}/${maxAttempts} failed:`,
          error,
        );

        if (attempt === maxAttempts) {
          throw new Error(
            `Failed to connect to MongoDB after ${maxAttempts} attempts`,
          );
        }

        await this.delay(5000);
      }
    }
  }

  private async handleDisconnection(
    url: string,
    options: ConnectOptions,
  ): Promise<void> {
    if (this.retryCount < 5) {
      this.retryCount++;
      logger.info(`Attempting to reconnect (${this.retryCount}/5)`);

      try {
        await this.delay(5000);
        await this.connectWithRetry(url, options);
      } catch (error) {
        logger.error(error, " : Reconnection failed");
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info("Successfully disconnected from MongoDB");
    } catch (error) {
      logger.error(error, " : Error disconnecting from MongoDB");
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info("Received shutdown signal, closing MongoDB connection...");
    await this.disconnect();
    process.exit(0);
  }
}
