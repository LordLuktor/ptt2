import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SignalPayload {
  callId: string;
  toUserId: string;
  signalType: "offer" | "answer" | "ice-candidate";
  signalData: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const url = new URL(req.url);
    const pathname = url.pathname;

    // POST /webrtc-signal - Send WebRTC signal
    if (req.method === "POST" && pathname.endsWith("/webrtc-signal")) {
      const payload: SignalPayload = await req.json();

      // Validate payload
      if (
        !payload.callId || !payload.toUserId || !payload.signalType ||
        !payload.signalData
      ) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Verify call exists and user is part of it
      const { data: call, error: callError } = await supabase
        .from("calls")
        .select("*")
        .eq("id", payload.callId)
        .maybeSingle();

      if (callError || !call) {
        return new Response(
          JSON.stringify({ error: "Call not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (call.caller_id !== user.id && call.callee_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Not authorized for this call" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Insert WebRTC signal
      const { data: signal, error: signalError } = await supabase
        .from("webrtc_signals")
        .insert({
          call_id: payload.callId,
          from_user_id: user.id,
          to_user_id: payload.toUserId,
          signal_type: payload.signalType,
          signal_data: payload.signalData,
        })
        .select()
        .single();

      if (signalError) {
        return new Response(
          JSON.stringify({ error: signalError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ success: true, signal }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // GET /webrtc-signal?callId=xxx - Get pending signals for user
    if (req.method === "GET" && pathname.endsWith("/webrtc-signal")) {
      const callId = url.searchParams.get("callId");
      const since = url.searchParams.get("since"); // ISO timestamp

      if (!callId) {
        return new Response(
          JSON.stringify({ error: "Missing callId parameter" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      let query = supabase
        .from("webrtc_signals")
        .select("*")
        .eq("call_id", callId)
        .eq("to_user_id", user.id)
        .order("created_at", { ascending: true });

      if (since) {
        query = query.gt("created_at", since);
      }

      const { data: signals, error: signalsError } = await query;

      if (signalsError) {
        return new Response(
          JSON.stringify({ error: signalsError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ signals: signals || [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in webrtc-signal function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
