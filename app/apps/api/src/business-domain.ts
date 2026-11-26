import{BadRequestException,ConflictException}from'@nestjs/common';
import{dateInput,uuidInput}from'./domain';import{objectInput}from'./booking-domain';import{fixed,lineCents,decimal}from'./clinical-domain';import{csvCell}from'./quarter-report-domain';
export type BusinessFilters={dimension:'daily'|'staff'|'income';clinicIds:string[];fromDay:string;toDay:string;employeeId:string|null;itemKey:string|null};
export function businessInput(value:unknown):BusinessFilters{
 const b=objectInput(value,['dimension','clinicIds','fromDay','toDay','employeeId','itemKey']);if(!['daily','staff','income'].includes(String(b.dimension)))throw new BadRequestException('请选择经营查询维度。');
 if(!Array.isArray(b.clinicIds)||!b.clinicIds.length||b.clinicIds.length>20)throw new BadRequestException('请选择1—20家有权诊所。');const clinicIds=b.clinicIds.map(x=>uuidInput(x).toLowerCase()).sort();if(new Set(clinicIds).size!==clinicIds.length)throw new BadRequestException('诊所范围不能重复。');
 const fromDay=dateInput(b.fromDay),toDay=dateInput(b.toDay),days=(Date.parse(toDay)-Date.parse(fromDay))/86400000+1;if(days<1||days>93)throw new BadRequestException('本批单次查询为1—93个业务日。');
 const employeeId=b.employeeId?uuidInput(b.employeeId).toLowerCase():null,itemKey=b.itemKey?String(b.itemKey).toLowerCase():null;
 if(employeeId&&b.dimension!=='staff')throw new BadRequestException('人员筛选仅适用人员维度。');if(itemKey&&(b.dimension!=='income'||!/^(treatment|product):[0-9a-f-]{36}$/i.test(itemKey)))throw new BadRequestException('项目筛选仅适用收入构成。');if(itemKey)uuidInput(itemKey.split(':')[1]);
 return{dimension:b.dimension as BusinessFilters['dimension'],clinicIds,fromDay,toDay,employeeId,itemKey};
}
export const businessWindow=(f:BusinessFilters)=>({start:f.fromDay+'T00:00:00+08:00',end:new Date(Date.parse(f.toDay+'T00:00:00+08:00')+86400000).toISOString()});
export const businessRules='上海业务日；到院按实际到院时间，接诊进展属于本期到院；患者人数去重；开单按首次开单，实收按实际到账及采用原版；项目与付款方式不相加；人员关联金额不可跨人求和，不是工资或季度分配。';
const money=(n:bigint)=>decimal(n,2),day=(v:any)=>new Date(v).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),methodNames:Record<string,string>={cash:'现金',card:'刷卡',wechat:'微信',alipay:'支付宝',bank:'银行',other:'其他'};
export function documentCents(lines:any[]){if(!lines?.length)return null;try{return lines.reduce((n,l)=>n+lineCents(l.quantity,l.unitPrice),0n) as bigint;}catch{return null;}}
function unique(rows:any[]){const m=new Map<string,any>();for(const r of rows){if(m.has(r.id)&&JSON.stringify(m.get(r.id))!==JSON.stringify(r))throw new ConflictException('同一来源出现不一致内容，不能去重后猜测结果。');m.set(r.id,r);}return[...m.values()];}
export function businessReport(f:BusinessFilters,data:any){
 const visits=unique(data.visits),documents=unique(data.documents),receipts=unique(data.receipts),clinicNames=new Map<string,string>(data.clinics.map((c:any)=>[c.id,c.name])),employeeNames=new Map<string,string>(data.employees.map((e:any)=>[e.id,e.name]));
 const warnings:{kind:string;sourceId:string;note:string}[]=[],patients=new Set<string>(),daily=new Map<string,any>();
 const addWarning=(kind:string,id:string,note:string)=>warnings.push({kind,sourceId:id,note});
 function bucket(clinicId:string,date:string){const key=clinicId+'|'+date;if(!daily.has(key))daily.set(key,{clinicId,clinicName:clinicNames.get(clinicId),date,arrivals:0,started:0,ended:0,patients:new Set(),treatmentBills:0,sales:0,opened:0n,unknownOpened:0,unpaid:0n,unknownUnpaid:0,received:0n});return daily.get(key);}
 for(const v of visits){const d=bucket(v.clinicId,day(v.arrivedAt));d.arrivals++;if(v.startedAt)d.started++;if(v.endedAt)d.ended++;d.patients.add(v.patientId);patients.add(v.patientId);if(!v.valid)addWarning('visit',v.id,'就诊当前完整原版待核实，人员工作量未从缺失原版推定。');}
 for(const doc of documents){const d=bucket(doc.clinicId,day(doc.openedAt)),n=doc.valid?documentCents(doc.lines):null;d[doc.kind==='bill'?'treatmentBills':'sales']++;if(n===null){d.unknownOpened++;if(!doc.hasReceipt)d.unknownUnpaid++;addWarning(doc.kind,doc.id,'开单完整原版或金额待核实；缺项不补零。');}else{d.opened+=n;if(!doc.hasReceipt)d.unpaid+=n;}}
 let totalReceived=0n,treatmentReceived=0n,productReceived=0n;for(const r of receipts){const n=fixed(r.amount,2);totalReceived+=n;if(r.kind==='bill')treatmentReceived+=n;else productReceived+=n;bucket(r.clinicId,day(r.at)).received+=n;if(!r.valid)addWarning('receipt',r.id,'实收与采用单据原版关联待核实，收入构成单列。');if(r.valid&&documentCents(r.lines)!==n)addWarning('receipt',r.id,'实收与采用单据行金额不符，保持实收但构成待核实。');if(r.lines.some((l:any)=>l.name==='原商品名称待核实'||l.category==='商品分类待核实'))addWarning('receipt',r.id,'原采用商品名称或分类待核实，未读取当前目录猜填。');if(!methodNames[r.method])addWarning('receipt',r.id,'付款方式未知，单列待核实。');}
 const ds=[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.clinicId.localeCompare(b.clinicId));
 const totals={arrivals:visits.length,patients:patients.size,started:visits.filter(v=>v.startedAt).length,ended:visits.filter(v=>v.endedAt).length,treatmentBills:documents.filter(d=>d.kind==='bill').length,sales:documents.filter(d=>d.kind==='sale').length,knownOpenedAmount:money(ds.reduce((n,d)=>n+d.opened,0n)),unknownOpened:ds.reduce((n,d)=>n+d.unknownOpened,0),knownUnpaidOpenedAmount:money(ds.reduce((n,d)=>n+d.unpaid,0n)),unknownUnpaid:ds.reduce((n,d)=>n+d.unknownUnpaid,0),receivedAmount:money(totalReceived),treatmentReceivedAmount:money(treatmentReceived),productReceivedAmount:money(productReceived)};
 const result:any={dimension:f.dimension,totals,status:!visits.length&&!documents.length&&!receipts.length?'no_records':'known_sources',warnings:[],options:{},daily:[],staff:[],items:[],methods:[],filteredReceivedAmount:money(totalReceived),unclassifiedAmount:'0.00',unlinkedTreatmentAmount:'0.00',rules:businessRules};
 if(f.dimension==='daily')result.daily=ds.map(d=>({clinicId:d.clinicId,clinicName:d.clinicName,date:d.date,arrivals:d.arrivals,patients:d.patients.size,started:d.started,ended:d.ended,treatmentBills:d.treatmentBills,sales:d.sales,knownOpenedAmount:money(d.opened),unknownOpened:d.unknownOpened,knownUnpaidOpenedAmount:money(d.unpaid),unknownUnpaid:d.unknownUnpaid,receivedAmount:money(d.received)}));
 if(f.dimension==='staff'){
  const rows=new Map<string,any>(),options=new Set<string>();let unlinked=0n;
  function person(clinicId:string,eid:string){options.add(eid);const key=clinicId+'|'+eid;if(!rows.has(key))rows.set(key,{clinicId,clinicName:clinicNames.get(clinicId),employeeId:eid,employeeName:employeeNames.get(eid)||'原人员名称待核实',doctorStarted:0,nurseParticipation:0,receiptIds:new Set<string>(),linked:0n,unknownRoleReceipts:0});return rows.get(key);}
  for(const v of visits)if(v.valid){const dr=person(v.clinicId,v.doctorId);if(v.startedAt)dr.doctorStarted++;for(const eid of new Set<string>(v.nurseIds)){const nr=person(v.clinicId,eid);if(v.startedAt)nr.nurseParticipation++;}}
  for(const r of receipts.filter(x=>x.kind==='bill')){
   if(!r.valid||documentCents(r.lines)!==fixed(r.amount,2)||!r.staffIds.length){unlinked+=fixed(r.amount,2);addWarning('receipt',r.id,'治疗实收参与依据不完整，未推定人员营收关联。');continue;}
   for(const eid of new Set<string>(r.staffIds)){const p=person(r.clinicId,eid);if(!p.receiptIds.has(r.id)){p.receiptIds.add(r.id);p.linked+=fixed(r.amount,2);if(eid!==r.doctorId&&!r.nurseIds.includes(eid)){p.unknownRoleReceipts++;addWarning('receipt',r.id,'部分参与人员岗位在采用原版中不清楚，未推定医生或护士。');}}}
  }
  if(f.employeeId&&!options.has(f.employeeId))throw new BadRequestException('所选人员不在本次有权来源中，请先查询并选择。');
  result.options.employees=[...options].sort().map(id=>({id,name:employeeNames.get(id)||'原人员名称待核实'}));result.staff=[...rows.values()].filter(p=>!f.employeeId||p.employeeId===f.employeeId).sort((a,b)=>a.clinicId.localeCompare(b.clinicId)||a.employeeId.localeCompare(b.employeeId)).map(p=>({clinicId:p.clinicId,clinicName:p.clinicName,employeeId:p.employeeId,employeeName:p.employeeName,doctorStarted:p.doctorStarted,nurseParticipation:p.nurseParticipation,linkedReceiptCount:p.receiptIds.size,linkedTreatmentReceivedAmount:money(p.linked),unknownRoleReceipts:p.unknownRoleReceipts}));result.unlinkedTreatmentAmount=money(unlinked);
 }
 if(f.dimension==='income'){
  const itemRows=new Map<string,any>(),methodRows=new Map<string,any>(),options=new Map<string,string>();let matched=0n,unclassified=0n;
  for(const r of receipts){const amount=fixed(r.amount,2),valid=r.valid&&documentCents(r.lines)===amount;let selected=0n;
   if(!valid){unclassified+=amount;addWarning('receipt',r.id,'采用单据行与全额实收不守恒，未猜分项目金额。');if(!f.itemKey){const key='unknown',row=itemRows.get(key)||{itemKey:null,name:'项目或商品关联待核实',category:'未知',kind:'unknown',amount:0n,receiptIds:new Set<string>()};row.amount+=amount;row.receiptIds.add(r.id);itemRows.set(key,row);selected=amount;}}
   else for(const l of r.lines){options.set(l.itemKey,l.name);if(f.itemKey&&l.itemKey!==f.itemKey)continue;const n=lineCents(l.quantity,l.unitPrice),key=JSON.stringify([l.itemKey,l.name,l.category]),row=itemRows.get(key)||{itemKey:l.itemKey,name:l.name,category:l.category||'分类待核实',kind:r.kind,amount:0n,receiptIds:new Set<string>()};row.amount+=n;row.receiptIds.add(r.id);itemRows.set(key,row);selected+=n;}
   if(selected||(!f.itemKey&&amount===0n)){const method=r.valid&&methodNames[r.method]?r.method:'unknown',row=methodRows.get(method)||{method,label:methodNames[method]||'付款方式待核实',amount:0n};row.amount+=selected;methodRows.set(method,row);}matched+=selected;
  }
  if(f.itemKey&&!options.has(f.itemKey))throw new BadRequestException('所选项目不在本次已核对实收来源中，请先查询并选择。');
  const sum=[...itemRows.values()].reduce((n,r)=>n+r.amount,0n),pay=[...methodRows.values()].reduce((n,r)=>n+r.amount,0n);if(sum!==matched||pay!==matched)throw new ConflictException('收入构成与付款方式未分别守恒，不能展示。');
  result.options.items=[...options].sort(([a],[b])=>a.localeCompare(b)).map(([key,name])=>({key,name}));result.items=[...itemRows.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,r])=>({key,itemKey:r.itemKey,name:r.name,category:r.category,kind:r.kind,amount:money(r.amount),receiptCount:r.receiptIds.size}));result.methods=[...methodRows.values()].sort((a,b)=>a.method.localeCompare(b.method)).map(r=>({...r,amount:money(r.amount)}));result.filteredReceivedAmount=money(matched);result.unclassifiedAmount=money(unclassified);
 }
 // Daily readers receive aggregate incompleteness only, never source IDs or staff/project options.
 result.warnings=f.dimension==='daily'?warnings.map(w=>({note:w.note})):warnings;
 if(warnings.length)result.status='needs_verification';return result;
}
export function businessCsv(snapshot:any,generatedAt:string){
 const r=snapshot.report,f=snapshot.filters,rows:any[][]=[],header=['查询维度','开始业务日','结束业务日','行类型','诊所','日期/人员/项目','到院次数','患者人数','医生已开始接诊','护士登记参与','已知开单额','已知待付开单额','实收或关联金额','说明','原查询数据时点','生成时点'];
 const put=(type:string,clinic:string,label:string,n:any={},note='')=>rows.push([f.dimension,f.fromDay,f.toDay,type,clinic,label,n.arrivals??'',n.patients??'',n.doctorStarted??n.started??'',n.nurseParticipation??'',n.knownOpenedAmount??'',n.knownUnpaidOpenedAmount??'',n.amount??n.receivedAmount??'',note,snapshot.dataAsOf,generatedAt]);
 put('口径','','',{},r.rules);put('原范围实收','','',{amount:r.totals.receivedAmount},'只计一次，与项目/付款方式构成或人员关联金额不能相加。');
 if(f.dimension==='daily')for(const d of r.daily)put('日报',d.clinicName,d.date,d,'未知开单数'+d.unknownOpened+'；患者人数不能跨日/店简单相加。');
 if(f.dimension==='staff')for(const p of r.staff)put('人员参与',p.clinicName,p.employeeName,{...p,amount:p.linkedTreatmentReceivedAmount},'治疗实收关联，跨人不求和，不是工资；关联笔数'+p.linkedReceiptCount);
 if(f.dimension==='income'){for(const p of r.items)put('项目/商品构成','',p.name,{amount:p.amount},p.category);for(const p of r.methods)put('付款方式构成','',p.label,{amount:p.amount},'独立解释相同实收，不能与项目构成相加。');}
 for(const w of r.warnings)put('待核实','','',{},w.note);
 const numeric=new Set([6,7,8,9,10,11,12]),csv='\uFEFF'+[header,...rows].map(row=>row.map((v,i)=>csvCell(v,numeric.has(i)&&/^\d+(\.\d{2})?$/.test(String(v)))).join(',')).join('\r\n')+'\r\n';if(Buffer.byteLength(csv)>5*1024*1024)throw new BadRequestException('导出超过5MiB，请缩小查询范围。');return{csv,rowCount:rows.length};
}
