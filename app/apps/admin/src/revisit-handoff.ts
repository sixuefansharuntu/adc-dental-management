export type RevisitHint={version:1;clinicId:string;followupId:string;patientName:string;contact:string;doctorName:string};
const prefix='ADC-REVISIT/1\n',uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function revisitHint(value:unknown):RevisitHint{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('协作信息格式不正确。');
 const v=value as Record<string,unknown>,keys=['version','clinicId','followupId','patientName','contact','doctorName'];
 if(Object.keys(v).length!==keys.length||Object.keys(v).some(k=>!keys.includes(k))||v.version!==1)throw Error('协作信息版本或字段不正确。');
 for(const k of ['clinicId','followupId'])if(typeof v[k]!=='string'||!uuid.test(v[k] as string))throw Error('协作编号不正确。');
 for(const [k,max,required] of [['patientName',100,true],['contact',40,false],['doctorName',100,true]] as const){const s=v[k];if(typeof s!=='string'||s.length>max||required&&!s.trim()||/[\u0000-\u001f\u007f]/.test(s))throw Error('姓名或联系线索格式不正确。');}
 return{version:1,clinicId:(v.clinicId as string).toLowerCase(),followupId:(v.followupId as string).toLowerCase(),patientName:v.patientName as string,contact:v.contact as string,doctorName:v.doctorName as string};
}
export function encodeRevisitHint(value:unknown){return prefix+JSON.stringify(revisitHint(value));}
export function decodeRevisitHint(raw:string){if(typeof raw!=='string'||raw.length>2000||!raw.startsWith(prefix))throw Error('请粘贴完整的复诊协作信息（ADC-REVISIT/1）。');try{return revisitHint(JSON.parse(raw.slice(prefix.length)));}catch{throw Error('协作信息不完整或格式不正确，请重新核对。');}}
