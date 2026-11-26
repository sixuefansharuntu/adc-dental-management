import { BadRequestException } from '@nestjs/common';
import { Worker } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { validateImage, MAX_FILE } from './care-domain';

// Parse untrusted PDF in a bounded worker. No PDF scripts or attachments are executed.
const parser = String.raw`
const { parentPort, workerData } = require('node:worker_threads');
const { PDFDocument, PDFDict, PDFArray, PDFStream, PDFName } = require(workerData.library);
(async()=>{
 const bytes=Buffer.from(workerData.bytes),doc=await PDFDocument.load(bytes,{ignoreEncryption:false,throwOnInvalidObject:true,updateMetadata:false});
 if(doc.isEncrypted)throw Error('encrypted');
 const objects=doc.context.enumerateIndirectObjects();if(objects.length>20000)throw Error('objects');
 const pages=doc.getPages();if(pages.length<1||pages.length>50)throw Error('pages');
 for(const page of pages){const b=page.getMediaBox();if(![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0||b.width>10000||b.height>10000)throw Error('page bounds');}
 const prohibited=new Set(['OpenAction','AA','A','JavaScript','JS','EmbeddedFiles','EF','RichMedia','Launch','XFA','AcroForm','URI','SubmitForm','ImportData','Rendition','Movie','Sound','3D','Collection','Annots']);
 const seen=new Set();let count=0;
 function inspect(object,depth=0){
  if(!object||seen.has(object))return;if(depth>64||++count>100000)throw Error('complexity');seen.add(object);
  if(object instanceof PDFStream){inspect(object.dict,depth+1);return;}
  if(object instanceof PDFDict){for(const [key,value]of object.entries()){const name=key.decodeText();if(prohibited.has(name)){const resolved=doc.context.lookup(value);if(!(name==='Annots'&&resolved instanceof PDFArray&&resolved.size()===0))throw Error('interactive content');}if(name==='Type'&&value instanceof PDFName&&['Filespec','Action','Annot'].includes(value.decodeText()))throw Error('active object');inspect(value,depth+1);}}
  else if(object instanceof PDFArray)for(const value of object.asArray())inspect(value,depth+1);
 }
 inspect(doc.catalog);for(const [,object]of objects)inspect(object);
 parentPort.postMessage({pages:pages.length});
})().catch(()=>parentPort.postMessage({error:true}));
`;

export async function validateQualificationFile(bytes: Buffer) {
 if (!bytes.length || bytes.length > MAX_FILE) throw new BadRequestException('请选择不超过10MiB的PNG、JPEG或PDF文件。');
 if (!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) return validateImage(bytes);
 const tail=bytes.subarray(Math.max(0,bytes.length-1024)).toString('latin1');
 if(!/^%PDF-(1\.[0-7]|2\.0)(\r|\n)/.test(bytes.subarray(0,12).toString('latin1')) || !/startxref\s+\d+\s+%%EOF\s*$/.test(tail))throw new BadRequestException('PDF结构不完整，请重新导出扫描件。');
 const pages=await new Promise<number>((resolve,reject)=>{
   const worker=new Worker(parser,{eval:true,workerData:{library:require.resolve('pdf-lib'),bytes},resourceLimits:{maxOldGenerationSizeMb:128,maxYoungGenerationSizeMb:16}});
   let finished=false;
   const finish=(n?:number)=>{if(finished)return;finished=true;clearTimeout(timer);void worker.terminate();if(n)resolve(n);else reject(new BadRequestException('PDF无法核对，或包含加密、交互内容、附件、超出50页及处理范围；请导出普通扫描PDF。'));};
   const timer=setTimeout(()=>finish(),5000);
   worker.once('message',r=>finish(Number.isInteger(r?.pages)?r.pages:undefined));worker.once('error',()=>finish());worker.once('exit',()=>finish());
 });
 return {mediaType:'application/pdf',digest:createHash('sha256').update(bytes).digest('hex'),size:bytes.length,pages};
}

export function qualificationFileExtension(type:string){if(type==='image/png')return'png';if(type==='image/jpeg')return'jpg';if(type==='application/pdf')return'pdf';throw new BadRequestException('不支持的证书附件格式。');}
