import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InitiateCallPayload {
  calleeId: string;
  channelId?: string;
}

interface UpdateCallPayload {
  callId: string;
  action: "accept" | "reject" | "end";
  endReason?: string;
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

    // POST /call-management/initiate - Start a new call
    if (
      req.method === "POST" && pathname.includes("/call-management/initiate")
    ) {
      const payload: InitiateCallPayload = await req.json();

      if (!payload.calleeId) {
        return new Response(
          JSON.stringify({ error: "Missing calleeId" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Check if caller is trying to call themselves
      if (payload.calleeId === user.id) {
        return new Response(
          JSON.stringify({ error: "Cannot call yourself" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Check if callee exists and is in same organization/talkgroup
      const { data: callee, error: calleeError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", payload.calleeId)
        .maybeSingle();

      if (calleeError || !callee) {
        return new Response(
          JSON.stringify({ error: "Callee not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Check if callee is available (not already in a call)
      const { data: calleePresence } = await supabase
        .from("user_presence")
        .select("*")
        .eq("user_id", payload.calleeId)
        .maybeSingle();

      if (calleePresence && calleePresence.status === "in_call") {
        return new Response(
          JSON.stringify({ error: "Callee is busy" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Create call record
      const { data: call, error: callError } = await supabase
        .from("calls")
        .insert({
          caller_id: user.id,
          callee_id: payload.calleeId,
          channel_id: payload.channelId || null,
          status: "ringing",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (callError) {
        return new Response(
          JSON.stringify({ error: callError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Update both users' presence
      await supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          status: "in_call",
          current_call_id: call.id,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      return new Response(
        JSON.stringify({ success: true, call }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // POST /call-management/update - Accept, reject, or end call
    if (req.method === "POST" && pathname.includes("/call-management/update")) {
      const payload: UpdateCallPayload = await req.json();

      if (!payload.callId || !payload.action) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Get call
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

      // Verify user is part of the call
      if (call.caller_id !== user.id && call.callee_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Not authorized for this call" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      let updateData: any = {};

      if (payload.action === "accept") {
        // Only callee can accept
        if (call.callee_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Only callee can accept call" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        updateData = {
          status: "active",
          answered_at: new Date().toISOString(),
        };

        // Update callee presence
        await supabase
          .from("user_presence")
          .upsert({
            user_id: call.callee_id,
            status: "in_call",
            current_call_id: call.id,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      } else if (payload.action === "reject") {
        // Only callee can reject
        if (call.callee_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Only callee can reject call" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        updateData = {
          status: "rejected",
          ended_at: new Date().toISOString(),
          end_reason: "rejected",
        };
      } else if (payload.action === "end") {
        const startTime = call.answered_at
          ? new Date(call.answered_at)
          : new Date(call.started_at);
        const endTime = new Date();
        const durationSeconds = Math.floor(
          (endTime.getTime() - startTime.getTime()) / 1000,
        );

        updateData = {
          status: "ended",
          ended_at: endTime.toISOString(),
          duration_seconds: durationSeconds,
          end_reason: payload.endReason || "completed",
        };
      }

      // Update call
      const { data: updatedCall, error: updateError } = await supabase
        .from("calls")
        .update(updateData)
        .eq("id", payload.callId)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Update presence for both users if call ended/rejected
      if (payload.action === "end" || payload.action === "reject") {
        await supabase
          .from("user_presence")
          .update({
            status: "online",
            current_call_id: null,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in("user_id", [call.caller_id, call.callee_id]);
      }

      return new Response(
        JSON.stringify({ success: true, call: updatedCall }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // GET /call-management/active - Get user's active call
    if (req.method === "GET" && pathname.includes("/call-management/active")) {
      const { data: calls, error: callsError } = await supabase
        .from("calls")
        .select("*")
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .in("status", ["ringing", "active"])
        .order("started_at", { ascending: false })
        .limit(1);

      if (callsError) {
        return new Response(
          JSON.stringify({ error: callsError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ call: calls && calls.length > 0 ? calls[0] : null }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // GET /call-management/history - Get call history
    if (req.method === "GET" && pathname.includes("/call-management/history")) {
      const limit = parseInt(url.searchParams.get("limit") || "50");

      const { data: calls, error: callsError } = await supabase
        .from("calls")
        .select("*")
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .order("started_at", { ascending: false })
        .limit(limit);

      if (callsError) {
        return new Response(
          JSON.stringify({ error: callsError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ calls: calls || [] }),
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
    console.error("Error in call-management function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
