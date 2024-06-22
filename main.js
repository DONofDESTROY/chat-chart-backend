// import OpenAI from "openai";
import dotenv from "dotenv";
import express from "express";
import chalk from "chalk";
import cors from "cors";
import { AIService } from "./ai/ai.service.js";
import routes from "./routes/index.js";

const init = async () => {
  // load environment variables
  console.log(`${chalk.bgGreen("Loading:")} config`);
  dotenv.config();
  console.log(`${chalk.bgGreen("Loaded:")} config`);

  console.log(`${chalk.bgGreen("Init open ai:")} config`);
  const aiService = AIService.getInstance();
  await aiService.init();
  console.log(`${chalk.bgGreen("open ai loaded:")} config`);

  const app = express();

  app.use(express.json());

  app.use(cors());

  app.use("/", routes);

  const PORT = process.env.PORT || 5000;

  const server = app.listen(
    PORT,
    console.log(chalk.yellow.bold(`Server running port ${PORT}`))
  );

  // Log the unhandled Error to the console for the developer
  process.on("unhandledRejection", (err, promise) => {
    console.log(`Error: ${err.message}`.red);
    if (err.code === "ECONNREFUSED") {
      // Close server & exit process
      console.log("Can't connect to DB closing".red.bold.inverse);
      server.close(() => process.exit(1));
    }
  });
};

init();
