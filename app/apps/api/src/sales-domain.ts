import{BadRequestException,ConflictException}from'@nestjs/common';import{fixed,decimal,totalAmount}from'./clinical-domain';
export function salesTotal(lines:{quantity:string;unitPrice:string}[]){if(!lines.length||lines.length>20)throw new BadRequestException('请明确填写1—20项销售明细。');return totalAmount(lines);}
export function allocationDemand(lines:{id:string;materialId:string;quantity:string}[],allocations:{lineId:string;stockId:string;quantity:string;stockVersion:number}[]){
 if(!allocations.length||allocations.length>100)throw new BadRequestException('请明确整单1—100项实际库存分配。');const seen=new Set(),byLine=new Map<string,bigint>(),byStock=new Map<string,{quantity:bigint;version:number;materialId:string;count:number}>();
 for(const a of allocations){const line=lines.find(l=>l.id===a.lineId);if(!line)throw new ConflictException('分配必须属于本销售原行。');const key=a.lineId+':'+a.stockId;if(seen.has(key))throw new BadRequestException('同原行同库存分配不得重复。');seen.add(key);const n=fixed(a.quantity,4,true);byLine.set(a.lineId,(byLine.get(a.lineId)||0n)+n);const old=byStock.get(a.stockId);if(old&&(old.version!==a.stockVersion||old.materialId!==line.materialId))throw new ConflictException('同库存版本或商品引用不一致。');byStock.set(a.stockId,{quantity:(old?.quantity||0n)+n,version:a.stockVersion,materialId:line.materialId,count:(old?.count||0)+1});}
 for(const l of lines)if(byLine.get(l.id)!==fixed(l.quantity,4,true))throw new ConflictException('须逐原行完整核对实际交付数量，本批不办理分批交付。');return byStock;
}
export const money=(s:string)=>decimal(fixed(s,2),2);
