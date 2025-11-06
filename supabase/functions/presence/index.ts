import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdatePresencePayload {
  status: "online" | "busy" | "offline" | "in_call";
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

    // POST /presence/update - Update user's presence status
    if (req.method === "POST" && pathname.includes("/presence/update")) {
      const payload: UpdatePresencePayload = await req.json();

      if (!payload.status) {
        return new Response(
          JSON.stringify({ error: "Missing status field" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Update or insert presence
      const { data: presence, error: presenceError } = await supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          status: payload.status,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (presenceError) {
        return new Response(
          JSON.stringify({ error: presenceError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ success: true, presence }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // POST /presence/heartbeat - Keep-alive heartbeat
    if (req.method === "POST" && pathname.includes("/presence/heartbeat")) {
      // Update last_seen timestamp
      const { data: presence, error: presenceError } = await supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          status: "online",
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (presenceError) {
        return new Response(
          JSON.stringify({ error: presenceError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ success: true, presence }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // GET /presence?userId=xxx - Get specific user's presence
    if (req.method === "GET" && pathname.endsWith("/presence")) {
      const userId = url.searchParams.get("userId");

      if (userId) {
        // Get specific user's presence
        const { data: presence, error: presenceError } = await supabase
          .from("user_presence")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (presenceError) {
          return new Response(
            JSON.stringify({ error: presenceError.message }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({ presence }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } else {
        // Get own presence
        const { data: presence, error: presenceError } = await supabase
          .from("user_presence")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (presenceError) {
          return new Response(
            JSON.stringify({ error: presenceError.message }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({ presence }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // GET /presence/talkgroup?talkgroupId=xxx - Get presence for all users in talkgroup
    if (
      req.method === "GET" && pathname.includes("/presence/talkgroup")
    ) {
      const talkgroupId = url.searchParams.get("talkgroupId");

      if (!talkgroupId) {
        return new Response(
          JSON.stringify({ error: "Missing talkgroupId parameter" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Get all user IDs in the talkgroup
      const { data: assignments, error: assignmentsError } = await supabase
        .from("user_talkgroup_assignments")
        .select("user_id")
        .eq("talkgroup_id", talkgroupId);

      if (assignmentsError) {
        return new Response(
          JSON.stringify({ error: assignmentsError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const userIds = assignments?.map((a) => a.user_id) || [];

      if (userIds.length === 0) {
        return new Response(
          JSON.stringify({ presences: [] }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Get presence for all users
      const { data: presences, error: presencesError } = await supabase
        .from("user_presence")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            role
          )
        `)
        .in("user_id", userIds);

      if (presencesError) {
        return new Response(
          JSON.stringify({ error: presencesError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ presences: presences || [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // GET /presence/online - Get all online users in accessible talkgroups
    if (req.method === "GET" && pathname.includes("/presence/online")) {
      // Get user's talkgroups
      const { data: userAssignments } = await supabase
        .from("user_talkgroup_assignments")
        .select("talkgroup_id")
        .eq("user_id", user.id);

      const { data: supervisorAssignments } = await supabase
        .from("supervisor_talkgroup_assignments")
        .select("talkgroup_id")
        .eq("supervisor_id", user.id);

      const talkgroupIds = [
        ...(userAssignments?.map((a) => a.talkgroup_id) || []),
        ...(supervisorAssignments?.map((a) => a.talkgroup_id) || []),
      ];

      if (talkgroupIds.length === 0) {
        return new Response(
          JSON.stringify({ presences: [] }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Get all users in those talkgroups
      const { data: assignments } = await supabase
        .from("user_talkgroup_assignments")
        .select("user_id")
        .in("talkgroup_id", talkgroupIds);

      const userIds = [...new Set(assignments?.map((a) => a.user_id) || [])];

      // Get online presences
      const { data: presences, error: presencesError } = await supabase
        .from("user_presence")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            role
          )
        `)
        .in("user_id", userIds)
        .in("status", ["online", "busy", "in_call"]);

      if (presencesError) {
        return new Response(
          JSON.stringify({ error: presencesError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ presences: presences || [] }),
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
    console.error("Error in presence function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
