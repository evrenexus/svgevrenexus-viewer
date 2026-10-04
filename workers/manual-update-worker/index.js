export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "https://evrenexus.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405, headers: cors
      });
    }

    try {
      const body = await request.json();
      const password = typeof body.password === "string" ? body.password : "";

      if (!password || password !== env.UPDATE_PASSWORD) {
        return new Response(JSON.stringify({ ok: false, error: "رمز عبور نادرست است." }), {
          status: 401, headers: cors
        });
      }

      const response = await fetch(
        "https://api.github.com/repos/evrenexus/svgevrenexus-viewer/actions/workflows/refresh-all.yml/dispatches",
        {
          method: "POST",
          headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Evren-Nexus-Manual-Update"
          },
          body: JSON.stringify({ ref: "main" })
        }
      );

      if (!response.ok) {
        return new Response(JSON.stringify({ ok: false, error: "اجرای به‌روزرسانی انجام نشد." }), {
          status: 502, headers: cors
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: cors
      });
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "خطای ارتباط با سرویس." }), {
        status: 500, headers: cors
      });
    }
  }
};