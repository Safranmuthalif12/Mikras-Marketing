import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=fileURLToPath(new URL("..",import.meta.url));

async function readBuildTree(directory){
  const entries=await readdir(directory,{withFileTypes:true});
  const parts=await Promise.all(entries.map(async entry=>{
    const target=path.join(directory,entry.name);
    if(entry.isDirectory())return readBuildTree(target);
    return /\.(?:js|json|html|css)$/.test(entry.name)?readFile(target,"utf8"):"";
  }));
  return parts.join("\n");
}

test("builds the complete MIKRAS production artifact",async()=>{
  const output=await readBuildTree(path.join(root,"dist"));
  assert.match(output,/MIKRAS Marketing/);
  assert.match(output,/Scale your brand/);
  assert.match(output,/admin\/forgot-password/);
  assert.match(output,/api\/contact/);
  assert.match(output,/mikras_admin_session/);
  assert.match(output,/Facebook URL/);
  assert.match(output,/MIKRAS on TikTok/);
  assert.match(output,/grid-auto-flow:\s*column/);
});
