import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fullAccess, parseResult, run } from '../loop.mjs';

// Fake-server tests must never send notifications using a developer's environment.
delete process.env.PGL_NTFY_URL;

const agent = { name: 'product-goal-loop-worker', mode: 'primary', permission: [{ permission: '*', pattern: '*', action: 'allow' }], tools: { bash: true, read: true, edit: true, write: true, task: true } };
test('Full access rejects later restrictions and disabled tools', () => {
  assert.equal(fullAccess(agent), true);
  assert.equal(fullAccess({ ...agent, permission: [...agent.permission, { permission: 'bash', pattern: '*', action: 'ask' }] }), false);
  assert.equal(fullAccess({ ...agent, tools: { ...agent.tools, task: false } }), false);
  assert.equal(fullAccess({ ...agent, mode: 'subagent' }), false);
});
test('only final structured self-report is accepted', () => {
  assert.deepEqual(parseResult('done\nPGL_RESULT {"status":"goal_complete","summary":"Tested"}'), { status: 'goal_complete', summary: 'Tested' });
  for (const text of ['IMPLEMENTATION_COMPLETE', 'PGL_RESULT {}', 'PGL_RESULT {"status":"blocked","summary":"x"}', 'PGL_RESULT {"status":"no_op","summary":"x"}\nextra']) assert.throws(() => parseResult(text));
});
async function fixture(t, mode = 'success') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pgl 한글 '));
  t.after(() => rm(root, { recursive: true, force: true }));
  const ctx = { root, state: path.join(root, 'state'), lock: path.join(root, 'state/lock') };
  const script = path.join(root, 'fake.mjs');
  await writeFile(script, `
import http from 'node:http';
import {writeFileSync} from 'node:fs';
const agent=${JSON.stringify(agent)};
const mode=${JSON.stringify(mode)};
if(process.argv.includes('debug')) { console.log(JSON.stringify(agent)); }
else {
 const server=http.createServer(async(req,res)=>{
  if(req.headers.authorization!=='Basic '+Buffer.from('opencode:'+process.env.OPENCODE_SERVER_PASSWORD).toString('base64')) {res.writeHead(401);return res.end();}
  let body='';for await(const chunk of req)body+=chunk;
  const url=new URL(req.url,'http://localhost');
  let result;
  if(url.pathname==='/agent') result=[agent];
  else if(url.pathname==='/session') {const b=JSON.parse(body);if(b.permission?.[0]?.action!=='allow')throw Error('missing permission');result={id:'ses_test'};}
  else if(url.pathname==='/session/ses_test') result={id:'ses_test',agent:agent.name,directory:process.cwd(),permission:mode==='denied'?[]:agent.permission};
  else if(url.pathname.endsWith('/message')) {
   writeFileSync('prompt-sent','yes');
   if(mode==='crash')process.exit(7);
   await new Promise(r=>setTimeout(r,200));
   const resultStatus=mode==='complete'?'implementation_complete':'goal_complete';
   result={parts:[{type:'text',text:'PGL_RESULT '+JSON.stringify({status:resultStatus,summary:'Fake verified result',commit:'abc'})}]};
  } else {res.writeHead(404);return res.end();}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
 });
 server.listen(0,'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port));
}
`);
  return { ctx, bin: [process.execPath, script] };
}
test('one authenticated worker preserves durable result and releases owned guard', async t => {
  const { ctx, bin } = await fixture(t);
  const first = run(ctx, bin);
  while (!existsSync(ctx.lock)) await new Promise(r => setTimeout(r, 10));
  const second = await run(ctx, bin);
  assert.ok(['running', 'recovery_required'].includes(second.status));
  const result = await first;
  assert.equal(result.status, 'goal_complete');
  assert.equal(result.source, 'worker_self_report');
  assert.equal(result.sessionId, 'ses_test');
  assert.equal(existsSync(ctx.lock), false);
  assert.equal(JSON.parse(await readFile(path.join(ctx.state, 'last.json'))).summary, 'Fake verified result');
});
test('session permission failure never sends worker prompt', async t => {
  const { ctx, bin } = await fixture(t, 'denied');
  const result = await run(ctx, bin);
  assert.equal(result.status, 'blocked');
  assert.equal(existsSync(path.join(ctx.root, 'prompt-sent')), false);
  assert.equal(existsSync(path.join(ctx.state, 'paused')), true);
});
test('server crash fails promptly and retains session id', async t => {
  const { ctx, bin } = await fixture(t, 'crash');
  const result = await run(ctx, bin);
  assert.equal(result.status, 'failed');
  assert.equal(result.sessionId, 'ses_test');
  assert.equal(existsSync(ctx.lock), false);
});
test('completion pauses and a stale unknown guard is never reclaimed', async t => {
  const { ctx, bin } = await fixture(t, 'complete');
  assert.equal((await run(ctx, bin)).status, 'implementation_complete');
  assert.equal((await run(ctx, bin)).status, 'paused');
  await rm(path.join(ctx.state, 'paused'));
  await mkdir(ctx.lock);
  assert.equal((await run(ctx, bin)).status, 'recovery_required');
  assert.equal(existsSync(ctx.lock), true);
});
