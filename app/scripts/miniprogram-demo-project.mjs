import {readFile,writeFile,mkdir,readdir,lstat} from 'node:fs/promises';
import {resolve,join,dirname,sep} from 'node:path';
export function demoArgs(args) {
 const result={check:false,appid:'touristappid'};
 for(let i=0;i<args.length;i++){
  if(args[i]==='--check'&&!result.check)result.check=true;
  else if(args[i]==='--appid'&&result.appid==='touristappid'&&/^wx[a-f0-9]{16}$/.test(args[i+1]||''))result.appid=args[++i];
  else throw Error('仅支持 --check 及 --appid wx开头的小程序AppID。');
 }
 return result;
}
export function demoPaths(root,name){
 if(!/^adc_miniprogram_demo_test_\d+$/.test(name))throw Error('无效演示库名称。');
 const runtime=resolve(root,'.runtime'),folder=resolve(runtime,name);
 if(!folder.startsWith(runtime+sep))throw Error('演示目录越界。');
 return {folder,project:join(folder,'miniprogram')};
}
export async function prepareDemoProject(root,name,apiBase,appid='touristappid'){
 const url=new URL(apiBase);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/api/v1'||!url.port||url.username||url.password||url.search||url.hash)throw Error('演示接口只允许本机临时端口。');
 if(appid!=='touristappid'&&!/^wx[a-f0-9]{16}$/.test(appid))throw Error('AppID格式无效。');
 const paths=demoPaths(root,name),source=join(root,'apps/miniprogram'),app=JSON.parse(await readFile(join(source,'app.json'),'utf8'));
 const files=['app.js','app.json','app.wxss','project.config.json'];
 for(const optional of ['assets/patient-welcome.jpg','sitemap.json']){
  try{if(!(await lstat(join(source,optional))).isFile())throw Error('不是普通源文件。');files.push(optional);}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 for(const entry of await readdir(join(source,'lib'),{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith('.js'))files.push('lib/'+entry.name);
 for(const page of app.pages){
  if(typeof page!=='string'||!/^pages\/[a-z-]+\/index$/.test(page))throw Error('演示页面路径无效。');
  for(const ext of ['.js','.json','.wxml','.wxss']){const file=join(source,page+ext);try{if(!(await lstat(file)).isFile())throw Error('不是普通源文件。');files.push(page+ext);}catch(e){if(e.code!=='ENOENT'||ext==='.js'||ext==='.wxml')throw e;}}
 }
 await mkdir(paths.folder,{recursive:true});await mkdir(paths.project);
 for(const f of files){const file=join(source,f);if(!(await lstat(file)).isFile())throw Error('不能复制链接或非源文件。');await mkdir(dirname(join(paths.project,f)),{recursive:true});await writeFile(join(paths.project,f),await readFile(file),{flag:'wx'});}
 await writeFile(join(paths.project,'app.js'),`App({ globalData: { apiBaseUrl: ${JSON.stringify(apiBase)}, localBookingEnabled: true } });\n`);
 const project=JSON.parse(await readFile(join(paths.project,'project.config.json'),'utf8'));project.appid=appid;project.projectname='adc-isolated-mini-demo';project.description='ADC本机合成临时联调，非微信身份认证或上线环境';delete project.cloudfunctionRoot;await writeFile(join(paths.project,'project.config.json'),JSON.stringify(project,null,2)+'\n');
 return {...paths,files:files.length};
}
