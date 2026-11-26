import{BadRequestException}from'@nestjs/common';import{uuidInput}from'./domain';
export interface IdentitySearchQuery{clinicId:string;query:string;kind:'all'|'patients'|'subjects';limit:number;cursor:string|null;}
export function identitySearchQuery(input:Record<string,unknown>):IdentitySearchQuery{
 if(Object.keys(input).some(k=>!['clinicId','q','kind','limit','cursor'].includes(k)))throw new BadRequestException('包含不支持的身份检索条件。');
 const clinicId=uuidInput(input.clinicId),query=input.q;if(typeof query!=='string'||query.trim().length<2||query.trim().length>100||/[\u0000-\u001f\u007f]/.test(query))throw new BadRequestException('请输入2至100字的姓名或电话线索。');
 const kind=input.kind??'all';if(typeof kind!=='string'||!['all','patients','subjects'].includes(kind))throw new BadRequestException('身份目录类别无效。');let limit=20;
 if(input.limit!==undefined){if(typeof input.limit!=='string'||!/^\d+$/.test(input.limit)||Number(input.limit)<1||Number(input.limit)>50)throw new BadRequestException('每页须为1至50项。');limit=Number(input.limit);}
 const cursor=input.cursor===undefined?null:input.cursor;if(cursor!==null&&(kind==='all'||typeof cursor!=='string'||!cursor||cursor.length>3000))throw new BadRequestException('续页须指定目录类别及有效翻页标识。');return{clinicId,query:query.trim(),kind:kind as IdentitySearchQuery['kind'],limit,cursor:cursor as string|null};
}
export const patientClinicRelation=(alias='p')=>`(${alias}.created_clinic_id=ANY($2::uuid[]) OR EXISTS(SELECT 1 FROM adc.visit v WHERE v.patient_id=${alias}.patient_id AND v.clinic_id=ANY($2::uuid[])) OR EXISTS(SELECT 1 FROM adc.appointment x WHERE x.patient_id=${alias}.patient_id AND x.clinic_id=ANY($2::uuid[])))`;
