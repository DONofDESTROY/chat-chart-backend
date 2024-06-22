import chalk from "chalk";
import OpenAI from "openai";

const log = console.log;

export class AIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      log(chalk.red("Key not found"));
      return;
    }
    const openai = new OpenAI({ apiKey });
    if (!openai) {
      log(chalk.red("Failed to create open ai", openai));
    }
    this.openai = openai;
  }

  static getInstance = () => {
    if (this.instance) return this.instance;
    this.instance = new AIService();
    return this.instance;
  };

  createAssistant = async () => {
    const assistant = await this.openai.beta.assistants.create({
      name: "Config generator",
      instructions:
        "You are a bot that generates JSON chart config for the user prompts",
      tools: [
        {
          type: "function",
          function: {
            name: "getChartConfig",
            description: "config for the chart to render",
            parameters: {
              type: "object",
              properties: {
                template: {
                  type: "string",
                  description: "template id for the chart",
                  enum: ["bar", "line"],
                },
                sorting: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      description: "sorting type",
                      enum: ["ascending", "off", "descending"],
                    },
                  },
                },
                ranking: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      description: "ranking type",
                      enum: ["top", "bottom", "off"],
                    },
                    count: {
                      type: "integer",
                      description: "rank count",
                    },
                  },
                },
              },
            },
          },
        },
      ],
      response_format: { type: "json_object" },
      model: "gpt-3.5-turbo",
    });
    this.assistant = assistant;
  };

  createThread = async () => {
    const thread = await this.openai.beta.threads.create();
    this.thread = thread;
  };

  handleRun = async (run) => {
    const handleRequiresAction = async (run) => {
      // Check if there are tools that require outputs
      if (
        run.required_action &&
        run.required_action.submit_tool_outputs &&
        run.required_action.submit_tool_outputs.tool_calls
      ) {
        // Loop through each tool in the required action section

        const toolOutputs =
          run.required_action.submit_tool_outputs.tool_calls.map((tool) => {
            if (tool.function.name === "getChartConfig") {
              return {
                tool_call_id: tool.id,
                output: tool.function.arguments,
              };
            }
          });

        console.log("the tool outputs", toolOutputs);

        // Submit all tool outputs at once after collecting them in a list
        if (toolOutputs.length > 0) {
          run = await this.openai.beta.threads.runs.submitToolOutputsAndPoll(
            this.thread.id,
            run.id,
            { tool_outputs: toolOutputs }
          );
          console.log("Tool outputs submitted successfully.");
        } else {
          console.log("No tool outputs to submit.");
        }

        // Check status after submitting tool outputs
        return handleRunStatus(run);
      }
    };

    const handleRunStatus = async (run) => {
      // Check if the run is completed
      if (run.status === "completed") {
        let messages = await this.openai.beta.threads.messages.list(
          this.thread.id
        );
        return messages.data[0].content[0].text;
      } else if (run.status === "requires_action") {
        console.log(run.status);
        return await handleRequiresAction(run);
      } else {
        console.error("Run did not complete:", run);
      }
    };

    const response = await handleRunStatus(run);
    if (response.value) {
      return response.value;
    }
    return undefined;
  };
}
