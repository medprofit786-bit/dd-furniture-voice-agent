const THINKING_AGENT_URL =
  "https://dd-furniture-thinking-agent.medprofit786.workers.dev/";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request) {
    const headers = corsHeaders();

    // Handle browser CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers,
      });
    }

    // Only POST is allowed
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "POST request required",
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        }
      );
    }

    try {
      // Read incoming request
      let body;

      try {
        body = await request.json();
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON received by Voice Agent",
            details: error.message,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
          }
        );
      }

      const message = body.message || "";
      const history = Array.isArray(body.history) ? body.history : [];

      // Check message
      if (!message.trim()) {
        return new Response(
          JSON.stringify({
            error: "Message is required",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
          }
        );
      }

      // Connect to Thinking Agent
      let thinkingResponse;

      try {
        thinkingResponse = await fetch(THINKING_AGENT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            history: history.slice(-20),
          }),
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Thinking Agent connection failed",
            details: error.message,
            thinkingAgentUrl: THINKING_AGENT_URL,
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
          }
        );
      }

      // Read Thinking Agent response as text first
      const responseText = await thinkingResponse.text();

      // Try to convert response to JSON
      let result;

      try {
        result = JSON.parse(responseText);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Thinking Agent returned invalid JSON",
            thinkingAgentStatus: thinkingResponse.status,
            thinkingAgentResponse: responseText.slice(0, 2000),
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
          }
        );
      }

      // If Thinking Agent itself returned an error
      if (!thinkingResponse.ok) {
        return new Response(
          JSON.stringify({
            error: "Thinking Agent returned an error",
            thinkingAgentStatus: thinkingResponse.status,
            thinkingAgentResult: result,
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
          }
        );
      }

      // Successful response
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Voice Agent internal error",
          details: error.message,
          stack: error.stack || null,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        }
      );
    }
  },
};
