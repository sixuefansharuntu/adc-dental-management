import{BadRequestException}from'@nestjs/common';
import{uuidInput}from'./domain';
import{dentistBranches,type DentistBranch}from'./dentist-domain';
export function dentistStatusQuery(q:Record<string,unknown>){
 if(Object.keys(q).some(k=>!['doctorId','branch','clinicId','practiceId'].includes(k))||typeof q.branch!=='string'||!(dentistBranches as readonly string[]).includes(q.branch))throw new BadRequestException('原牙医提交核实条件无效。');
 const doctorId=uuidInput(q.doctorId).toLowerCase(),branch=q.branch as DentistBranch;
 if(branch!=='practice'){if('clinicId'in q||'practiceId'in q)throw new BadRequestException('全局资料核实不接受执业关系条件。');return{doctorId,branch};}
 return{doctorId,branch,clinicId:uuidInput(q.clinicId).toLowerCase(),practiceId:q.practiceId==='new'?null:uuidInput(q.practiceId).toLowerCase()};
}
