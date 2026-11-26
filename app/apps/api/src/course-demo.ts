import{readFileSync,lstatSync}from'node:fs';import{isAbsolute}from'node:path';import{createHash}from'node:crypto';import{ForbiddenException,ServiceUnavailableException}from'@nestjs/common';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export type DemoIdentity={identityId:string;subjectId:string;loginName:string;verifierSha256:string};
export type DemoManifest={schemaVersion:1;purpose:'teacher-demo';database:'adc_course_demo';datasetId:string;createdAt:string;identities:DemoIdentity[]};
const exact=(v:any,keys:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys.sort().join();
export const demoDigest=(v:string)=>createHash('sha256').update(v).digest('hex');
export function demoManifest(v:any):DemoManifest{
 if(!exact(v,['schemaVersion','purpose','database','datasetId','createdAt','identities'])||v.schemaVersion!==1||v.purpose!=='teacher-demo'||v.database!=='adc_course_demo'||!uuid.test(v.datasetId)||typeof v.createdAt!=='string'||!Number.isFinite(Date.parse(v.createdAt))||!Array.isArray(v.identities)||v.identities.length!==2)throw Error('课程环境清单无效。');
 const identities:DemoIdentity[]=v.identities.map((x:any)=>{if(!exact(x,['identityId','subjectId','loginName','verifierSha256'])||!uuid.test(x.identityId)||!uuid.test(x.subjectId)||!['alice','bob'].includes(x.loginName)||!(/^[a-f0-9]{64}$/).test(x.verifierSha256))throw Error('课程身份清单无效。');return{identityId:x.identityId,subjectId:x.subjectId,loginName:x.loginName,verifierSha256:x.verifierSha256};}).sort((a:DemoIdentity,b:DemoIdentity)=>a.loginName.localeCompare(b.loginName,'en'));
 for(const field of['identityId','subjectId','loginName']as const)if(new Set(identities.map(x=>x[field])).size!==2)throw Error('课程身份重复。');
 return{schemaVersion:1,purpose:'teacher-demo',database:'adc_course_demo',datasetId:v.datasetId,createdAt:v.createdAt,identities};
}
export const manifestDigest=(v:DemoManifest)=>demoDigest(JSON.stringify(demoManifest(v)));
// Credential changes append a chain rooted in the unchanged private manifest or enrollment.
export function currentCourseVerifier(root:string,changes:any[],binding:{datasetId:string;identityId:string;subjectId:string;loginName:string}){
 let current=root;if(changes.length>500||changes.some(p=>!p||!Number.isSafeInteger(p.credentialVersion)))return null;
 const ordered=[...changes].sort((a,b)=>a.credentialVersion-b.credentialVersion);
 for(let i=0;i<ordered.length;i++){const p=ordered[i];if(p?.schemaVersion!==1||p.syntheticOnly!==true||p.credentialVersion!==i+1||Object.entries(binding).some(([k,v])=>p[k]!==v)||p.fromVerifierSha256!==current||!(/^[a-f0-9]{64}$/).test(p.toVerifierSha256)||p.toVerifierSha256===current)return null;current=p.toVerifierSha256;}
 return current;
}
export class CourseDemoGate{
 readonly manifest:DemoManifest|null;
 readonly registrationEnabled:boolean;
 constructor(private pool:any,env:NodeJS.ProcessEnv=process.env){
  if(env.ADC_COURSE_REGISTRATION_ENABLED!==undefined&&!['true','false'].includes(env.ADC_COURSE_REGISTRATION_ENABLED))throw Error('课程注册开关无效。');
  this.registrationEnabled=env.ADC_COURSE_REGISTRATION_ENABLED==='true';
  if(env.ADC_COURSE_DEMO_ENABLED===undefined||env.ADC_COURSE_DEMO_ENABLED==='false'){if(this.registrationEnabled)throw Error('自助注册仅支持专用课程演示环境。');this.manifest=null;return;}
  if(env.ADC_COURSE_DEMO_ENABLED!=='true'||env.NODE_ENV!=='production'||env.ADC_DEPLOYMENT_PURPOSE!=='teacher-demo'||env.PGDATABASE!=='adc_course_demo'||env.ADC_LOCAL_IDENTITY_ENABLED!=='false'||env.ADC_MINIPROGRAM_LOCAL_ENABLED!=='false')throw Error('课程身份仅支持明确的独立生产模式演示环境。');
  const file=env.ADC_COURSE_DEMO_MANIFEST_FILE;if(!file||!isAbsolute(file))throw Error('课程清单必须来自明确私有文件。');const st=lstatSync(file);if(!st.isFile()||st.isSymbolicLink()||st.size>8192)throw Error('课程清单文件无效。');this.manifest=demoManifest(JSON.parse(readFileSync(file,'utf8')));
 }
 get enabled(){return this.manifest!==null;}
 async assertEnvironment(client:any=this.pool){
  if(!this.manifest)return;const m=this.manifest;
  const rows=(await client.query("SELECT current_database() AS database,after_content FROM adc.business_operation WHERE operation_id=$1 AND action_code='course.demo.initialize' AND subject_kind='course_environment' AND subject_key=$2",[m.datasetId,m.datasetId])).rows;
  if(rows.length!==1||rows[0].database!==m.database||rows[0].after_content?.manifestSha256!==manifestDigest(m)||rows[0].after_content?.syntheticOnly!==true)throw new ServiceUnavailableException('课程环境凭据不匹配，请由配置人员核对。');
 }
 identityAllowed(row:{identityId:string;subjectId:string;loginName:string;verifier:string;key:string}){
  const m=this.manifest;if(!m)return false;const expected=m.identities.find(x=>x.identityId===row.identityId&&x.subjectId===row.subjectId&&x.loginName===row.loginName);return !!expected&&expected.verifierSha256===demoDigest(row.verifier)&&row.key===`course:${m.datasetId}:${row.identityId}`;
 }
 requireIdentity(row:{identityId:string;subjectId:string;loginName:string;verifier:string;key:string}){if(!this.identityAllowed(row))throw new ForbiddenException('该身份不属于本次合成演示。');}
 async allowsIdentity(row:{identityId:string;subjectId:string;loginName:string;verifier:string;key:string;patientId?:string|null},client:any=this.pool){
  if(!this.manifest)return false;
  const seed=this.manifest.identities.find(x=>x.identityId===row.identityId&&x.subjectId===row.subjectId&&x.loginName===row.loginName);
  let root:string|undefined;
  if(seed&&row.key===`course:${this.manifest.datasetId}:${row.identityId}`)root=seed.verifierSha256;
  else{
  const prefix=`course-registration:${this.manifest.datasetId}:`;
  if(!row.key?.startsWith(prefix)||!uuid.test(row.key.slice(prefix.length)))return false;
  const record=(await client.query("SELECT after_content FROM adc.business_operation WHERE operation_id=$1 AND action_code='course.patient.register' AND subject_kind='course_patient_identity' AND subject_key=$2 AND patient_actor_id=$3",[row.key.slice(prefix.length),row.identityId,row.subjectId])).rows[0]?.after_content;
  if(record?.schemaVersion!==1||record.syntheticOnly!==true||record.datasetId!==this.manifest.datasetId||record.identityId!==row.identityId||record.subjectId!==row.subjectId||record.loginName!==row.loginName)return false;
  root=record.verifierSha256;
  }
  if(!root||!(/^[a-f0-9]{64}$/).test(root))return false;
  const changes=(await client.query("SELECT after_content FROM adc.business_operation WHERE action_code='course.patient.password' AND subject_kind='course_patient_identity' AND subject_key=$1 AND patient_actor_id=$2 ORDER BY occurred_at,operation_id LIMIT 501",[row.identityId,row.subjectId])).rows.map((x:any)=>x.after_content);
  return currentCourseVerifier(root,changes,{datasetId:this.manifest.datasetId,identityId:row.identityId,subjectId:row.subjectId,loginName:row.loginName})===demoDigest(row.verifier);
 }
}
