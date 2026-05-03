let store = {
  users: [],
  msgs: []
};

function get() {
  if (globalThis.__DATA__) return globalThis.__DATA__;
  return store;
}

function save(data) {
  globalThis.__DATA__ = data;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");
  const data = get();

  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const ok = data.users.some(u => u.user === user && u.pwd === pwd);
    return Response.json({ ok });
  }

  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (data.users.some(u => u.user === user)) {
      return Response.json({ ok: false });
    }
    data.users.push({ user, pwd });
    save(data);
    return Response.json({ ok: true });
  }

  if (act === "list") {
    return Response.json(data.msgs.slice(-80));
  }

  if (act === "send") {
    const user = url.searchParams.get("user");
    const msg = url.searchParams.get("msg");
    data.msgs.push({ user, msg });
    if (data.msgs.length > 150) data.msgs = data.msgs.slice(-80);
    save(data);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false });
}
