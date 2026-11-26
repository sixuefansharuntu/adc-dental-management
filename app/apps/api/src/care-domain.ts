import{BadRequestException,ConflictException}from'@nestjs/common';
import sharp from'sharp';import{createHash}from'node:crypto';
export const MAX_FILE=10*1024*1024;
export async function validateImage(bytes:Buffer){
 if(!bytes.length||bytes.length>MAX_FILE)throw new BadRequestException('请选择不超过10MiB的PNG/JPEG文件。');
 try{const image=sharp(bytes,{limitInputPixels:24000000,failOn:'warning'}),m=await image.metadata();if(!['png','jpeg'].includes(m.format||'')||(m.pages||1)>1)throw Error('Unsupported image');await image.raw().toBuffer();return{mediaType:m.format==='png'?'image/png':'image/jpeg',digest:createHash('sha256').update(bytes).digest('hex'),size:bytes.length};}catch{throw new BadRequestException('图片无法完整读取，或格式/像素超过本批范围；请重新选择PNG/JPEG。');}
}
export function labState(order:any,requirement:any,received:any,review:any,treatmentVersion:number){
 const adopted=Number(requirement?.adoptedTreatmentVersion);if(!requirement||adopted!==treatmentVersion)return'requirement_changed';
 if(!received||received.requirement_id!==requirement.requirement_id||received.direction!=='received'||received.matches_requirement!==true)return'awaiting_receipt';
 if(!order.has_open_usability_issue&&review?.is_usable===true&&review.requirement_id===requirement.requirement_id&&review.received_handover_id===received.handover_id)return'usable';
 return'awaiting_review';
}
export function assertStageTime(value:string,lower:Date,now:Date){const t=new Date(value);if(!Number.isFinite(+t)||t<lower||t>now)throw new ConflictException('实际阶段时间须不早于依据事实，且不得填写未来。');return t;}
