export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const url = new URL(request.url);
  const path = url.pathname;

  // 这里！！！用 env.KV 不是 env.CHAT_DB！！！
  const getDB = async () => {
    const raw = await env.KV.get("db");
    return raw ? JSON.parse(raw) : { users: [], msgs: [], nextUID: 1 };
  };

  const saveDB = async (db) => {
    await env.KV.put("db", JSON.stringify(db));
  };

  const db = await getDB();

  if (path === "/api/login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const u = db.users.find(x => x.user === user && x.pwd === pwd);
    return new Response(u ? String(u.uid) : "", { headers: corsHeaders });
  }

  if (path === "/api/reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (db.users.some(x => x.user === user)) return new Response("no", { headers: corsHeaders });
    const uid = db.nextUID++;
    db.users.push({ uid, user, pwd });
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

  if (path === "/api/send") {
    const uid = url.searchParams.get("uid");
    const msg = url.searchParams.get("msg");
    const u = db.users.find(x => x.uid == uid);
    if (!u || !msg) return new Response("no", { headers: corsHeaders });
    db.msgs.push({ uid: u.uid, user: u.user, msg });
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

  if (path === "/api/msg") {
    return new Response(JSON.stringify(db.msgs || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (path === "/api/clear") {
    const admin = db.users.find(x => x.user === "Ratstudio");
    if (!admin) return new Response("no", { headers: corsHeaders });
    db.msgs = [];
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

  if (path === "/api/delete") {
    const admin = db.users.find(x => x.user === "Ratstudio");
    if (!admin) return new Response("no", { headers: corsHeaders });
    if (db.msgs.length) db.msgs.pop();
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

  return new Response("ok", { headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
