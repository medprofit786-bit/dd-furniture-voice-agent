const THINKING_AGENT_URL =
  "https://dd-furniture-thinking-agent.medprofit786.workers.dev/";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...corsHeaders(),
    },
  });
}

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Only POST is allowed
    if (request.method !== "POST") {
      return json(
        {
          error: "POST request required",
        },
        405
      );
    }

    try {
      // Read incoming request
      let body;

      try {
        body = await request.json();
      } catch (error) {
        return json(
          {
            error: "Invalid JSON received by Voice Agent",
            details: error.message,
          },
          400
        );
      }

      const message =
        typeof body?.message === "string"
          ? body.message.trim()
          : "";

      const history =
        Array.isArray(body?.history)
          ? body.history
          : [];

      if (!message) {
        return json(
          {
            error: "Message is required",
          },
          400
        );
      }

      // Send message + memory to Thinking Agent
      let thinkingResponse;

      try {
        thinkingResponse = await fetch(
          THINKING_AGENT_URL,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({
              message: message,
              history: history.slice(-20),
            }),
          }
        );
      } catch (error) {
        return json(
          {
            error: "Could not connect to Thinking Agent",
            details: error.message,
          },
          502
        );
      }

      // Get raw response first
      const rawResponse =
        await thinkingResponse.text();

      // Try to parse Thinking Agent JSON
      let thinkingData;

      try {
        thinkingData =
          JSON.parse(rawResponse);
      } catch (error) {
        return json(
          {
            error:
              "Thinking Agent returned invalid JSON",
            thinkingAgentStatus:
              thinkingResponse.status,
            rawResponse:
              rawResponse.slice(0, 3000),
          },
          502
        );
      }

      // Thinking Agent itself returned an error
      if (!thinkingResponse.ok) {
        return json(
          {
            error:
              "Thinking Agent returned an error",
            thinkingAgentStatus:
              thinkingResponse.status,
            thinkingAgentResponse:
              thinkingData,
          },
          502
        );
      }

      // Extract AI answer
      const answer =
        thinkingData?.response ||
        thinkingData?.answer ||
        thinkingData?.message ||
        "";

      if (
        typeof answer !== "string" ||
        !answer.trim()
      ) {
        return json(
          {
            error:
              "Thinking Agent returned no usable answer",
            thinkingAgentResponse:
              thinkingData,
          },
          502
        );
      }

      // Return a clean response to HTML
      return json({
        success: true,
        answer: answer.trim(),
      });

    } catch (error) {
      return json(
        {
          error: "Voice Agent internal error",
          details:
            error?.message ||
            "Unknown error",
        },
        500
      );
    }
  },
};
