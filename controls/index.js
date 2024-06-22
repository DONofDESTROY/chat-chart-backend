import chalk from "chalk";
import { AIService } from "../ai/ai.service.js";
import asyncHandler from "../middleware/async.js";

export default asyncHandler(async (req, res, next) => {
  const { type, config, prompt } = req.body;

  let updatedPrompt = "";
  switch (type) {
    case "create":
      {
        updatedPrompt = `Create a JSON for the user prompt "${prompt}"`;
      }
      break;
    case "update":
      {
        updatedPrompt = `Update the JSON '${config}' for the user prompt "${prompt}"`;
      }
      break;
    default:
      console.log(`${chalk.bgRed.black("Get: ")} Failed`);
      res.status(400).json({
        success: false,
        config: {},
        error: "Unknown type",
      });
      return;
  }
  const aiService = AIService.getInstance();
  const thread = aiService.thread;
  const message = await aiService.openai.beta.threads.messages.create(
    thread.id,
    {
      role: "user",
      content: updatedPrompt,
    }
  );

  let run = await aiService.openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: aiService.assistant.id,
  });
  const updatedConfig = await aiService.handleRun(run);
  if (updatedConfig) {
    console.log(`${chalk.bgGreen.black("Get: ")} success`);
    res.status(200).json({
      success: true,
      config: updatedConfig,
      error: "",
    });
  } else {
    console.log(`${chalk.bgRed.black("Get: ")} Failed`);

    res.status(400).json({
      success: false,
      config: {},
      error: "Unknown type",
    });
  }
});
