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

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

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
      const body = await request.json();

      const message = body.message || "";
      const history = Array.isArray(body.history) ? body.history : [];

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

      const thinkingResponse = await fetch(THINKING_AGENT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: history.slice(-20),
        }),
      });

      const result = await thinkingResponse.json();

      return new Response(JSON.stringify(result), {
        status: thinkingResponse.status,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Voice Agent error",
          details: error.message,
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
