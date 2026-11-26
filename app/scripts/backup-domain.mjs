import{resolve,sep,isAbsolute}from'node:path';
export const backupIdPattern=/^backup-\d{8}T\d{9}Z-[a-f0-9]{8}$/;
export function backupId(value){if(typeof value!=='string'||!backupIdPattern.test(value))throw Error('备份ID无效；只接受本机备份清单中的ID。');return value;}
export function assetName(value){if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(value)||value.includes('..'))throw Error('附件存储名无效，不能越出私有附件目录。');return value;}
export function ownedChild(base,name){if(typeof name!=='string'||isAbsolute(name))throw Error('禁止绝对路径');const parent=resolve(base),child=resolve(parent,name);if(!child.startsWith(parent+sep))throw Error('路径越出指定目录');return child;}
export const quoteIdentifier=s=>'"'+String(s).replaceAll('"','""')+'"';
export const literal=s=>"'"+String(s).replaceAll("'","''")+"'";
// PostgreSQL reparses ARRAY[varchar constants]::text[] during pg_restore as
// ARRAY[varchar constant::text,...]. Normalize only this exact constant coercion;
// preserve every literal, operator, name, constraint flag and other SQL token.
export function canonicalSchemaSql(sql){
 const t=String(sql).match(/'(?:''|[^'])*'|"(?:""|[^"])*"|::|[A-Za-z_][A-Za-z_0-9$]*|\d+(?:\.\d+)?|[^\s]/g)||[];
 const member=x=>{
  const text=x.join(' '),plain=text.match(/^('(?:''|[^'])*') :: character varying$/),a=text.match(/^('(?:''|[^'])*') :: character varying :: text$/),b=text.match(/^\( ('(?:''|[^'])*') :: character varying \) :: text$/);
  return plain?{value:plain[1],text:false}:a||b?{value:(a||b)[1],text:true}:null;};
 const out=[];for(let i=0;i<t.length;){const wrapped=t[i]==='('&&t[i+1]==='ARRAY',start=wrapped?i+1:i;
  if(t[start]==='ARRAY'&&t[start+1]==='['){const end=t.indexOf(']',start+2);if(end>=0){
   if(wrapped&&(t[end+1]!==')'||t.slice(end+2,end+6).join(' ')!==':: text [ ]')){out.push(t[i++]);continue;}
   const parts=[];let at=start+2;for(let j=at;j<=end;j++)if(j===end||t[j]===','){parts.push(member(t.slice(at,j)));at=j+1;}
   const tail=wrapped&&t[end+1]===')'?end+2:end+1,aggregate=t.slice(tail,tail+4).join(' ')===':: text [ ]';
   if(parts.length&&parts.every(Boolean)&&((aggregate&&parts.every(x=>!x.text))||(!wrapped&&!aggregate&&parts.every(x=>x.text)))){
    out.push('ARRAY','[');parts.forEach((x,n)=>{if(n)out.push(',');out.push(x.value,'::','text');});out.push(']');i=aggregate?tail+4:end+1;continue;
   }
  }}out.push(t[i++]);}
 return out.join(' ');
}
export function localBackupEnvironment(e){if(!['127.0.0.1','localhost'].includes(e.PGHOST)||!/^\d+$/.test(String(e.PGPORT))||Number(e.PGPORT)<1||Number(e.PGPORT)>65535||!/^[a-z][a-z0-9_]{0,62}$/.test(e.PGDATABASE||''))throw Error('备份工具只支持配置中明确的本机数据库。');}
const fileMeta=m=>m&&Number.isSafeInteger(m.size)&&m.size>=0&&/^[a-f0-9]{64}$/.test(m.sha256);
export function backupManifest(m,id){
 if(!m||m.format!=='adc-local-backup-v1'||m.id!==backupId(id)||m.stage!=='complete'||m.server?.major!==17||m.server.encoding!=='UTF8'||m.server.localeProvider!=='c'||typeof m.server.collate!=='string'||typeof m.server.ctype!=='string'||!fileMeta(m.dump)||!m.dump.size||!/^[a-f0-9]{64}$/.test(m.schemaSha256)||!m.tables||typeof m.tables!=='object'||Array.isArray(m.tables)||!Array.isArray(m.assets)||!Array.isArray(m.migrations))throw Error('备份清单不完整或版本不兼容。');
 const names=Object.keys(m.tables);if(!names.length||names.some(n=>!/^\w+\.\w+$/.test(n)||!Number.isSafeInteger(m.tables[n]?.rows)||m.tables[n].rows<0||!/^[a-f0-9]{64}$/.test(m.tables[n].sha256)))throw Error('备份表清单无效。');
 const seen=new Set();for(const a of m.assets){assetName(a.key);if(!fileMeta(a)||seen.has(a.key))throw Error('附件清单无效或重复。');seen.add(a.key);}
 for(const row of m.migrations)if(!/^\d{3}_[a-z0-9_]+\.sql$/.test(row.name)||!/^[a-f0-9]{64}$/.test(row.sha256))throw Error('迁移清单无效。');return m;
}
