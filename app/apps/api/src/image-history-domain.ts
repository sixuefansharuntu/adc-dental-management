import{BadRequestException}from'@nestjs/common';
import{uuidInput}from'./domain';
export interface ImageHistoryQuery{imageId:string|null;limit:number;cursor:string|null;}
export function imageHistoryQuery(input:Record<string,unknown>):ImageHistoryQuery{
 if(Object.keys(input).some(k=>!['imageId','limit','cursor'].includes(k)))throw new BadRequestException('包含不支持的影像原版条件。');
 const imageId=input.imageId===undefined?null:uuidInput(input.imageId);let limit=25;
 if(input.limit!==undefined){if(typeof input.limit!=='string'||!/^\d+$/.test(input.limit)||Number(input.limit)<1||Number(input.limit)>50)throw new BadRequestException('每页须为1至50版。');limit=Number(input.limit);}
 const cursor=input.cursor===undefined?null:input.cursor;
 if(cursor!==null&&(typeof cursor!=='string'||!cursor||cursor.length>3000))throw new BadRequestException('影像原版翻页标识无效。');
 return{imageId,limit,cursor:cursor as string|null};
}
export function imageHistoryItem(r:any){return{revisionId:r.image_revision_id,imageId:r.image_id,version:Number(r.version_no),visitId:r.visit_id,fileId:r.file_id,imageType:r.image_type,formedAt:r.formed_at,description:r.description,archivedBy:{id:r.archived_by,name:r.archiver_name},editor:{id:r.actor_id,name:r.actor_name},savedAt:r.saved_at,operationId:r.operation_id,reason:r.reason,mediaType:r.media_type,size:Number(r.byte_size),digest:r.content_digest};}
