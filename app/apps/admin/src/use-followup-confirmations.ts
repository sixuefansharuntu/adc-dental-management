import{watch}from'vue';
export function useFollowupConfirmations(mode:()=>string,form:()=>any){
 const keys={plan:['planId','itemId','effectiveFrom','effectiveTo','enabled','nodes','reason'],task:['taskId','treatmentId','nodeKey','doctorInstruction','plannedAt','plannedContent','responsibleId','nextAction','reason'],issue:['id','doctorId','conclusion','resolve','resolvedAt','clinicalRecordId','clinicalBasis']};
 const basis=(kind:keyof typeof keys)=>JSON.stringify([mode(),...keys[kind].map(k=>form()?.[k])]);
 watch(()=>basis('plan'),()=>{if(mode()==='plan')form().doctorRequirementsConfirmed=false;},{flush:'sync'});
 watch(()=>basis('task'),()=>{if(mode()==='task')form().arrangementConfirmed=false;},{flush:'sync'});
 watch(()=>JSON.stringify([mode(),form()?.treatmentId,form()?.nodeKey,form()?.doctorInstruction]),()=>{if(mode()==='task')form().instructionConfirmed=false;},{flush:'sync'});
 watch(()=>basis('issue'),()=>{if(mode()==='issue')form().feedbackVerified=false;},{flush:'sync'});
}
export function selectFollowupNode(form:any,node:any){form.plannedContent=node?.n.contact_content||'';form.doctorInstruction='';form.instructionConfirmed=false;form.arrangementConfirmed=false;}
