<script setup lang="ts">
import { Building2, CalendarDays, ClipboardList, LockKeyhole } from '@lucide/vue';

defineEmits<{ login: [] }>();

const groups = [
  {
    title: '预约与诊疗',
    icon: CalendarDays,
    modules: [
      ['预约工作台、实际接诊', '查看和办理预约，登记到院及接诊进度。'],
      ['医生排班、患者档案', '管理医生值班并核对患者资料。'],
      ['诊疗与收费、实收核实', '记录诊疗、核对账单及实际到账。'],
    ],
  },
  {
    title: '诊所业务协作',
    icon: ClipboardList,
    modules: [
      ['影像与加工', '归档影像，跟踪加工交接。'],
      ['诊后随访', '维护随访计划及联系记录。'],
      ['物资库存、商品销售与交付', '登记物资出入库、商品销售和交付。'],
    ],
  },
  {
    title: '运营与管理',
    icon: Building2,
    modules: [
      ['经营查询、季度业绩核算', '查看经营日报，按季核算与复核。'],
      ['资料检查、诊所资料与规则', '跟踪资料缺项，维护诊所及预约规则。'],
      ['牙医资料与执业、员工权限', '维护执业资料和工作台访问权限。'],
    ],
  },
];
</script>

<template>
  <section class="b-card staff-overview" aria-labelledby="staff-overview-title">
    <div class="staff-overview-header">
      <div>
        <h2 id="staff-overview-title">功能概览</h2>
        <p>登录后，可使用账号所属岗位和诊所授权的功能。</p>
      </div>
      <button type="button" class="b-button" @click="$emit('login')">
        <LockKeyhole :size="17" aria-hidden="true" />登录员工账号
      </button>
    </div>
    <div class="staff-overview-groups">
      <section v-for="group in groups" :key="group.title" class="staff-overview-group">
        <h3><component :is="group.icon" :size="19" aria-hidden="true" />{{ group.title }}</h3>
        <dl>
          <template v-for="[name, description] in group.modules" :key="name">
            <dt>{{ name }}</dt>
            <dd>{{ description }}</dd>
          </template>
        </dl>
      </section>
    </div>
  </section>
</template>

<style scoped>
.staff-overview-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 23px clamp(17px, 2.4vw, 28px);
  border-bottom: 1px solid #dce6e0;
  border-radius: 11px 11px 0 0;
  background: #edf5ef;
}
.staff-overview-header h2 { color: #193c32; font-size: 23px; }
.staff-overview-header p, .staff-overview-group dd { color: #4d675d; font-size: 14px; line-height: 1.55; }
.staff-overview-header p { margin: 6px 0 0; }
.staff-overview-header button { min-height: 44px; }
.staff-overview-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); }
.staff-overview-group { min-width: 0; padding: 23px clamp(17px, 2.3vw, 27px); }
.staff-overview-group h3 { display: flex; align-items: center; gap: 9px; margin: 0 0 14px; color: #245747; font-size: 17px; }
.staff-overview-group dl { margin: 0; }
.staff-overview-group dt { margin: 12px 0 3px; color: #25463a; font-size: 14px; font-weight: 700; }
.staff-overview-group dd { margin: 0; }
@media (min-width: 1000px) {
  .staff-overview-group + .staff-overview-group { border-left: 1px solid #e5ede8; }
}
@media (max-width: 540px) {
  .staff-overview-group + .staff-overview-group { border-top: 1px solid #e5ede8; }
}
</style>
