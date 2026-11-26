import {execFile,spawn} from 'node:child_process';
import {readFile,lstat,realpath} from 'node:fs/promises';
import {join,resolve,sep,basename,dirname} from 'node:path';
import {root} from './config.mjs';
import {clusterStartResult}from'./database-ready.mjs';

export function postgresEnvironment(source=process.env){
  // Preserve Windows DLL/OS lookup, without passing application or database secrets.
  const result=Object.fromEntries(Object.entries(source).filter(([k,v])=>v!==undefined&&!/^(ADC_|PG|DATABASE_URL$)/i.test(k)));
  return {...result,LC_MESSAGES:'C',LANG:'C'};
}
export function localPort(value){if(!/^\d+$/.test(String(value))||Number(value)<1||Number(value)>65535)throw Error('本机数据库端口无效。');return Number(value);}
export function startupMessage(error){return typeof error?.message==='string'&&error.message.trim()?error.message:'本机启动未成功；请检查数据库启动日志和端口，已有资料已保留。';}
export function postgresPackage(platform=process.platform,arch=process.arch){if(platform==='win32'&&arch==='x64')return '@embedded-postgres/windows-x64';if(platform==='darwin'&&['arm64','x64'].includes(arch)||platform==='linux'&&['arm64','arm','ia32','ppc64','x64'].includes(arch))return `@embedded-postgres/${platform}-${arch}`;throw Error('当前平台没有项目支持的PostgreSQL包。');}
export async function projectCluster(path){
  const base=resolve(root,'.runtime'),p=resolve(path),name=basename(p);
  if(dirname(p)!==base||!(name==='postgres'||/^adc_cluster_test_\d+_[a-f0-9]{8}$/.test(name)))throw Error('数据库目录必须是本项目已有目录或本次具名隔离目录。');
  for(const dir of[base,p]){if((await lstat(dir)).isSymbolicLink()||await realpath(dir)!==dir)throw Error('数据库目录不接受外部路径或链接。');}
  const marker=join(p,'PG_VERSION'),s=await lstat(marker);if(!s.isFile()||s.isSymbolicLink()||s.size>10)throw Error('数据库版本标记无效，不会初始化或覆盖。');
  const version=(await readFile(marker,'utf8')).trim();if(!/^\d+$/.test(version))throw Error('数据库版本标记无效，不会初始化或覆盖。');return{path:p,major:Number(version)};
}
export async function bundledPostgres(){
  const name=postgresPackage(),b=await import(name),base=await realpath(join(root,'node_modules',name));
  for(const key of['pg_ctl','postgres','initdb']){const p=await realpath(b[key]);if(!p.startsWith(base+sep)||(await lstat(p)).isSymbolicLink()||!(await lstat(p)).isFile())throw Error('项目原生PostgreSQL工具路径无效。');}
  return{control:b.pg_ctl,postgres:b.postgres,initdb:b.initdb};
}
export function postgresCommand(file,args,{backgroundStart=false}={}){
  if(backgroundStart)return new Promise(resolveResult=>{
    // A daemon must not retain this caller's capture pipes on Windows.
    const child=spawn(file,args,{windowsHide:true,shell:false,env:postgresEnvironment(),stdio:'ignore'});let done=false,timed=false;
    const finish=code=>{if(done)return;done=true;clearTimeout(timer);resolveResult({code,killed:timed,stdout:'',stderr:''});};
    const timer=setTimeout(()=>{timed=true;child.kill();},35000);child.once('error',()=>finish('spawn_failed'));child.once('exit',code=>finish(timed?'timeout':code));
  });
  return new Promise(resolveResult=>execFile(file,args,{windowsHide:true,shell:false,env:postgresEnvironment(),timeout:35000,maxBuffer:65536},(error,stdout,stderr)=>resolveResult({code:error?error.code:0,killed:!!error?.killed,stdout:String(stdout||''),stderr:String(stderr||'')})));
}
async function checkedCluster(path){const cluster=await projectCluster(path),tools=await bundledPostgres(),version=await postgresCommand(tools.postgres,['--version']);if(version.code!==0)throw Error('无法读取项目PostgreSQL版本；不会启动数据库。');const m=version.stdout.match(/PostgreSQL\) (\d+)\./);if(!m||Number(m[1])!==cluster.major)throw Error('数据库与项目PostgreSQL主版本不一致；不会升级或启动。');return{...cluster,...tools};}
export async function startExistingCluster(path,port){
  port=localPort(port);const c=await checkedCluster(path),status=await postgresCommand(c.control,['-D',c.path,'status']);
  if(status.code===0)return{started:false,path:c.path,port};
  if(status.code!==3)throw Error('无法核对本机数据库运行状态；不会删除PID或强制重启。');
  const log=await lstat(join(c.path,'server.log')).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(log&&(!log.isFile()||log.isSymbolicLink()))throw Error('数据库启动日志路径无效；不会覆盖目录或链接。');
  const result=await postgresCommand(c.control,['-D',c.path,'-l',join(c.path,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-t','20','-w','start'],{backgroundStart:true});
  // pg_ctl's wait can expire while this exact postmaster continues WAL recovery.
  const state=await clusterStartResult(result,async()=>(await postgresCommand(c.control,['-D',c.path,'status'])).code);
  return{started:true,path:c.path,port,...state};
}
export async function stopExistingCluster(path){
  const c=await checkedCluster(path),status=await postgresCommand(c.control,['-D',c.path,'status']);if(status.code===3)return{stopped:false};if(status.code!==0)throw Error('无法核对本机数据库状态；不会强制停止。');
  const result=await postgresCommand(c.control,['-D',c.path,'-m','fast','-t','20','-w','stop']);if(result.code!==0)throw Error('本机数据库未能正常停止；不会强杀或删除资料。');return{stopped:true};
}
