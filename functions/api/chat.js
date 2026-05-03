let store = {
  users: [],
  msgs: []
};

function getData() {
  if (globalThis.__MY_STORE) return globalThis.__MY_STORE;
  return store;
}

function saveData(d) {
  globalThis.__MY_STORE = d;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");
  const d = getData();

  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const ok = d.users.some(x => x.user === user && x.pwd === pwd);
    return Response.json({ ok });
  }

  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (d.users.some(x => x.user === user)) {
      return Response.json({ ok: false });
    }
    d.users.push({ user, pwd });
    saveData(d);
    return Response.json({ ok: true });
  }

  if (act === "list") {
    return Response.json(d.msgs.slice(-80));
  }

  if (act === "send") {
    const user = url.searchParams.get("user");
    const msg = url.searchParams.get("msg");
    d.msgs.push({ user, msg });
    if (d.msgs.length > 150) d.msgs = d.msgs.slice(-80);
    saveData(d);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false });
}
