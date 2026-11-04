import {createHash} from "node:crypto";
import {InviteStore} from "../invite-store";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fixture, proof, token, userId, user, config } from "./invite-fixture";
async function staged() {
  const f=fixture();
  await f.send(f.handler());
  await f.send(f.handler(),"stage",proof);
  return f;
}
function storeFor(f:ReturnType<typeof fixture>) {
  return new InviteStore(f.cookie.split(";")[0].split("=")[1],config.encryptionKey,async(action,args)=>{
    const response=await f.fetch(`https://fictional.supabase.co/rest/v1/rpc/console_invite_tx_${action}`,{method:"POST",headers:{apikey:config.serviceRoleKey,Authorization:`Bearer ${config.serviceRoleKey}`},body:JSON.stringify(args)});
    return response.json();
  });
}
const denial = (message: string) =>
  Response.json(
    { code: "PT409", message, details: null, hint: null },
    { status: 409 },
  );
describe("S1 invitation admission and delivery", () => {
  it("GET and HEAD bootstrap without any durable RPC", async () => {
    const f = fixture(),
      h = f.handler();
    const request = (method: string) =>
      new Request("https://naeil.dev/auth/invite", {
        method,
        headers: { host: "naeil.dev", accept: "application/json" },
      });
    const bootstrap=await h.GET(request("GET"));expect(bootstrap.status).toBe(200);
    const binding=bootstrap.headers.getSetCookie().find(c=>c.startsWith("__Host-naeil_invite_browser="))!;
    for(const flag of ["HttpOnly","Secure","SameSite=Lax","Max-Age=600","Path=/"])expect(binding).toContain(flag);
    expect(binding).not.toContain("Domain=");
    expect((await h.GET(request("HEAD"))).status).toBe(200);
    expect(f.calls).toEqual([]);
    expect(f.rows.size).toBe(0);
  });
  it("rejects an invalid proof before any durable admission", async () => {
    const f = fixture(),
      h = f.handler();
    await f.send(h);
    f.calls.length = 0;
    f.fault((path) =>
      path.endsWith("preflight")
        ? denial("invitation proof conflict")
        : undefined,
    );
    const { r } = await f.send(h, "stage", proof);
    expect(r.status).toBe(409);
    expect(f.calls[0]).toContain("console_invite_preflight");
    expect(f.rows.size).toBe(0);
  });
  it("maps creator authority conflict to terminal invalid rather than dependency failure", async () => {
    const f = await staged(), h=f.handler();
    f.fault((path) =>
      path.endsWith("accept_console_invite")
        ? denial("invitation creator authority conflict")
        : undefined,
    );
    const { r, body } = await f.send(h, "confirm");
    expect(r.status).toBe(409);
    expect(body.status).toBe("invalid");
  });
});

it.each([{lost:false,other:null},{lost:true,other:"40000000-0000-4000-8000-000000000004"}])("reuses admission but denies another browser session delivery ($other)", async ({lost,other}) => {
  const f=fixture();await f.send(f.handler());
  if(lost){f.lose("admit");expect((await f.send(f.handler(),"stage",proof)).r.status).toBe(503);await f.send(f.handler(),"bootstrap");}
  await f.send(f.handler(),"stage",proof);
  const original = {cookie:f.cookie,csrf:f.csrf};
  f.newBrowser();
  await f.send(f.handler());
  expect((await f.send(f.handler(),"stage",proof)).body.status).toBe("staged");
  expect(f.cookie.split(";")[0]).toBe(original.cookie.split(";")[0]);
  expect(f.rows.size).toBe(1);
  await f.send(f.handler(), "confirm");
  const joined=await f.send(f.handler(),"confirm",{},original);
  expect(joined.body.status).toBe("signin");expect(joined.r.headers.getSetCookie().some(c=>c.startsWith("sb-"))).toBe(false);
  f.newBrowser();await f.send(f.handler());if(other)f.auth(other);
  for(const [action,extra] of [["stage",proof],["status",{}],["confirm",other?{switchFrom:other}:{}]] as const) {
    const result=await f.send(f.handler(),action,extra);
    expect(result.body.status).toBe("signin");
    expect(result.r.headers.getSetCookie().some(c=>c.startsWith("sb-"))).toBe(false);
  }
  expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
  expect(f.calls.filter(p=>p.endsWith("accept_console_invite"))).toHaveLength(1);
});
it("delivers shared Auth cookies separately from the host-only receipt, keeping credentials encrypted", async () => {
  const f = fixture();
  await f.send(f.handler());
  const staged = await f.send(f.handler(), "stage", proof);
  const receipt = staged.r.headers.getSetCookie();
  expect(receipt).toHaveLength(1);
  expect(receipt[0]).not.toContain("Domain=");
  const browserSecret=f.cookie.split("; ").find(c=>c.startsWith("__Host-naeil_invite_browser="))!.split("=")[1];
  const result = await f.send(f.handler(), "confirm"),
    cookies = result.r.headers.getSetCookie();
  expect(
    cookies.some(
      (c) =>
        c.startsWith("sb-fictional-auth-token=") &&
        /Domain=\.naeil.dev/i.test(c) &&
        /Secure/i.test(c),
    ),
  ).toBe(true);
  for (const secret of [
    token,
    "abcdefghijkl",
    proof.nonce,
    proof.token_hash,
    browserSecret,
  ]) {
    expect(JSON.stringify([...f.rows]).includes(secret)).toBe(false);
    expect(JSON.stringify(result.body).includes(secret)).toBe(false);
  }
});
it.each([["abcdefghijkl", "HS256", 32], [Buffer.alloc(38).toString("base64url"), "ES256", 64], [Buffer.alloc(46).toString("base64url"), "RS256", 256]] as const)("recovers GoTrue refresh format %s with %s after failed session delivery", async (refresh, alg, signatureBytes) => {
  const f = await staged();
  const access=Buffer.from(JSON.stringify({alg,typ:"JWT"})).toString("base64url")+"."+token.split(".")[1]+"."+Buffer.alloc(signatureBytes).toString("base64url");
  let users = 0;
  f.fault((p) => p.endsWith("/verify") ? Response.json({access_token:access,refresh_token:refresh,user}) :
    p.endsWith("/user") && ++users === 2
      ? Response.json({}, { status: 503 })
      : undefined,
  );
  expect((await f.send(f.handler(), "confirm")).r.status).toBe(503);
  expect([...f.rows.values()][0].phase).toBe("complete");
  f.fault(undefined);
  expect((await f.send(f.handler(), "confirm")).body.status).toBe("complete");
  expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
  expect(f.calls.filter(p=>p.endsWith("accept_console_invite"))).toHaveLength(1);
});
it.each(["staged","delivery"])("requires explicit fresh consent before replacing a different account at %s", async phase => {
  const f = fixture(),
    other = "40000000-0000-4000-8000-000000000004",
    changed = "50000000-0000-4000-8000-000000000005";
  await f.send(f.handler());
  await f.send(f.handler(), "stage", proof);
  if(phase==="delivery")await f.send(f.handler(),"confirm",{}, {cookie:f.cookie,csrf:f.csrf});
  const verifiedBefore=f.calls.filter(p=>p.endsWith("/verify")).length;
  f.auth(other);
  const first = await f.send(f.handler(), "confirm");
  expect(first.r.status).toBe(409);
  expect(first.body).toMatchObject({ status: "switch", switchFrom: other });
  expect(first.r.headers.getSetCookie()).toHaveLength(0);
  expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(verifiedBefore);
  f.auth(changed);
  expect(
    (await f.send(f.handler(), "confirm", { switchFrom: other })).body,
  ).toMatchObject({ status: "switch", switchFrom: changed });
  const result = await f.send(f.handler(), "confirm", { switchFrom: changed });
  expect(result.body.status).toBe("complete");
  expect(
    result.r.headers.getSetCookie().some((c) => /Max-Age=0/i.test(c)),
  ).toBe(true);
  expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
});
it("trigger-first registration with an expired receipt still delivers the same recipient session", async () => {
  const f = await staged();
  f.fault((p) =>
    p.endsWith("record_verification")
      ? Response.json({
          verified: true,
          registrationComplete: true,
          expiresAt: "2020-01-01T00:00:00Z",
        })
      : undefined,
  );
  expect((await f.send(f.handler(), "confirm")).body.status).toBe("complete");
  expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
});
it("uses the same already-confirmed recipient session after trigger acceptance without another OTP", async () => {
  const f = await staged();
  f.auth(userId);
  f.fault((p) =>
    p.endsWith("preflight")
      ? Response.json({
          userId,
          email: user.email,
          verificationType: "invite",
          registrationComplete: true,
        })
      : undefined,
  );
  expect((await f.send(f.handler(), "confirm")).body.status).toBe("complete");
  expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(0);
  expect(f.calls.filter(p=>p.endsWith("accept_console_invite"))).toHaveLength(1);
});
it.each([401, 403])(
  "keeps service-key HTTP%i a retryable dependency failure",
  async (status) => {
    const f = fixture();
    await f.send(f.handler());
    f.fault((p) =>
      p.endsWith("preflight")
        ? Response.json(
            { code: status, error_code: "bad_jwt", msg: "fixture" },
            { status },
          )
        : undefined,
    );
    const result = await f.send(f.handler(), "stage", proof);
    expect(result.r.status).toBe(503);
    expect(result.body.status).toBe("unavailable");
    expect(f.rows.size).toBe(0);
  },
);
it("accepts only fixed next URLs and never adds a service absent from the receipt", async () => {
  const f = fixture();
  const h = f.handler();
  await f.send(h);
  await f.send(h, "stage", proof);
  const request = (next: string) =>
    new Request(
      `https://naeil.dev/auth/invite?next=${encodeURIComponent(next)}`,
      {
        method: "POST",
        headers: {
          host: "naeil.dev",
          origin: "https://naeil.dev",
          "content-type": "application/json",
          cookie: f.cookie,
        },
        body: JSON.stringify({ action: "confirm", csrf: f.csrf }),
      },
    );
  expect((await h.POST(request("https://evil.example/"))).status).toBe(400);
  const result = await h.POST(request("https://abestimate.naeil.dev/"));
  expect(result.status).toBe(200);
  expect((await result.json()).links).toEqual([
    { label: "JEV", href: "https://jev.naeil.dev/" },
  ]);
});

it("expires session delivery without repeating OTP or acceptance",async()=>{
  const time=Date.now(), f=await staged();
  const [head,,signature]=token.split(".");
  const claims={sub:userId,session_id:"30000000-0000-4000-8000-000000000003",exp:Math.floor(time/1000)+120};
  const credential=[head,Buffer.from(JSON.stringify(claims)).toString("base64url"),signature].join(".");
  f.fault(p=>p.endsWith("/verify")?Response.json({access_token:credential,refresh_token:"abcdefghijkl",user}):undefined);
  expect((await f.send(f.handler(),"confirm",{}, {cookie:f.cookie,csrf:f.csrf})).body.status).toBe("complete");
  f.auth(null);f.advance(121000);
  const clock=vi.spyOn(Date,"now").mockReturnValue(time+121000);
  try {expect((await f.send(f.handler(),"confirm")).body.status).toBe("signin");}
  finally {clock.mockRestore();}
  expect(f.calls.filter(p=>p.endsWith("/verify"))).toHaveLength(1);
  expect(f.calls.filter(p=>p.endsWith("accept_console_invite"))).toHaveLength(1);
});

it("reads a legacy random-CSRF row after inert bootstrap without an authorization loop",async()=>{
  const f=fixture();await f.send(f.handler());
  const store=storeFor(f);
  await store.create({csrf:"l".repeat(43),expires:Date.now()+600000});
  const t=await store.claim();t.proof=proof;await store.checkpoint(t,"staged");await store.release();
  expect((await f.send(f.handler())).body.status).toBe("staged");
  expect((await f.send(f.handler(),"confirm")).body.status).toBe("complete");
  expect(f.calls.filter(p=>p.endsWith("/verify"))).toHaveLength(1);
});

it("offers normal sign-in for an already registered recipient whose OTP is spent",async()=>{
  const f=await staged();
  f.fault(p=>p.endsWith("preflight")?Response.json({userId,email:user.email,verificationType:"invite",registrationComplete:true}):p.endsWith("/verify")?Response.json({code:403,error_code:"otp_expired",msg:"Fixture OTP spent"},{status:403}):undefined);
  const result=await f.send(f.handler(),"confirm");expect(result.r.status).toBe(200);expect(result.body.status).toBe("signin");
  expect((await f.send(f.handler())).body.status).toBe("signin");
  expect((await f.send(f.handler(),"confirm")).body.status).toBe("signin");
  expect(f.calls.filter(p=>p.endsWith("/verify"))).toHaveLength(1);
});

it("persists only the confirming browser hash before the external OTP call",async()=>{
  const f=await staged();let observed=false;
  const secret=f.cookie.split("; ").find(c=>c.startsWith("__Host-naeil_invite_browser="))!.split("=")[1];
  f.fault(async p=>{
    if(p.endsWith("/verify")) {
      observed=true;const saved=await storeFor(f).read();
      expect([...f.rows.values()][0].phase).toBe("verifying");
      expect(saved?.browserHash).toBe(createHash("sha256").update(secret).digest("hex"));
      expect(JSON.stringify([...f.rows]).includes(secret)).toBe(false);
    }
    return undefined;
  });
  expect((await f.send(f.handler(),"confirm")).body.status).toBe("complete");expect(observed).toBe(true);
});

it("consumes browser delivery authority only in the successful response",async()=>{
  const f=await staged(), result=await f.send(f.handler(),"confirm");
  expect(result.r.headers.getSetCookie().some(c=>c.startsWith("__Host-naeil_invite_browser=;") && c.includes("Max-Age=0"))).toBe(true);
  f.auth(null);await f.send(f.handler(),"bootstrap");
  const retry=await f.send(f.handler(),"confirm");
  expect(retry.body.status).toBe("signin");expect(retry.r.headers.getSetCookie().some(c=>c.startsWith("sb-"))).toBe(false);
});
it("rejects a foreign candidate before claim, record or acceptance, while its owner can recover",async()=>{
  const f=await staged(), owner={cookie:f.cookie,csrf:f.csrf};
  f.lose("candidate");expect((await f.send(f.handler(),"confirm")).r.status).toBe(503);
  f.advance(30001);f.newBrowser();await f.send(f.handler());await f.send(f.handler(),"stage",proof);
  const before=[...f.rows.values()][0].revision;
  expect((await f.send(f.handler(),"confirm")).body.status).toBe("signin");
  expect([...f.rows.values()][0].revision).toBe(before);
  expect(f.calls.filter(p=>p.endsWith("record_verification")||p.endsWith("accept_console_invite"))).toHaveLength(0);
  expect((await f.send(f.handler(),"confirm",{},owner)).body.status).toBe("complete");
  expect(f.calls.filter(p=>p.endsWith("/verify"))).toHaveLength(1);
});
it("never authorizes delivery from a legacy unbound complete row, even for the recipient",async()=>{
  const f=fixture();await f.send(f.handler());const store=storeFor(f);
  await store.create({csrf:f.csrf,expires:Date.now()+600000});const t=await store.claim();
  t.session={accessToken:token,refreshToken:"abcdefghijkl",userId,sessionId:"30000000-0000-4000-8000-000000000003"};
  t.links=[{label:"JEV",href:"https://jev.naeil.dev/"}];
  for(const phase of ["staged","verifying","candidate","verified","recorded","complete"] as const)await store.checkpoint(t,phase);
  await store.release();f.auth(userId);
  expect((await f.send(f.handler(),"status")).body.status).toBe("signin");
});

it.each(["a".repeat(11),"a".repeat(13),"A".repeat(12),"1".repeat(12),"a".repeat(50),"a".repeat(63),"a".repeat(51)+"\n", "abcdefghijkl\n"])("rejects malformed refresh format %j before acceptance",async refresh=>{
  const f=await staged();f.fault(p=>p.endsWith("/verify")?Response.json({access_token:token,refresh_token:refresh,user}):undefined);
  expect((await f.send(f.handler(),"confirm")).r.status).toBe(503);
  expect(f.calls.filter(p=>p.endsWith("accept_console_invite"))).toHaveLength(0);
});
it.each(["", "not.jwt", token.replace(token.split(".")[1],Buffer.from(JSON.stringify({sub:userId,session_id:"not-a-uuid",exp:9999999999})).toString("base64url")), token.replace(token.split(".")[1],Buffer.from(JSON.stringify({sub:userId,session_id:"30000000-0000-4000-8000-000000000003",exp:"9999999999"})).toString("base64url"))])("rejects malformed access claims case %#",async access=>{
  const f=await staged();f.fault(p=>p.endsWith("/verify")?Response.json({access_token:access,refresh_token:"abcdefghijkl",user}):undefined);
  expect((await f.send(f.handler(),"confirm")).r.status).toBe(503);
  expect(f.calls.filter(p=>p.endsWith("accept_console_invite"))).toHaveLength(0);
});

// Enabled-path regressions explicitly opt in; production defaults OFF.
beforeEach(() => vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", "true"));
afterEach(() => vi.unstubAllEnvs());
