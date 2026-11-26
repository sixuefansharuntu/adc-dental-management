<script setup lang="ts">
import {computed,ref,watch} from 'vue';
const props=defineProps<{functions?:string[];area:string}>();
type Step={name:string;role:string;area:string;where:string;note:string};
const flows:{id:string;title:string;areas:string[];steps:Step[];handoff:string}[]=[
 {id:'daily',title:'预约、接诊与收款',areas:['frontdesk','clinical','receipts','business'],steps:[
  {name:'选择医生和可约时间',role:'患者／代约前台',area:'frontdesk',where:'患者端／预约与接诊',note:'系统校验后即时确认；改约、取消保留历史。'},
  {name:'核实身份并登记到院',role:'前台',area:'frontdesk',where:'预约与接诊 → 实际接诊',note:'明确关联患者档案，登记实际开始、结束和离开。'},
  {name:'记录并确认实际治疗',role:'医生',area:'clinical',where:'诊疗与收费 → 打开就诊',note:'医护共同完善记录，治疗内容由医生确认。'},
  {name:'录入数量、核费开单',role:'医生／护士，前台必要时协助',area:'clinical',where:'诊疗与收费 → 填写明细并核费',note:'逐项核对数量和采用单价，再确认正式账单。'},
  {name:'核实实收并查看日报',role:'前台',area:'business',where:'诊疗与收费／经营查询',note:'开单、实收和病历完整性分别核对。'}],handoff:'交接时核对患者、诊所及实际到院日期；预约日与实际到院日可能不同。'},
 {id:'care',title:'影像与义齿加工',areas:['care'],steps:[
  {name:'打开同一次实际就诊',role:'有权医护／影像人员',area:'care',where:'影像与加工',note:'先核对患者和原就诊，再选择相应工作。'},
  {name:'准备文件并确认归档',role:'有权归档人员',area:'care',where:'影像与加工 → 影像',note:'文件准备不等于归档，查看文件仍按当前权限。'},
  {name:'明确加工临床要求',role:'原接诊医生',area:'care',where:'影像与加工 → 加工',note:'要求采用本次医生确认的治疗版本。'},
  {name:'登记送出与实际接收',role:'有权办理人员',area:'care',where:'影像与加工 → 加工阶段',note:'预计返回不代表收到；相符接收也不等于临床可用。'},
  {name:'核对可用并协商复诊',role:'医生核对，前台协商',area:'frontdesk',where:'影像与加工／预约与接诊',note:'治疗或要求有变须重新核对，不自动预约复诊。'}],handoff:'复诊需核对同一患者，并在就诊意向保留原加工编号；目前没有自动关联或提醒。'},
 {id:'stock',title:'物资、商品与库存',areas:['inventory','sales'],steps:[
  {name:'核对目录和实际入库',role:'物资管理人员',area:'inventory',where:'物资与库存',note:'明确数量、单位、批次及凭据；未知价格保留待核实。'},
  {name:'登记实际领用',role:'物资管理人员',area:'inventory',where:'物资与库存 → 领用',note:'领用数量与采用成本分别核实，补成本不再扣数量。'},
  {name:'商品开单与实际交付',role:'前台／有权销售人员',area:'sales',where:'商品销售与交付',note:'开单不扣库存，实际交付按所选批次扣量。'},
  {name:'登记全额实收',role:'有权收款人员',area:'sales',where:'商品销售与交付 → 实收',note:'付款和交付分别记录，商品交付不另造材料领用。'},
  {name:'盘点并核对来源',role:'物资管理人员／财务',area:'inventory',where:'物资与库存／季度业绩核算',note:'盘点纳入期间变动，季度使用已核实的来源版本。'}],handoff:'交接时核对物资、库存批次和原单编号。商品实收不是商品毛利。'},
 {id:'followup',title:'随访与复诊',areas:['followup'],steps:[
  {name:'核实医生要求配置方案',role:'有权方案管理人员',area:'followup',where:'诊后随访 → 随访方案',note:'方案节点来自已核实的医生要求，不套统一医学间隔。'},
  {name:'选择实际治疗并安排',role:'有权随访人员',area:'followup',where:'诊后随访 → 来源与安排',note:'明确方案节点、时间、负责人和本次联系内容。'},
  {name:'记录实际联系结果',role:'护士／授权协助人员',area:'followup',where:'诊后随访 → 联系记录',note:'未接通、联系成功和专业问题分别记录。'},
  {name:'核实医生反馈再登记解决',role:'医生处理，随访人员核实登记',area:'followup',where:'诊后随访 → 专业问题',note:'转交或联系成功不自动解决问题，须有明确依据。'},
  {name:'与患者协商复诊',role:'前台',area:'frontdesk',where:'预约与接诊 → 前台代约',note:'明确协商可约时间，不把问题解决当作已预约。'}],handoff:'复诊意向保留原随访编号，并核对患者身份；目前没有自动任务预约关联。'},
 {id:'quality',title:'资料问题补正与复查',areas:['quality'],steps:[
  {name:'检查并保存问题',role:'有权资料检查人员',area:'quality',where:'资料检查与跟踪',note:'核对诊所、季度和来源类别，通知与处理各自留痕。'},
  {name:'由原岗位补正原业务',role:'医生／财务／物资管理人员',area:'quality',where:'问题详情中的原来源指引',note:'没有原业务权限时，由对应岗位办理，检查权不代替修改权。'},
  {name:'重新读取当前来源',role:'有权资料检查人员',area:'quality',where:'资料检查与跟踪 → 问题详情',note:'原业务补正不会自动关闭问题，旧来源基准不能用于复查。'},
  {name:'明确复查并保留依据',role:'有权资料检查人员',area:'quality',where:'资料检查与跟踪 → 复查',note:'核对当前版本后选择结论，历史仍可追查。'}],handoff:'记录问题编号和原来源编号。跨岗位补正后，返回原诊所和季度重新读取问题。'},
 {id:'quarter',title:'季度核算与调整',areas:['quarter'],steps:[
  {name:'固定季度和完整原范围',role:'财务',area:'quarter',where:'季度业绩核算 → 启动核算',note:'核对两店及原纳入牙医，不能通过缩小范围绕过缺项。'},
  {name:'逐店核实并提交来源',role:'各诊所管理人员',area:'quarter',where:'季度业绩核算 → 核对来源',note:'各店分别提交；无业务也须明确核实。'},
  {name:'逐笔归属并整批计算',role:'财务',area:'quarter',where:'季度业绩核算 → 核对并试算',note:'保存计算版仍待复核，经营贡献不是工资。'},
  {name:'总部复核正式确认',role:'总部负责人',area:'quarter',where:'季度业绩核算 → 查看依据／复核',note:'季度尚未结束时只能准备试算，不能正式确认整季。'},
  {name:'更正或晚录按轮次调整',role:'总部、财务及各店管理人员',area:'quarter',where:'季度业绩核算 → 调整',note:'指定当前轮次、两店重提、另版复核；保留首次确认时刻。'}],handoff:'交接时核对季度、结果版本和调整轮次；待复核结果需退回后才能继续改来源。'}
];
const selection=ref('');watch(()=>props.area,()=>selection.value='');
const active=computed(()=>flows.find(f=>f.id===selection.value)||flows.find(f=>f.areas.includes(props.area))||flows[0]);
function hasEntry(area:string){const f=props.functions||[];const codes:Record<string,string[]>={frontdesk:['appointment.read'],clinical:['bill.read'],care:['image.read','lab.read'],followup:['followup.read','followup.plan.read'],inventory:['stock.read'],sales:['sale.read'],quality:['quality.read'],quarter:['quarter.read'],business:['business.daily.read','business.staff.read','business.income.read']};return(codes[area]||[]).some(c=>f.includes(c));}
</script>
<template>
 <details class="workflow-guide">
  <summary><span>业务流程与岗位分工</span><small>查看下一步与交接事项</small></summary>
  <div class="wg-body">
   <p class="wg-intro">按业务目标查看办理顺序。入口提示只说明当前账号能否进入相关工作区，具体诊所、字段和操作仍以页面权限为准。</p>
   <div class="wg-options" aria-label="选择业务流程"><button v-for="flow in flows" :key="flow.id" type="button" :aria-pressed="active.id===flow.id" @click="selection=flow.id">{{flow.title}}</button></div>
   <h2>{{active.title}}</h2>
   <ol class="wg-steps"><li v-for="(step,index) in active.steps" :key="step.name"><span class="wg-number" aria-hidden="true">{{index+1}}</span><div><h3>{{step.name}}</h3><p class="wg-role">{{step.role}}</p><p>{{step.note}}</p><div class="wg-location"><strong>{{step.where}}</strong><span :class="{available:hasEntry(step.area)}">{{hasEntry(step.area)?'本账号有相关入口':'需对应岗位协作'}}</span></div></div></li></ol>
   <p class="wg-handoff"><strong>交接提醒</strong>{{active.handoff}}</p>
   <p class="wg-foot">指引不会切换工作区或提交业务，也不代表上述步骤已经完成。收起后可继续原表单。</p>
  </div>
 </details>
</template>
<style scoped>
.workflow-guide{margin:0 0 22px;border:1px solid #dce7e0;border-radius:12px;background:white}.workflow-guide summary{cursor:pointer;padding:16px 20px;color:#245e50;font-weight:600;line-height:1.7}.workflow-guide summary small{margin-left:16px;font-size:13px;font-weight:400;color:#6d7f75}.wg-body{padding:0 20px 20px}.wg-intro,.wg-foot{font-size:13px;color:#6b7d72}.wg-options{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.wg-options button{border:1px solid #dbe5df;background:#f8faf8;border-radius:7px;padding:9px 12px;color:#456256}.wg-options button[aria-pressed=true]{background:#227567;color:white;border-color:#227567}.wg-options button:focus-visible,summary:focus-visible{outline:3px solid #b8d6c8;outline-offset:3px}.wg-body h2{font-size:20px;margin:20px 0 12px}.wg-steps{list-style:none;padding:0;margin:0;display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}.wg-steps li{display:flex;align-items:flex-start;gap:12px;border:1px solid #e4ebe5;border-radius:9px;padding:16px;min-width:0}.wg-steps li>div{min-width:0}.wg-number{flex-shrink:0;display:grid;place-items:center;width:28px;height:28px;background:#edf4ef;border-radius:50%;color:#246d5d;font-size:13px;font-weight:600}.wg-body h3{font-size:16px;margin:0;line-height:1.6}.wg-steps p{font-size:14px;line-height:1.8;margin:7px 0}.wg-steps .wg-role{font-size:13px;color:#728477;margin-top:3px}.wg-location{display:flex;flex-direction:column;align-items:flex-start;gap:7px;font-size:12px;margin-top:11px}.wg-location strong{font-weight:400;color:#557064;overflow-wrap:anywhere}.wg-location span{background:#f2f3f1;color:#7d817b;border-radius:4px;padding:3px 7px}.wg-location span.available{background:#edf5ee;color:#387257}.wg-handoff{display:flex;gap:12px;align-items:flex-start;background:#f5f8f5;border-radius:8px;margin:16px 0;padding:14px;font-size:14px;line-height:1.8}.wg-handoff strong{white-space:nowrap;color:#386855}.wg-foot{margin-bottom:0}@media(max-width:680px){.workflow-guide summary{padding:14px}.workflow-guide summary small{display:block;margin:4px 0 0 18px}.wg-body{padding:0 12px 14px}.wg-steps{grid-template-columns:1fr}.wg-options button{font-size:13px;padding:9px}.wg-steps li{padding:12px}.wg-handoff{display:block}.wg-handoff strong{display:block;margin-bottom:5px}}
</style>
