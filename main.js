import OpenAI from "openai";
import dotenv from "dotenv";

// load key
dotenv.config();

const init = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("Key not found");
    return;
  }
  const openai = new OpenAI({ apiKey });
  if (!openai) {
    console.log("Failed to create open ai", openai);
  }
  return openai;
};

// creation
const openai = init();
main();

// main block
async function main() {
  // create assistant
  const assistant = await openai.beta.assistants.create({
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
  // create a thread
  const thread = await openai.beta.threads.create();
  // message aka prompt
  // const message = await openai.beta.threads.messages.create(thread.id, {
  //   role: "user",
  //   content:
  //     "Create a JSON for the user prompt `create a bar chart, sort the chart in descending, rank with top 5`",
  // });

  const message = await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content:
      'Update this JSON `{"template": "bar", "sorting": {"type": "descending"}, "ranking": {"type": "top", "count": 5}}` with this prompt `sort the chart in ascending and show the bottom 2`',
  });

  // const message2 = await openai.beta.threads.messages.create(thread.id, {
  //   role: "user",
  //   content: "sort the chart in descending",
  // });
  // const message3 = await openai.beta.threads.messages.update(thread.id, {
  //   role: "user",
  //   content: "rank with top 5",
  // });

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
        run = await openai.beta.threads.runs.submitToolOutputsAndPoll(
          thread.id,
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
      let messages = await openai.beta.threads.messages.list(thread.id);
      return messages.data[0].content[0].text;
    } else if (run.status === "requires_action") {
      console.log(run.status);
      return await handleRequiresAction(run);
    } else {
      console.error("Run did not complete:", run);
    }
  };

  // Create and poll run
  let run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id,
  });

  const config = await handleRunStatus(run);
  console.log(config);
  console.log(JSON.parse(config.value));
}
