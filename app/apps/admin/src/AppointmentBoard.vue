<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { appointmentBoard, boardStatus, type BoardAppointment, type BoardDoctor } from './appointment-board';
import { bookingTimeRange } from './booking-time';

const props = defineProps<{
  appointments: BoardAppointment[];
  doctors: BoardDoctor[];
  date: string;
  blocked: boolean;
  writable: boolean;
  canSeeVisits: boolean;
}>();
const emit = defineEmits<{
  arrive: [appointment: BoardAppointment];
  visit: [appointment: BoardAppointment];
  list: [id: string];
}>();
const selectedId = ref('');
const selected = computed(() => props.appointments.find(row => row.id === selectedId.value));
const board = computed(() => appointmentBoard(props.date, props.doctors, props.appointments));
const hourHeight = 88;
const scale = hourHeight / 60;
const grid = computed(() => ({
  '--board-hour': hourHeight + 'px',
  '--board-hours': board.value.hours,
  gridTemplateColumns: '60px ' + board.value.columns.map(doctor => 'minmax(' + (doctor.lanes * 150 + 12) + 'px, 1fr)').join(' '),
}));
function timeLabel(index: number) {
  const hour = board.value.startMinute / 60 + index - 1;
  return (hour >= 24 ? '次日 ' : '') + String(hour % 24).padStart(2, '0') + ':00';
}
watch(() => props.date, () => selectedId.value = '');
</script>

<template>
  <div class="appointment-board-layout">
    <div class="appointment-board-scroll" tabindex="0" aria-label="按医生和时间排列的预约">
      <div v-if="board.columns.length" class="appointment-board" :style="grid">
        <div class="board-time">
          <div class="board-header">时间</div>
          <div v-for="i in board.hours" :key="i" class="board-hour">{{ timeLabel(i) }}</div>
        </div>
        <div v-for="doctor in board.columns" :key="doctor.id" class="board-doctor">
          <div class="board-header">{{ doctor.name }}</div>
          <div class="board-track">
            <button v-for="event in doctor.events" :key="event.appointment.id" type="button"
              class="board-event" :class="[event.kind, { 'board-event-compact': event.end - event.start < 30 }]"
              :aria-pressed="selectedId === event.appointment.id"
              :aria-label="[event.appointment.name, event.range, event.appointment.serviceName, event.label].join('，')"
              :title="event.range + ' · ' + event.appointment.name + ' · ' + event.label"
              :style="{
                top: (event.start - board.startMinute) * scale + 'px',
                height: (event.end - event.start) * scale + 'px',
                left: 100 * event.lane / doctor.lanes + '%',
                width: 100 / doctor.lanes + '%',
              }" @click="selectedId = event.appointment.id">
              <span class="board-event-title"><strong>{{ event.appointment.name }}</strong><small>{{ event.label }}</small></span>
              <span class="board-event-time">{{ event.range }} <span>{{ event.appointment.serviceName }}</span></span>
            </button>
          </div>
        </div>
      </div>
      <p v-else class="b-empty">该日期和筛选条件下没有预约。</p>
      <p v-if="board.columns.length && !appointments.length" class="b-empty">该日期和筛选条件下没有预约。</p>
    </div>
    <aside class="board-detail" aria-label="预约详情">
      <h3>预约详情</h3>
      <template v-if="selected">
        <p class="board-detail-person">{{ selected.name }} <small>{{ boardStatus(selected).label }}</small></p>
        <dl>
          <dt>预约编号</dt><dd>{{ selected.id.slice(0, 8).toUpperCase() }}</dd>
          <dt>就诊时间</dt><dd>{{ bookingTimeRange(selected.startsAt, selected.endsAt) }}</dd>
          <dt>预约医生</dt><dd>{{ selected.doctorName }}</dd>
          <dt>服务</dt><dd>{{ selected.serviceName }}</dd>
          <template v-if="selected.visitId"><dt>原预约</dt><dd>{{ boardStatus(selected).appointmentLabel }}</dd></template>
        </dl>
        <button v-if="selected.visitId && selected.visitState && canSeeVisits" class="b-button" type="button" :disabled="blocked" @click="emit('visit', selected)">查看实际接诊</button>
        <button v-else-if="!selected.visitId && writable && selected.disposition === 'active'" class="b-button" type="button" :disabled="blocked" @click="emit('arrive', selected)">登记到院</button>
        <button class="b-button outline" type="button" @click="emit('list', selected.id)">查看原预约</button>
      </template>
      <p v-else class="board-detail-empty">选择一笔预约查看详情。</p>
    </aside>
  </div>
</template>

<style scoped>
.appointment-board-layout{display:grid;grid-template-columns:minmax(0,1fr) 234px;gap:14px;align-items:start;padding:0 16px 16px}
.appointment-board-scroll{overflow:auto;max-height:700px;border:1px solid #d9e5e4;border-radius:10px;scrollbar-width:thin}
.appointment-board{display:grid;min-width:100%;color:#173b3d}
.board-header{position:sticky;top:0;height:45px;padding:0 10px;display:flex;align-items:center;font-weight:700;background:#f6faf9;border-bottom:1px solid #d9e5e4;z-index:2}
.board-doctor{border-left:1px solid #d9e5e4}
.board-time{position:sticky;left:0;z-index:3;background:#fff}
.board-hour{height:var(--board-hour);border-bottom:1px solid #e3ebea;padding:4px 6px;color:#536866;font-variant-numeric:tabular-nums;font-size:12px}
.board-track{height:calc(var(--board-hour) * var(--board-hours));position:relative;background:repeating-linear-gradient(to bottom,transparent 0 calc(var(--board-hour) / 2 - 1px),#e8efee calc(var(--board-hour) / 2 - 1px) calc(var(--board-hour) / 2))}
.board-event{position:absolute;display:grid;align-content:start;gap:2px;overflow:hidden;border:2px solid white;border-left:4px solid #6c9ca5;border-radius:6px;text-align:left;background:#e6f2f3;color:#174852;padding:3px 7px;font:inherit;font-size:13px;line-height:1.2;cursor:pointer}
.board-event[aria-pressed=true]{outline:2px solid #195967;outline-offset:-2px;z-index:1}
.board-event-title{display:flex;align-items:center;justify-content:space-between;gap:5px;min-width:0}
.board-event-title strong,.board-event-time{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.board-event-title small,.board-event-time{font-size:11px}
.board-event-title small{flex:none;color:inherit}
.board-event-compact .board-event-time{display:none}
.board-event.waiting,.board-event.arrived{background:#fbf0da;border-left-color:#b98946;color:#654a20}
.board-event.in_progress{background:#e6f2e9;border-left-color:#639678;color:#245d45}
.board-event.ended,.board-event.left,.board-event.cancelled,.board-event.no_show{background:#edf2f1;border-left-color:#9bb1ac;color:#415c58}
.board-detail{background:#f8faf9;border:1px solid #d9e5e4;border-radius:10px;padding:14px}
.board-detail h3,.board-detail p{margin:0 0 10px}
.board-detail .board-detail-person{font-weight:700;font-size:17px;overflow-wrap:anywhere}
.board-detail-person small{display:inline-block;margin-left:4px;font-size:12px;color:#526b68}
.board-detail dl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;margin:12px 0;font-size:13px}
.board-detail dt,.board-detail-empty{color:#526b68}
.board-detail dd{margin:0;overflow-wrap:anywhere}
.board-detail .b-button{width:100%;margin-top:6px}
@media(max-width:960px){.appointment-board-layout{grid-template-columns:minmax(0,1fr)}}
</style>
