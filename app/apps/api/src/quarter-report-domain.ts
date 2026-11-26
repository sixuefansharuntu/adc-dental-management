import {BadRequestException,ConflictException} from '@nestjs/common';
import {fixed} from './clinical-domain';
import {allocateQuarter} from './quarter-domain';
export const reportStates:Record<string,string>={confirmed:'已正式确认',pending_review:'待总部复核',returned:'已退回'};
const kindNames:Record<string,string>={receipt:'治疗实收',sale:'商品实收',issue:'材料成本',expense:'运营费用'};
export type ReportScope={clinicId:string;name:string};
export type ReportDoctor={clinicId:string;doctorId:string;name:string};
const canon=(rows:any[])=>rows.map(r=>JSON.stringify(r)).sort();
const amount=(n:bigint)=>{const v=n<0n?-n:n;return(n<0n?'-':'')+(v/100n).toString()+'.'+(v%100n).toString().padStart(2,'0');};
export function projectQuarterReport(plan:any,scope:ReportScope[],doctors:ReportDoctor[],doctorId:string|null){
 const allScopes=plan.lines.map((l:any)=>({clinicId:l.clinicId,doctorId:l.doctorId}));
 const verified=allocateQuarter(allScopes,plan.basis.sources,plan.allocations);
 const values=(a:any[])=>a.map(l=>({clinicId:l.clinicId,doctorId:l.doctorId,income:l.income,cost:l.cost,expense:l.expense,contribution:l.contribution}));
 const unassignedValues=(rows:any[])=>rows.map(u=>({sourceId:u.sourceId,amount:u.amount}));
 if(JSON.stringify(canon(values(verified.lines)))!==JSON.stringify(canon(values(plan.lines)))||JSON.stringify(canon(unassignedValues(verified.unassigned)))!==JSON.stringify(canon(unassignedValues(plan.unassigned))))throw new ConflictException('原快照的分项、归集及合计不一致，不能生成报告。');
 const clinicMap=new Map(scope.map(s=>[s.clinicId,s.name])),doctorMap=new Map(doctors.map(d=>[d.doctorId,d.name]));
 const lines=plan.lines.filter((l:any)=>clinicMap.has(l.clinicId)&&(!doctorId||l.doctorId===doctorId)).map((l:any)=>({clinicId:l.clinicId,clinicName:clinicMap.get(l.clinicId),doctorId:l.doctorId,doctorName:doctorMap.get(l.doctorId)||l.doctorId,income:l.income,cost:l.cost,expense:l.expense,contribution:l.contribution}));
 const selected=new Set(lines.map((l:any)=>l.clinicId+':'+l.doctorId));
 const sourceMap=new Map<string,any>(plan.basis.sources.map((s:any)=>[s.kind+':'+s.id,s]));
 const sources=plan.allocations.filter((a:any)=>{const s=sourceMap.get(a.kind+':'+a.sourceId);return s&&clinicMap.has(s.clinicId)&&(a.doctorId?selected.has(s.clinicId+':'+a.doctorId):!doctorId);}).map((a:any)=>{const s=sourceMap.get(a.kind+':'+a.sourceId);return{kind:a.kind,kindName:kindNames[a.kind],clinicId:s.clinicId,clinicName:clinicMap.get(s.clinicId),doctorId:a.doctorId,doctorName:a.doctorId?(doctorMap.get(a.doctorId)||a.doctorId):'未归属牙医，保留诊所',sourceId:s.id,revisionId:s.revisionId,version:s.version,occurredAt:s.at,label:s.label,sourceAmount:s.amount,allocatedAmount:a.amount,basis:a.basis};});
 if(sources.length>10000)throw new ConflictException('当前筛选超过10000条采用分配，请缩小诊所或牙医范围，不截断后导出。');
 const unassigned=sources.filter((s:any)=>!s.doctorId).map((s:any)=>({clinicId:s.clinicId,clinicName:s.clinicName,sourceId:s.sourceId,amount:s.allocatedAmount}));
 const total=(ls:any[])=>{let income=0n,cost=0n,expense=0n;for(const l of ls){income+=fixed(l.income,2);cost+=fixed(l.cost,2);expense+=fixed(l.expense,2);}return{income:amount(income),cost:amount(cost),expense:amount(expense),contribution:amount(income-cost-expense)};};
 const aggregateMap=new Map<string,any[]>();for(const l of lines){if(!aggregateMap.has(l.doctorId))aggregateMap.set(l.doctorId,[]);aggregateMap.get(l.doctorId)!.push(l);}
 const byDoctor=[...aggregateMap].map(([id,ls])=>({doctorId:id,doctorName:doctorMap.get(id)||id,clinics:ls.map(l=>({clinicId:l.clinicId,clinicName:l.clinicName})),...total(ls)}));
 return{lines,byDoctor,sources,unassigned,totals:total(lines),unassignedTotal:amount(unassigned.reduce((n:any,s:any)=>n+fixed(s.amount,2),0n))};
}
export function csvCell(value:unknown,numeric=false){let s=value==null?'':String(value);if(!numeric&&/^[\s\uFEFF]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function reportCsv(report:any,groupBy:'clinic'|'doctor',includeDetails:boolean,exportedAt:string){
 if(!report.result||!report.projection)throw new ConflictException('本季尚未形成结果，不能把无结果导出为零业绩。');
 const p=report.projection,m=report.result,q=report.quarter;
 const headers=['季度','结果版本','整批状态','本版确认时间（上海）','首次全范围确认时间（上海）','导出范围','行类型','诊所','牙医','实收收入（元）','材料成本（元）','分配费用（元）','经营贡献（元）','未归属诊所商品实收（元）','来源类别','来源编号','采用原版编号','采用原版号','实际发生时间（上海）','来源原金额（元）','本次归集金额（元）','核实依据或说明','生成时间（上海）'];
 const time=(v:string)=>v?(v.length===10?v:new Date(v).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'})):'';
 const ranges=report.filters.scopeLabel,base=[q.label,m.version,reportStates[m.state],time(m.confirmedAt),time(q.firstConfirmedAt),ranges],rows:any[][]=[];
 const put=(type:string,clinic:string,doctor:string,n:any={},s:any={},description='')=>rows.push([...base,type,clinic,doctor,n.income??'',n.cost??'',n.expense??'',n.contribution??'',n.unassigned??'',s.kindName??'',s.sourceId??'',s.revisionId??'',s.version??'',time(s.occurredAt),s.sourceAmount??'',s.allocatedAmount??'',description,time(exportedAt)]);
 put('说明','','',{}, {},'金额仅按所选结果采用原版；经营贡献不等于工资。筛选不改变整批复核范围。'+(m.isLatestConfirmed?' 本版为查询时最新已确认。':m.state==='confirmed'?' 本版为历史已确认结果。':' 尚未正式确认。'));
 if(groupBy==='clinic')for(const l of p.lines)put('牙医诊所分项',l.clinicName,l.doctorName,l);
 else for(const l of p.byDoctor)put('牙医跨店合计',l.clinics.map((c:any)=>c.clinicName).join('；'),l.doctorName,l);
 put('当前筛选合计','','',p.totals,{},'不重复相加分项和跨店合计；此处不含未归属牙医的商品实收。');
 for(const u of p.unassigned)put('未归属商品实收',u.clinicName,'未归属牙医',{unassigned:u.amount},{sourceId:u.sourceId},'保留为诊所收入，不并入某牙医经营贡献。');
 if(includeDetails)for(const s of p.sources)put('采用来源归集',s.clinicName,s.doctorName,{},s,s.basis);
 const numericColumns=new Set([9,10,11,12,13,19,20]);
 const csv='\uFEFF'+[headers,...rows].map(row=>row.map((v,i)=>csvCell(v,numericColumns.has(i)&&/^-?\d+\.\d{2}$/.test(String(v)))).join(',')).join('\r\n')+'\r\n';
 if(Buffer.byteLength(csv,'utf8')>5*1024*1024)throw new BadRequestException('导出超过5MiB，请缩小范围或仅导出摘要，不返回截断文件。');
 return{csv,rowCount:rows.length,detailCount:includeDetails?p.sources.length:0};
}
