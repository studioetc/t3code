import http from "node:http";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/Users/onesteppplusgmai.com/Dev/T3_work/t3code-render-scroll/apps/web/package.json");
const { chromium } = require("playwright");
const dir = process.argv[2];
const pages = { base: fs.readFileSync(`${dir}/base.html`, "utf8"), head: fs.readFileSync(`${dir}/head.html`, "utf8") };
const host = (src) => `<!doctype html><html><body style="margin:0;font:14px system-ui;background:#111;color:#ddd">
<div id=sc style="height:720px;overflow-y:auto;width:760px;margin:0 auto;padding:0 16px">
<p style="height:300px">Chat message above the render.</p>
<iframe id=f src="${src}" sandbox="allow-scripts allow-forms" style="display:block;border:0;width:728px;height:400px;background:#fff"></iframe>
<p style="height:600px">Agent reply below the render.</p></div>
<div id=hud style="position:fixed;top:8px;right:8px;background:#000c;padding:6px 10px;border-radius:6px;font:13px ui-monospace"></div>
<script>
const sc=document.getElementById("sc"),f=document.getElementById("f"),hud=document.getElementById("hud");
addEventListener("message",e=>{const p=e.data&&e.data.params;if(e.source===f.contentWindow&&e.data.method==="ui/notifications/size-changed"&&p)f.style.height=Math.min(p.height,20000)+"px";});
const show=()=>hud.textContent="chat scrollTop "+Math.round(sc.scrollTop)+" / "+(sc.scrollHeight-sc.clientHeight);
sc.addEventListener("scroll",show);setInterval(show,100);
</script></body></html>`;
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  res.setHeader("content-type", "text/html");
  if (u.pathname === "/host") res.end(host(u.searchParams.get("src")));
  else res.end(pages[u.pathname.slice(1)] ?? "nope");
}).listen(0, "127.0.0.1");
await new Promise((r) => srv.once("listening", r));
const port = srv.address().port;
const browser = await chromium.launch({ headless: true });
const result = { chromium: browser.version() };
for (const side of ["base", "head"]) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 720 }, recordVideo: { dir: `${dir}/out4/${side}-video`, size: { width: 900, height: 720 } } });
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${port}/host?src=${encodeURIComponent(`http://localhost:${port}/${side}#t3-contain-scroll`)}`);
  await p.waitForFunction(() => document.getElementById("f").getBoundingClientRect().height > 10000);
  await p.waitForTimeout(500);
  await p.mouse.move(450, 400);
  const wheel = [];
  for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, 200); await p.waitForTimeout(120); wheel.push(await p.evaluate(() => Math.round(document.getElementById("sc").scrollTop))); }
  await p.screenshot({ path: `${dir}/out4/${side}-after-wheel.png` });
  await p.evaluate(() => { const s = document.getElementById("sc"); s.tabIndex = 0; s.focus(); });
  const keys = [];
  for (let i = 0; i < 6; i++) { await p.keyboard.press("PageDown"); await p.waitForTimeout(250); keys.push(await p.evaluate(() => Math.round(document.getElementById("sc").scrollTop))); }
  result[side] = { frameHeight: await p.evaluate(() => Math.round(document.getElementById("f").getBoundingClientRect().height)), wheel, pageDown: keys };
  await ctx.close();
}
await browser.close(); srv.close();
fs.writeFileSync(`${dir}/out4/result.json`, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result));
