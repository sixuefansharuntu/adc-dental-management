import {BadRequestException} from '@nestjs/common';
export type ClinicalHistoryKind='record'|'treatment'|'bill';
export interface ClinicalHistoryQuery {kind:ClinicalHistoryKind;treatmentId?:string;beforeVersion?:number;limit:number;}
export function historyNumber(value:unknown,label:string,max=Number.MAX_SAFE_INTEGER):number|undefined{
 if(value===undefined)return undefined;
 if(typeof value!=='string'||!/^\d+$/.test(value))throw new BadRequestException(label+'无效。');
 const n=Number(value);if(!Number.isSafeInteger(n)||n<1||n>max)throw new BadRequestException(label+'无效。');return n;
}
export function historyKind(value:unknown):ClinicalHistoryKind{
 if(value!=='record'&&value!=='treatment'&&value!=='bill')throw new BadRequestException('原版类别无效。');return value;
}
