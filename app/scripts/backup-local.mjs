import pg from'pg';import{randomUUID,createHash}from'node:crypto';import{createReadStream}from'node:fs';
import{mkdir,readFile,writeFile,readdir,copyFile,rename,lstat,realpath,rm}from'node:fs/promises';import{join,resolve,basename,sep}from'node:path';import{spawn}from'node:child_process';
import{config,pgOptions,root}from'./config.mjs';import{backupId,assetName,ownedChild,quoteIdentifier,literal,localBackupEnvironment,backupManifest,canonicalSchemaSql}from'./backup-domain.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex'),toolRoot=join(root,'.tools/postgresql17-client');
export async function fileDigest(path){const st=await lstat(path);if(!st.isFile()||st.isSymbolicLink())throw Error('备份文件必须是实际文件，不接受链接或目录。');const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return{size:st.size,sha256:hash.digest('hex')};}
async function ownedDirectory(path){await mkdir(path,{recursive:true});const expected=resolve(root)+sep,actual=await realpath(path);if(!actual.startsWith(expected))throw Error('本机备份目录必须位于本项目中，不接受外部链接。');return actual;}
export async function backupTools(){const m=JSON.parse((await readFile(join(toolRoot,'toolchain.json'),'utf8')).replace(/^\uFEFF/,''));if(m.archiveSha256!=='80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f'||m.source!=='https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64-binaries.zip')throw Error('备份客户端来源未核对。');for(const f of m.files){assetName(f.name);if((await fileDigest(join(toolRoot,f.name))).sha256!==f.sha256)throw Error('备份客户端文件校验失败。');}for(const name of['pg_dump.exe','pg_restore.exe'])if(!m.files.some(f=>f.name===name))throw Error('备份客户端不完整。');return{dump:join(toolRoot,'pg_dump.exe'),restore:join(toolRoot,'pg_restore.exe')};}
export async function postgresTool(executable,args,env){await new Promise((yes,no)=>{
 const p=spawn(executable,args,{windowsHide:true,shell:false,stdio:['ignore','ignore','pipe'],env:{...process.env,PGPASSWORD:env.PGPASSWORD,PGCONNECT_TIMEOUT:'10',PGCLIENTENCODING:'UTF8'}});let failed=false,timed=false,errors='';
 const timer=setTimeout(()=>{timed=true;p.kill();},120000);p.stderr.on('data',b=>{if(errors.length<20000)errors+=b.toString();});p.on('error',()=>{failed=true;clearTimeout(timer);no(Error('无法启动已校验的PostgreSQL备份客户端。'));});p.on('close',code=>{clearTimeout(timer);if(failed)return;if(timed||code!==0)no(Error(timed?'备份工具超时，未判为成功。':'PostgreSQL备份工具失败，未判为成功。'));else yes();});
 });}
const connection=e=>['--host',e.PGHOST,'--port',String(e.PGPORT),'--username',e.PGUSER,'--no-password'];
export async function backupSnapshot(c){
 await c.query("SET LOCAL TIME ZONE 'UTC'; SET LOCAL DateStyle='ISO,YMD'; SET LOCAL bytea_output='hex'; SET LOCAL search_path=pg_catalog");
 const tables={},list=(await c.query("SELECT table_schema s,table_name n FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema !~ '^pg_' AND table_schema <> 'information_schema' ORDER BY table_schema,table_name")).rows;
 for(const t of list){const name=t.s+'.'+t.n;if(!/^\w+\.\w+$/.test(name))throw Error('本项目备份暂不支持特殊命名表。');const rows=(await c.query(`SELECT to_jsonb(t)::text data FROM ${quoteIdentifier(t.s)}.${quoteIdentifier(t.n)} t ORDER BY data`)).rows.map(x=>x.data);tables[name]={rows:rows.length,sha256:digest(JSON.stringify(rows))};}
 const schema={};
 for(const[k,q]of Object.entries({
  columns:"SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,is_nullable,column_default,is_identity,identity_generation,is_generated,generation_expression,collation_name FROM information_schema.columns WHERE table_schema !~ '^pg_' AND table_schema <> 'information_schema' ORDER BY table_schema,table_name,ordinal_position",
  constraints:"SELECT n.nspname schema,t.relname name,c.conname,c.contype,c.convalidated,c.condeferrable,c.condeferred,pg_get_constraintdef(c.oid,true) definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' ORDER BY n.nspname,t.relname,c.conname",
  indexes:"SELECT n.nspname schema,c.relname name,pg_get_indexdef(c.oid) definition FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='i' AND n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' ORDER BY n.nspname,c.relname",
  triggers:"SELECT n.nspname schema,c.relname name,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,true) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' ORDER BY n.nspname,c.relname,t.tgname",
  functions:"SELECT n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) args,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prokind IN('f','p') AND n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)",
  views:"SELECT n.nspname schema,c.relname name,pg_get_viewdef(c.oid,true) definition FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('v','m') AND n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' ORDER BY n.nspname,c.relname",
  sequences:"SELECT schemaname,sequencename,data_type::text,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value FROM pg_sequences WHERE schemaname !~ '^pg_' AND schemaname <> 'information_schema' ORDER BY schemaname,sequencename"
 }))schema[k]=(await c.query(q)).rows;
 const migrations=(await c.query('SELECT name,sha256 FROM adc_meta.migration ORDER BY name')).rows;
 const canonical={...schema,constraints:schema.constraints.map(x=>({...x,definition:canonicalSchemaSql(x.definition)})),indexes:schema.indexes.map(x=>({...x,definition:canonicalSchemaSql(x.definition)}))};
 return{tables,schema,schemaSha256:digest(JSON.stringify(canonical)),migrations};
}
export async function createLocalBackup({env,afterSnapshot}={}){
 env=env||await config();localBackupEnvironment(env);const tools=await backupTools(),base=await ownedDirectory(join(root,'.runtime/backups')),id='backup-'+new Date().toISOString().replace(/[-:.]/g,'')+'-'+randomUUID().slice(0,8),staging=ownedChild(base,'.pending-'+id),destination=ownedChild(base,id);await mkdir(staging,{recursive:false});await mkdir(join(staging,'private-files'));
 const c=new pg.Client(pgOptions(env));await c.connect();let committed=false;
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const server=(await c.query("SELECT current_setting('server_version') version,(current_setting('server_version_num')::int/10000)::int major,datname database,pg_encoding_to_char(encoding) encoding,datcollate collate,datctype ctype,datlocprovider \"localeProvider\" FROM pg_database WHERE datname=current_database()")).rows[0];
  if(server.major!==17||server.encoding!=='UTF8'||server.localeProvider!=='c')throw Error('当前工具仅验证PostgreSQL17、UTF8及项目C语言环境。');
  const snapshot=(await c.query('SELECT pg_export_snapshot() snapshot')).rows[0].snapshot,asOf=(await c.query('SELECT transaction_timestamp() at')).rows[0].at.toISOString(),state=await backupSnapshot(c);
  for(const m of state.migrations){if(!/^\d{3}_[a-z0-9_]+\.sql$/.test(m.name)||digest(await readFile(join(root,'database/migrations',m.name)))!==m.sha256)throw Error('原库迁移与工程文件不一致，未发布备份。');}
  const files=(await c.query('SELECT storage_key key,byte_size::text size,content_digest sha256 FROM adc.file_asset ORDER BY storage_key')).rows,assets=[];
  if(afterSnapshot)await afterSnapshot();
  await postgresTool(tools.dump,[...connection(env),'--dbname',env.PGDATABASE,'--format=custom','--no-owner','--no-privileges','--snapshot',snapshot,'--file',join(staging,'database.dump')],env);
  const sourceRoot=await realpath(join(root,'.runtime/private-files')).catch(e=>{if(e.code==='ENOENT'&&!files.length)return join(root,'.runtime/private-files');throw e;});if(files.length&&!sourceRoot.startsWith(resolve(root)+sep))throw Error('私有附件目录不在本项目内。');
  for(const f of files){assetName(f.key);const expected={size:Number(f.size),sha256:f.sha256},source=ownedChild(sourceRoot,f.key),target=ownedChild(join(staging,'private-files'),f.key);if(JSON.stringify(await fileDigest(source))!==JSON.stringify(expected))throw Error('原引用附件缺失或损坏，未发布备份。');await copyFile(source,target);if(JSON.stringify(await fileDigest(target))!==JSON.stringify(expected))throw Error('附件复制校验失败，未发布备份。');assets.push({key:f.key,...expected});}
  const manifest={format:'adc-local-backup-v1',stage:'complete',id,createdAt:new Date().toISOString(),asOf,server,...state,dump:await fileDigest(join(staging,'database.dump')),assets,scope:'local same-major logical backup; no cluster roles, .env, or external configuration; private contents must stay local'};backupManifest(manifest,id);
  await writeFile(join(staging,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});await writeFile(join(staging,'manifest.sha256'),digest(await readFile(join(staging,'manifest.json')))+'\n',{flag:'wx'});
  await c.query('COMMIT');committed=true;await rename(staging,destination);return{id,path:destination,tables:Object.keys(state.tables).length,assets:assets.length,asOf};
 }finally{if(!committed)await c.query('ROLLBACK').catch(()=>{});await c.end();}
}
export async function loadLocalBackup(id){
 id=backupId(id);const base=await realpath(join(root,'.runtime/backups'));if(!base.startsWith(resolve(root)+sep))throw Error('备份目录位于项目之外。');const path=ownedChild(base,id);if((await lstat(path)).isSymbolicLink())throw Error('不接受链接备份目录。');
 const manifestPath=join(path,'manifest.json'),checksumPath=join(path,'manifest.sha256');if((await fileDigest(manifestPath)).size>10*1024*1024||(await fileDigest(checksumPath)).size>100)throw Error('备份清单或校验文件过大。');const raw=await readFile(manifestPath);if(digest(raw)!==(await readFile(checksumPath,'utf8')).trim())throw Error('备份清单摘要不匹配。');
 const m=backupManifest(JSON.parse(raw),id);if(JSON.stringify(await fileDigest(join(path,'database.dump')))!==JSON.stringify(m.dump))throw Error('数据库备份缺失或摘要不匹配。');
 const assetDir=join(path,'private-files');if((await lstat(assetDir)).isSymbolicLink())throw Error('不接受链接附件目录。');
 for(const a of m.assets){const meta=await fileDigest(ownedChild(assetDir,a.key));if(meta.size!==a.size||meta.sha256!==a.sha256)throw Error('备份附件缺失或摘要不匹配。');}
 return{path,manifest:m};
}
export async function verifyLocalBackup(id,{env}={}){
 env=env||await config();localBackupEnvironment(env);const b=await loadLocalBackup(id),tools=await backupTools(),m=b.manifest,admin=new pg.Client(pgOptions(env,'postgres'));await admin.connect();
 const name='adc_restore_test_'+Date.now()+'_'+randomUUID().slice(0,8),base=await ownedDirectory(join(root,'.runtime/recovery')),dir=ownedChild(base,name);let owned=false;
 if(!/^adc_restore_test_\d+_[a-f0-9]{8}$/.test(name)||name===env.PGDATABASE)throw Error('恢复目标必须是本次随机临时库。');
 try{
  const major=Number((await admin.query('SHOW server_version_num')).rows[0].server_version_num)/10000|0;if(major!==m.server.major)throw Error('恢复演练要求同PostgreSQL大版本。');
  await admin.query(`CREATE DATABASE ${quoteIdentifier(name)} TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE ${literal(m.server.collate)} LC_CTYPE ${literal(m.server.ctype)}`);owned=true;await mkdir(dir);await mkdir(join(dir,'private-files'));
  await postgresTool(tools.restore,[...connection(env),'--dbname',name,'--no-owner','--no-privileges','--exit-on-error','--single-transaction',join(b.path,'database.dump')],env);
  const c=new pg.Client(pgOptions(env,name));await c.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const restored=await backupSnapshot(c);await c.query('COMMIT');
   if(JSON.stringify(restored.tables)!==JSON.stringify(m.tables))throw Error('恢复后的完整表摘要不一致：'+[...new Set([...Object.keys(restored.tables),...Object.keys(m.tables)])].filter(k=>JSON.stringify(restored.tables[k])!==JSON.stringify(m.tables[k])).join(','));
   if(restored.schemaSha256!==m.schemaSha256){
    if(process.env.ADC_BACKUP_DIAGNOSTICS==='true')await writeFile(join(root,'artifacts/203-schema-diff.json'),JSON.stringify(Object.fromEntries(Object.keys(restored.schema).filter(k=>JSON.stringify(restored.schema[k])!==JSON.stringify(m.schema?.[k])).map(k=>[k,{expected:m.schema?.[k],restored:restored.schema[k]}])),null,2));
    throw Error('恢复后的结构摘要不一致。');
   }
   if(JSON.stringify(restored.migrations)!==JSON.stringify(m.migrations))throw Error('恢复后的迁移摘要不一致。');
  }finally{await c.end();}
  for(const a of m.assets){const target=ownedChild(join(dir,'private-files'),a.key);await copyFile(ownedChild(join(b.path,'private-files'),a.key),target);const meta=await fileDigest(target);if(meta.size!==a.size||meta.sha256!==a.sha256)throw Error('恢复附件校验失败。');}
  return{backupId:id,verified:true,tableCount:Object.keys(m.tables).length,assetCount:m.assets.length,schemaVerified:true,migrationsVerified:true,filesRestoredVerified:true,temporaryDatabase:name,temporaryTargetRemoved:true,originalDatabaseOverwritten:false,checkedAt:new Date().toISOString()};
 }finally{
  try{if(owned){await admin.query(`DROP DATABASE ${quoteIdentifier(name)} WITH (FORCE)`);const safe=ownedChild(base,name),actual=await realpath(safe).catch(()=>null);if(actual){if(!actual.startsWith(base+sep))throw Error('拒绝清理项目外恢复目录。');await rm(safe,{recursive:true,force:true});}}}finally{await admin.end();}
 }
}
async function backupCli(){
 try{const mode=process.argv[2],args=process.argv.slice(3);if(mode==='create'&&!args.length)console.log(JSON.stringify(await createLocalBackup(),null,2));else if(mode==='verify'&&args.length===1)console.log(JSON.stringify(await verifyLocalBackup(args[0]),null,2));else if(mode==='list'&&!args.length){const base=join(root,'.runtime/backups');console.log((await readdir(base).catch(()=>[])).filter(n=>{try{return!!backupId(n);}catch{return false;}}).sort().join('\n')||'尚无已发布备份。');}else throw Error('用法：npm run backup:create / backup:list / backup:verify -- <备份ID>');}catch(e){console.error(e.message);process.exitCode=1;}
}
if(process.argv[1]?.endsWith('backup-local.mjs'))void backupCli();
