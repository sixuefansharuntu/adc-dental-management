# ADC 统一数据字典

当前32用例的统一设计；不含长期未诊邀约。PK主键、FK引用、UQ单列唯一、?可空；抽象类型不是可执行DDL。

## patient　患者

姓名电话不唯一；空过敏不代表无过敏。首次建档诊所与逐项过敏按DC25核验；普通修订保留建档来源，不由首次就诊推导。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| patient_id | ID | PK | 否 | 稳定技术标识 |
| name | STRING(100) |  | 否 | 姓名 |
| birth_date | DATE |  | 是 | 出生日期 |
| phone | STRING(40) |  | 是 | 电话 |
| contact_address | TEXT |  | 是 | 联系地址 |
| billing_address | TEXT |  | 是 | 账单地址 |
| email | STRING(254) |  | 是 | 可选邮箱 |
| source_note | TEXT |  | 是 | 来源 |
| introducer_note | TEXT |  | 是 | 适用时的介绍人说明 |
| allergy_knowledge | TEXT |  | 是 | unknown / none_reported / reported；旧NULL视为尚未了解 |
| allergy_note | TEXT |  | 是 | 补充或旧备注原文；不代替逐项过敏内容 |
| contact_preference | TEXT |  | 是 | 联系偏好 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| created_clinic_id | ID |  FK→clinic.clinic_id | 是 | 首次建档诊所；旧来源不明可空 |

## patient_allergy　患者过敏明细

每项明确过敏对象和可选说明，明细键在患者内稳定。集合与了解情况按DC25核验；未提交或无权集合不清空，与患者根及原版共同提交。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| patient_id | ID | PK FK→patient.patient_id | 否 | 所属患者 |
| item_key | ID | PK | 否 | 所属根内的稳定明细键；不依赖当前项存在 |
| allergen | STRING(200) |  | 否 | 实际报告的过敏对象 |
| description | TEXT |  | 是 | 该项说明 |

## patient_tag　患者标签



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| patient_id | ID | PK FK→patient.patient_id | 否 | 患者 |
| tag_text | STRING(100) | PK | 否 | 实际标签 |

## patient_channel　患者沟通渠道



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| channel_id | ID | PK | 否 | 稳定技术标识 |
| patient_id | ID |  FK→patient.patient_id | 否 | 患者 |
| channel_name | TEXT |  | 否 | 渠道名称 |
| association_note | TEXT |  | 是 | 渠道关联情况 |

## patient_revision　患者原版

不可变完整原版，包含当时建档诊所及完整过敏明细；业务修改、原版和审计共同提交。旧版不回读当前明细。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| patient_revision_id | ID | PK | 否 | 稳定技术标识 |
| patient_id | ID |  FK→patient.patient_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| name | STRING(100) |  | 否 | 姓名 |
| birth_date | DATE |  | 是 | 出生日期 |
| phone | STRING(40) |  | 是 | 电话 |
| contact_address | TEXT |  | 是 | 联系地址 |
| billing_address | TEXT |  | 是 | 账单地址 |
| email | STRING(254) |  | 是 | 可选邮箱 |
| source_note | TEXT |  | 是 | 来源 |
| introducer_note | TEXT |  | 是 | 适用时的介绍人说明 |
| allergy_knowledge | TEXT |  | 是 | unknown / none_reported / reported；旧NULL视为尚未了解 |
| allergy_note | TEXT |  | 是 | 补充或旧备注原文；不代替逐项过敏内容 |
| contact_preference | TEXT |  | 是 | 联系偏好 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |
| created_clinic_id | ID |  FK→clinic.clinic_id | 是 | 首次建档诊所；旧来源不明可空 |

组合唯一：['patient_id', 'version_no']

唯一空值语义：{"columns": ["patient_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## patient_revision_allergy　患者原版过敏明细

逐项复制本版过敏对象及说明；只引用不可变患者原版，不引用可变当前明细，不以当前项是否仍存在决定旧版内容。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| patient_revision_id | ID | PK FK→patient_revision.patient_revision_id | 否 | 所属不可变患者原版 |
| item_key | ID | PK | 否 | 所属根内的稳定明细键；不依赖当前项存在 |
| allergen | STRING(200) |  | 否 | 实际报告的过敏对象 |
| description | TEXT |  | 是 | 该项说明 |

## patient_revision_tag　患者原版标签



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| patient_revision_id | ID | PK FK→patient_revision.patient_revision_id | 否 | 患者原版 |
| tag_text | STRING(100) | PK | 否 | 当时标签 |

## patient_revision_channel　患者原版渠道



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| patient_revision_id | ID | PK FK→patient_revision.patient_revision_id | 否 | 患者原版 |
| channel_id | ID | PK FK→patient_channel.channel_id | 否 | 稳定渠道关联 |
| channel_name | TEXT |  | 否 | 当时渠道名 |
| association_note | TEXT |  | 是 | 当时关联情况 |

## employee　员工

同人跨店沿同一身份；岗位事实与账号访问角色不是同一概念。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| employee_id | ID | PK | 否 | 稳定技术标识 |
| name | STRING(100) |  | 否 | 姓名 |
| contact_info | TEXT |  | 是 | 联系方式 |
| personal_profile | TEXT |  | 是 | 个人资料 |
| employment_arrangement | TEXT |  | 是 | 任职安排 |
| professional_editor_id | ID |  FK→employee.employee_id | 是 | 专业资料修改人 |
| professional_edited_at | INSTANT |  | 是 | 专业资料修改时刻 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| public_name | STRING(100) |  | 是 | 明确允许公开的医生姓名 |
| public_specialty | TEXT |  | 是 | 允许公开的专业介绍 |
| public_intro | TEXT |  | 是 | 允许公开的简介 |
| public_enabled | BOOLEAN |  | 否 | 是否允许公开展示 |

## employee_skill　员工专业技能



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| employee_id | ID | PK FK→employee.employee_id | 否 | 员工 |
| skill_name | STRING(120) | PK | 否 | 一项专业技能 |

## employee_revision　员工原版

不可变完整列快照；业务修改、原版和审计共同提交。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| employee_revision_id | ID | PK | 否 | 稳定技术标识 |
| employee_id | ID |  FK→employee.employee_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| name | STRING(100) |  | 否 | 姓名 |
| contact_info | TEXT |  | 是 | 联系方式 |
| personal_profile | TEXT |  | 是 | 个人资料 |
| employment_arrangement | TEXT |  | 是 | 任职安排 |
| professional_editor_id | ID |  FK→employee.employee_id | 是 | 专业资料修改人 |
| professional_edited_at | INSTANT |  | 是 | 专业资料修改时刻 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |
| public_name | STRING(100) |  | 是 | 明确允许公开的医生姓名 |
| public_specialty | TEXT |  | 是 | 允许公开的专业介绍 |
| public_intro | TEXT |  | 是 | 允许公开的简介 |
| public_enabled | BOOLEAN |  | 否 | 是否允许公开展示 |

组合唯一：['employee_id', 'version_no']

唯一空值语义：{"columns": ["employee_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## employee_revision_skill　员工原版技能



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| employee_revision_id | ID | PK FK→employee_revision.employee_revision_id | 否 | 员工原版 |
| skill_name | STRING(120) | PK | 否 | 当时专业技能 |

## clinic　诊所

名称/地址非身份键；主管可空，不自动获得权限。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| clinic_id | ID | PK | 否 | 稳定技术标识 |
| name | STRING(150) |  | 否 | 名称 |
| address | TEXT |  | 是 | 地址 |
| contact_info | TEXT |  | 是 | 联系方式 |
| manager_id | ID |  FK→employee.employee_id | 是 | 当前主管 |
| area_value | DECIMAL(18,2) |  | 是 | 面积 |
| area_unit | TEXT |  | 是 | 面积单位 |
| created_by | ID |  FK→employee.employee_id | 否 | 创建人员 |
| created_at | INSTANT |  | 否 | 创建时刻 |
| updated_by | ID |  FK→employee.employee_id | 否 | 修改人员 |
| updated_at | INSTANT |  | 否 | 修改时刻 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## clinic_revision　诊所原版

不可变完整列快照；业务修改、原版和审计共同提交。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| clinic_revision_id | ID | PK | 否 | 稳定技术标识 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| name | STRING(150) |  | 否 | 名称 |
| address | TEXT |  | 是 | 地址 |
| contact_info | TEXT |  | 是 | 联系方式 |
| manager_id | ID |  FK→employee.employee_id | 是 | 当前主管 |
| area_value | DECIMAL(18,2) |  | 是 | 面积 |
| area_unit | TEXT |  | 是 | 面积单位 |
| created_by | ID |  FK→employee.employee_id | 否 | 创建人员 |
| created_at | INSTANT |  | 否 | 创建时刻 |
| updated_by | ID |  FK→employee.employee_id | 否 | 修改人员 |
| updated_at | INSTANT |  | 否 | 修改时刻 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |

组合唯一：['clinic_id', 'version_no']

唯一空值语义：{"columns": ["clinic_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## clinic_availability_plan　诊所业务启停安排



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| availability_id | ID | PK | 否 | 稳定技术标识 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 诊所 |
| effective_from | INSTANT |  | 否 | 适用起点 |
| effective_to | INSTANT |  | 是 | 适用终点 |
| business_enabled | BOOLEAN |  | 否 | 该安排允许业务 |
| reason | TEXT |  | 是 | 启停原因 |

## practice_assignment　跨店执业关系

同人同店重叠有效期间领域核验；终止不自动改约或改过往就诊。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| practice_id | ID | PK | 否 | 稳定技术标识 |
| employee_id | ID |  FK→employee.employee_id | 否 | 执业牙医 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 执业诊所 |
| valid_from | DATE |  | 否 | 有效起始日(含) |
| valid_to | DATE |  | 是 | 有效终止日(含) |
| practice_arrangement | TEXT |  | 否 | 执业启停安排 |
| affected_arrangements | TEXT |  | 是 | 已核对的影响安排引用 |
| updated_by | ID |  FK→employee.employee_id | 否 | 修改人员 |
| updated_at | INSTANT |  | 否 | 修改时刻 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## doctor_schedule　医生排班

终点晚于起点；按同医生范围保护跨店接诊时段。 排班稳定根的医生和诊所不迁移；改变该归属建立新的排班，时间或公开安排修改保留原版。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| schedule_id | ID | PK | 否 | 稳定技术标识 |
| doctor_id | ID |  FK→employee.employee_id | 否 | 排班医生 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 排班诊所 |
| starts_at | INSTANT |  | 否 | 时段起点 |
| ends_at | INSTANT |  | 否 | 时段终点 |
| can_receive | BOOLEAN |  | 否 | 可接诊安排 |
| change_reason | TEXT |  | 是 | 休息外出变更原因 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| public_status | STRING(20) |  | 否 | not_open / open / paused；未开放、开放、暂停 |
| capacity_limit | INT32 |  | 否 | 同一瞬间允许的有效预约数 |

组合唯一：['schedule_id', 'clinic_id', 'doctor_id']

## schedule_revision　排班原版

不可变完整列快照；业务修改、原版和审计共同提交。 version_no与本次doctor_schedule.row_version一致，所有可采用状态均有不可变原版。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| schedule_revision_id | ID | PK | 否 | 稳定技术标识 |
| schedule_id | ID |  FK→doctor_schedule.schedule_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| doctor_id | ID |  FK→employee.employee_id | 否 | 排班医生 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 排班诊所 |
| starts_at | INSTANT |  | 否 | 时段起点 |
| ends_at | INSTANT |  | 否 | 时段终点 |
| can_receive | BOOLEAN |  | 否 | 可接诊安排 |
| change_reason | TEXT |  | 是 | 休息外出变更原因 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |
| public_status | STRING(20) |  | 否 | not_open / open / paused；未开放、开放、暂停 |
| capacity_limit | INT32 |  | 否 | 同一瞬间允许的有效预约数 |

组合唯一：['schedule_id', 'version_no']

唯一空值语义：{"columns": ["schedule_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## appointment　就诊预约

未接通不取消；不猜固定治疗时长，不由预约推实际到院。 首诊可无正式档案，但须有经核验主体或前台已核实档案；姓名与必要联系保留。新约直接成立不经前台审批；采用版本、占用及留痕共同有效。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| appointment_id | ID | PK | 否 | 稳定技术标识 |
| patient_id | ID |  FK→patient.patient_id | 是 | 患者 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 预约诊所 |
| doctor_id | ID |  FK→employee.employee_id | 否 | 预约医生 |
| scheduled_at | INSTANT |  | 否 | 预约日期时间 |
| cancelled_at | INSTANT |  | 是 | 当前取消事实 |
| confirmation_note | TEXT |  | 是 | 确认及后续安排 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| booking_subject_id | ID |  FK→patient_booking_subject.booking_subject_id | 是 | 经核验本人主体；前台代办可空 |
| booked_name | STRING(100) |  | 否 | 核实的本次预约人姓名 |
| booked_contact | STRING(200) |  | 否 | 本次必要联系信息 |
| schedule_id | ID |  FK→doctor_schedule.schedule_id | 否 | 采用排班 |
| schedule_row_version | INT64 |  | 否 | 采用的排班原版号；与schedule_id组成历史引用 |
| service_version_id | ID |  FK→booking_service_version.service_version_id | 否 | 采用的不可变预约服务时长版 |
| scheduled_end_at | INSTANT |  | 否 | 本次安排终点 |
| rule_version_id | ID |  FK→clinic_booking_rule_version.rule_version_id | 否 | 已告知的不可变规则版 |
| cancel_cutoff_at | INSTANT |  | 否 | 该安排已告知的自助取消截止 |
| reschedule_cutoff_at | INSTANT |  | 否 | 该安排已告知的自助改约截止 |
| disposition | STRING(20) |  | 否 | active / cancelled / arrived / no_show |
| cancel_channel | STRING(30) |  | 是 | 取消渠道；未取消为空 |
| cancel_reason | TEXT |  | 是 | 取消依据；未取消为空 |
| no_show_verified_at | INSTANT |  | 是 | 人工核实未到时点 |
| no_show_verified_by | ID |  FK→employee.employee_id | 是 | 核实人员 |
| no_show_basis | TEXT |  | 是 | 窗口结束后的真实核实依据 |

## appointment_revision　预约原版

不可变完整列快照；业务修改、原版和审计共同提交。 首诊可无正式档案，但须有经核验主体或前台已核实档案；姓名与必要联系保留。新约直接成立不经前台审批；采用版本、占用及留痕共同有效。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| appointment_revision_id | ID | PK | 否 | 稳定技术标识 |
| appointment_id | ID |  FK→appointment.appointment_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| patient_id | ID |  FK→patient.patient_id | 是 | 患者 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 预约诊所 |
| doctor_id | ID |  FK→employee.employee_id | 否 | 预约医生 |
| scheduled_at | INSTANT |  | 否 | 预约日期时间 |
| cancelled_at | INSTANT |  | 是 | 当前取消事实 |
| confirmation_note | TEXT |  | 是 | 确认及后续安排 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |
| booking_subject_id | ID |  FK→patient_booking_subject.booking_subject_id | 是 | 经核验本人主体；前台代办可空 |
| booked_name | STRING(100) |  | 否 | 核实的本次预约人姓名 |
| booked_contact | STRING(200) |  | 否 | 本次必要联系信息 |
| schedule_id | ID |  FK→doctor_schedule.schedule_id | 否 | 采用排班 |
| schedule_row_version | INT64 |  | 否 | 采用的排班原版号；与schedule_id组成历史引用 |
| service_version_id | ID |  FK→booking_service_version.service_version_id | 否 | 采用的不可变预约服务时长版 |
| scheduled_end_at | INSTANT |  | 否 | 本次安排终点 |
| rule_version_id | ID |  FK→clinic_booking_rule_version.rule_version_id | 否 | 已告知的不可变规则版 |
| cancel_cutoff_at | INSTANT |  | 否 | 该安排已告知的自助取消截止 |
| reschedule_cutoff_at | INSTANT |  | 否 | 该安排已告知的自助改约截止 |
| disposition | STRING(20) |  | 否 | active / cancelled / arrived / no_show |
| cancel_channel | STRING(30) |  | 是 | 取消渠道；未取消为空 |
| cancel_reason | TEXT |  | 是 | 取消依据；未取消为空 |
| no_show_verified_at | INSTANT |  | 是 | 人工核实未到时点 |
| no_show_verified_by | ID |  FK→employee.employee_id | 是 | 核实人员 |
| no_show_basis | TEXT |  | 是 | 窗口结束后的真实核实依据 |

组合唯一：['appointment_id', 'version_no']

组合唯一：['appointment_revision_id', 'appointment_id']

唯一空值语义：{"columns": ["appointment_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["appointment_revision_id", "appointment_id"], "null_policy": "NON_NULL_VALUES"}

## appointment_contact　预约联系历史



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| contact_id | ID | PK | 否 | 稳定技术标识 |
| appointment_id | ID |  FK→appointment.appointment_id | 否 | 预约 |
| contacted_at | INSTANT |  | 否 | 真实联系时间 |
| employee_id | ID |  FK→employee.employee_id | 否 | 实际联系人员 |
| result_note | TEXT |  | 否 | 联系结果 |
| next_action | TEXT |  | 是 | 后续安排 |
| reached_patient | BOOLEAN |  | 否 | 本次真实联系到患者 |

## visit　实际就诊

无预约允许；一预约最多一次有效到院；不加患者日期唯一；四个实际时间由前台按事实登记。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| visit_id | ID | PK | 否 | 稳定技术标识 |
| patient_id | ID |  FK→patient.patient_id | 否 | 患者 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 实际诊所 |
| appointment_id | ID | UQ FK→appointment.appointment_id | 是 | 本次预约 |
| registrar_id | ID |  FK→employee.employee_id | 否 | 登记人员 |
| doctor_id | ID |  FK→employee.employee_id | 否 | 接诊医生 |
| arrived_at | INSTANT |  | 否 | 实际到院 |
| started_at | INSTANT |  | 是 | 接诊开始 |
| ended_at | INSTANT |  | 是 | 本次接诊结束 |
| left_at | INSTANT |  | 是 | 实际离开 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| appointment_revision_id | ID |  FK→appointment_revision.appointment_revision_id | 是 | 到院采用预约原版 |
| progress_basis | TEXT |  | 否 | 本次进展录入或核实更正的真实依据 |

## visit_revision　就诊原版

不可变完整列快照；业务修改、原版和审计共同提交。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| visit_revision_id | ID | PK | 否 | 稳定技术标识 |
| visit_id | ID |  FK→visit.visit_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| patient_id | ID |  FK→patient.patient_id | 否 | 患者 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 实际诊所 |
| appointment_id | ID |  FK→appointment.appointment_id | 是 | 本次预约 |
| registrar_id | ID |  FK→employee.employee_id | 否 | 登记人员 |
| doctor_id | ID |  FK→employee.employee_id | 否 | 接诊医生 |
| arrived_at | INSTANT |  | 否 | 实际到院 |
| started_at | INSTANT |  | 是 | 接诊开始 |
| ended_at | INSTANT |  | 是 | 本次接诊结束 |
| left_at | INSTANT |  | 是 | 实际离开 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |
| appointment_revision_id | ID |  FK→appointment_revision.appointment_revision_id | 是 | 到院采用预约原版 |
| progress_basis | TEXT |  | 否 | 本次进展录入或核实更正的真实依据 |

组合唯一：['visit_id', 'version_no']

组合唯一：['visit_revision_id', 'visit_id']

唯一空值语义：{"columns": ["visit_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["visit_revision_id", "visit_id"], "null_policy": "NON_NULL_VALUES"}

## visit_nurse　就诊配合护士

完整有效就诊至少一名护士，由同事务核验；不改为仅一名。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| visit_id | ID | PK FK→visit.visit_id | 否 | 就诊 |
| nurse_id | ID | PK FK→employee.employee_id | 否 | 配合护士 |

## visit_revision_nurse　就诊原版护士集合



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| visit_revision_id | ID | PK FK→visit_revision.visit_revision_id | 否 | 就诊原版 |
| nurse_id | ID | PK FK→employee.employee_id | 否 | 当时护士 |

## business_operation　业务操作历史

追加不可改；不记口令；多态定位不是受数据库FK约束的源关系。 actor_id与patient_actor_id恰一非空；患者仅能形成本人预约类操作。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| operation_id | ID | PK | 否 | 稳定技术标识 |
| actor_id | ID |  FK→employee.employee_id | 是 | 实际操作人员 |
| analysis_id | ID |  FK→analysis_run.analysis_id | 是 | 对应经营分析 |
| occurred_at | INSTANT |  | 否 | 操作保存时刻 |
| action_code | TEXT |  | 否 | 类别及动作 |
| subject_kind | TEXT |  | 否 | 受控对象种类 |
| subject_key | TEXT |  | 否 | 对象定位符(非FK) |
| before_content | DOCUMENT |  | 是 | 变更前值及原版 |
| after_content | DOCUMENT |  | 是 | 变更后值及本版 |
| reason | TEXT |  | 是 | 原因 |
| access_scope | DOCUMENT |  | 是 | 实际供阅及导出范围 |
| patient_actor_id | ID |  FK→patient_booking_subject.booking_subject_id | 是 | 患者本人操作主体；与员工操作人恰选一项 |

## operation_clinic　操作实际诊所范围



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| operation_id | ID | PK FK→business_operation.operation_id | 否 | 操作 |
| clinic_id | ID | PK FK→clinic.clinic_id | 否 | 实际范围 |

## command_dedup　成功命令去重

与业务/历史同事务成功；失败无成功行；旧键重试不覆盖后来更正。 仅在当前主体与命令及载荷完全匹配时返回同一结果；不泄露其他主体的相同键。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| request_key | STRING(64) | PK | 否 | 逻辑提交键 |
| actor_id | ID |  FK→employee.employee_id | 是 | 原提交人员 |
| command_code | TEXT |  | 否 | 受控命令种类 |
| payload_fingerprint | TEXT |  | 否 | 非凭据载荷指纹 |
| operation_id | ID | UQ FK→business_operation.operation_id | 否 | 成功原操作 |
| result_kind | TEXT |  | 否 | 受控结果种类 |
| result_key | TEXT |  | 否 | 原结果定位(非FK) |
| patient_actor_id | ID |  FK→patient_booking_subject.booking_subject_id | 是 | 患者本人操作主体；与员工操作人恰选一项 |

## patient_booking_subject　经核验预约主体

本人在线验证与前台核实预约人均可形成稳定预约主体，不是员工账号或正式患者档案。线上必须有verified_identity_key，人工核实必须有verified_by；不强迫电话首诊先注册登录。不由手机号匹配或合并主体/档案；人工主体转线上关联须另核本人依据，不凭同号开放历史。本人验证由独立验证适配边界提供已核验主体；具体认证机制及凭据生命周期在实施前确定，不默认短信。不保存口令或验证秘密。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| booking_subject_id | ID | PK | 否 | 稳定的本人预约主体标识 |
| verified_identity_key | STRING(200) | UQ | 是 | 线上验证机制的稳定本人标识；前台人工核实可空；非手机号 |
| verification_kind | STRING(20) |  | 否 | online / front_desk；核实来源 |
| verified_by | ID |  FK→employee.employee_id | 是 | 人工核实前台；线上核验可空 |
| verified_at | INSTANT |  | 否 | 身份核验时点 |
| contact_value | STRING(200) |  | 否 | 必要预约联系方式 |
| patient_id | ID |  FK→patient.patient_id | 是 | 经核实关联的正式档案；首次预约可空 |
| row_version | INT64 |  | 否 | 身份关联并发读取基准 |

## clinic_booking_rule_version　诊所预约规则版本

当前规则按诊所和办理时点选择已生效的最新版本；同一生效起点唯一。已采用行不可改，取消按预约已告知版本及截止核对，不追溯缩短旧约截止。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| rule_version_id | ID | PK | 否 | 规则版本技术标识 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 适用诊所 |
| version_no | INT64 |  | 否 | 该诊所规则版本号 |
| effective_from | INSTANT |  | 否 | 生效起点 |
| self_cancel_lead_minutes | INT32 |  | 否 | 自助取消须提前的分钟数 |
| self_reschedule_lead_minutes | INT32 |  | 否 | 自助改约须提前的分钟数 |
| self_service_enabled | BOOLEAN |  | 否 | 该版本允许自助办理 |
| created_by | ID |  FK→employee.employee_id | 否 | 维护人员 |
| created_at | INSTANT |  | 否 | 保存时刻 |

组合唯一：['clinic_id', 'version_no']

组合唯一：['clinic_id', 'effective_from']

组合唯一：['rule_version_id', 'clinic_id']

## booking_service_version　医生预约服务时长版本

同一诊所、医生、服务按办理时点取最新已生效版；已采用版不可改。预约服务不等于临床诊断或已实施治疗项目。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| service_version_id | ID | PK | 否 | 服务配置版本标识 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 适用诊所 |
| doctor_id | ID |  FK→employee.employee_id | 否 | 适用医生 |
| service_code | STRING(80) |  | 否 | 稳定预约服务代码 |
| version_no | INT64 |  | 否 | 同医生诊所服务的版本号 |
| service_name | STRING(120) |  | 否 | 患者可理解的预约服务名称 |
| duration_minutes | INT32 |  | 否 | 已配置预约时长；不由系统猜测 |
| effective_from | INSTANT |  | 否 | 生效起点 |
| enabled | BOOLEAN |  | 否 | 此配置是否开放 |
| created_by | ID |  FK→employee.employee_id | 否 | 维护人员 |
| created_at | INSTANT |  | 否 | 保存时刻 |

组合唯一：['clinic_id', 'doctor_id', 'service_code', 'version_no']

组合唯一：['clinic_id', 'doctor_id', 'service_code', 'effective_from']

组合唯一：['service_version_id', 'clinic_id', 'doctor_id']

## clinical_record　病历

 complete须有非空正文；pending须有明确待补说明，不与医生治疗确认或收款混同。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| record_id | ID | PK | 否 | 稳定技术标识 |
| visit_id | ID | UQ FK→visit.visit_id | 否 | 原就诊 |
| clinical_at | INSTANT |  | 否 | 诊疗时间 |
| body | TEXT |  | 是 | 病历正文 |
| pending_note | TEXT |  | 是 | 医生明确的待补说明 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| completeness | STRING(20) |  | 否 | pending / complete；正文待补或完整 |

## clinical_record_writer　病历书写医生

至少一名，写入和历史与病历共同保存；不授权前台代写。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| record_id | ID | PK FK→clinical_record.record_id | 否 | 病历 |
| doctor_id | ID | PK FK→employee.employee_id | 否 | 书写医生 |

## clinical_record_revision　病历原版

不可变完整列快照；业务修改、原版和审计共同提交。 complete须有非空正文；pending须有明确待补说明，不与医生治疗确认或收款混同。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| record_revision_id | ID | PK | 否 | 稳定技术标识 |
| record_id | ID |  FK→clinical_record.record_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| visit_id | ID |  FK→visit.visit_id | 否 | 原就诊 |
| clinical_at | INSTANT |  | 否 | 诊疗时间 |
| body | TEXT |  | 是 | 病历正文 |
| pending_note | TEXT |  | 是 | 医生明确的待补说明 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |
| completeness | STRING(20) |  | 否 | pending / complete；正文待补或完整 |

组合唯一：['record_id', 'version_no']

唯一空值语义：{"columns": ["record_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## record_revision_writer　病历原版书写医生



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| record_revision_id | ID | PK FK→clinical_record_revision.record_revision_id | 否 | 病历原版 |
| doctor_id | ID | PK FK→employee.employee_id | 否 | 当时医生 |

## treatment　实际治疗



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| treatment_id | ID | PK | 否 | 稳定技术标识 |
| visit_id | ID |  FK→visit.visit_id | 否 | 就诊 |
| item_id | ID |  FK→treatment_item.item_id | 否 | 实施项目 |
| confirming_doctor_id | ID |  FK→employee.employee_id | 否 | 确认医生 |
| performed_at | INSTANT |  | 否 | 实际实施时间 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| confirmed_at | INSTANT |  | 否 | 医生明确确认的保存时点；与实际实施时间分开 |

## treatment_tooth　治疗适用牙位

牙位多值展开，不强迫每牙位另建一条治疗。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| treatment_id | ID | PK FK→treatment.treatment_id | 否 | 治疗 |
| tooth_code | STRING(40) | PK | 否 | 一项适用牙位 |

## treatment_revision　实际治疗原版

采用时固定本版，后续更正追加另版。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| treatment_revision_id | ID | PK | 否 | 稳定技术标识 |
| treatment_id | ID |  FK→treatment.treatment_id | 否 | 稳定治疗 |
| version_no | INT64 |  | 否 | 治疗原版序号 |
| visit_id | ID |  FK→visit.visit_id | 否 | 就诊 |
| item_id | ID |  FK→treatment_item.item_id | 否 | 实施项目 |
| confirming_doctor_id | ID |  FK→employee.employee_id | 否 | 确认医生 |
| performed_at | INSTANT |  | 否 | 实际实施时间 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 本次保存操作 |
| confirmed_at | INSTANT |  | 否 | 医生明确确认的保存时点；与实际实施时间分开 |

组合唯一：['treatment_id', 'version_no']

组合唯一：['treatment_revision_id', 'treatment_id']

唯一空值语义：{"columns": ["treatment_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["treatment_revision_id", "treatment_id"], "null_policy": "NON_NULL_VALUES"}

## treatment_revision_tooth　治疗原版牙位

按当时集合完整复制；不从当前牙位重构。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| treatment_revision_id | ID | PK FK→treatment_revision.treatment_revision_id | 否 | 治疗原版 |
| tooth_code | STRING(40) | PK | 否 | 当时牙位 |

## clinical_image　诊疗影像

患者经原就诊推导，不另存可冲突患者外键。 当前目录只读当前归档关联；更正后原患者普通目录收回，历史仅受控追查。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| image_id | ID | PK | 否 | 稳定技术标识 |
| visit_id | ID |  FK→visit.visit_id | 否 | 归档就诊 |
| file_id | ID |  FK→file_asset.file_id | 否 | 受控文件 |
| archived_by | ID |  FK→employee.employee_id | 否 | 初次归档人员 |
| image_type | TEXT |  | 否 | 影像类别 |
| formed_at | INSTANT |  | 否 | 影像形成时间 |
| description | TEXT |  | 是 | 说明 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## clinical_image_revision　诊疗影像原版

不可变影像原版保留原归档关联及说明；同一影像身份更正不创建替代影像。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| image_revision_id | ID | PK | 否 | 影像原版标识 |
| image_id | ID |  FK→clinical_image.image_id | 否 | 稳定影像 |
| version_no | INT64 |  | 否 | 原版序号 |
| visit_id | ID |  FK→visit.visit_id | 否 | 当时归档就诊 |
| file_id | ID |  FK→file_asset.file_id | 否 | 原受控文件 |
| archived_by | ID |  FK→employee.employee_id | 否 | 初次归档人员 |
| image_type | TEXT |  | 否 | 当时影像类别 |
| formed_at | INSTANT |  | 否 | 实际形成时间 |
| description | TEXT |  | 是 | 当时说明 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 本次保存操作 |

组合唯一：['image_id', 'version_no']

唯一空值语义：{"columns": ["image_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## file_asset　受控文件元数据

文件存在性、权限及结果不明分别核对；元数据不冒充文件已可读取。 文件先在非公开存储准备、校验摘要和可读性，再确认业务归档；未绑定的prepared文件不得进入患者目录。下载逐次核权。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| file_id | ID | PK | 否 | 稳定技术标识 |
| storage_key | TEXT |  | 否 | 非公开存储定位 |
| media_type | TEXT |  | 否 | 媒体类型 |
| byte_size | INT64 |  | 否 | 文件字节数 |
| content_digest | TEXT |  | 否 | 完整性摘要 |
| availability_note | TEXT |  | 是 | 归档/失败/待核实说明 |
| created_by | ID |  FK→employee.employee_id | 否 | 归档人员 |
| created_at | INSTANT |  | 否 | 文件准备元数据建立时刻；业务归档时点另见操作历史 |
| lifecycle_state | STRING(20) |  | 否 | prepared / archived；归档成功不只凭元数据 |

## lab_order　义齿加工订单

加工方不自动等同物资供应商；不由接收推装戴。 当前要求版本取该订单已成功保存的最高version_no，要求提交须按订单row_version串行核验；不维护第二个可能失配的当前版本号。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| lab_order_id | ID | PK | 否 | 稳定技术标识 |
| treatment_id | ID |  FK→treatment.treatment_id | 否 | 治疗依据 |
| request_doctor_id | ID |  FK→employee.employee_id | 否 | 要求医生 |
| lab_party | TEXT |  | 否 | 实际加工方 |
| progress_pending_note | TEXT |  | 是 | 真实进度及未解问题 |
| updated_by | ID |  FK→employee.employee_id | 否 | 修订人员 |
| updated_at | INSTANT |  | 否 | 修订时刻 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| current_received_handover_id | ID |  FK→lab_handover.handover_id | 是 | 当前接收依据 |
| current_review_id | ID |  FK→lab_review.review_id | 是 | 当前有效临床核对 |
| has_open_usability_issue | BOOLEAN |  | 否 | 当前有登记未解可用性问题 |
| current_expected_return_at | INSTANT |  | 是 | 护士据实际进度更新的预计返回；不是实际接收 |

## lab_requirement_version　加工要求原版

 阶段事实与原操作共同保存；更正留旧值，延期不生成接收事实。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| requirement_id | ID | PK | 否 | 稳定技术标识 |
| lab_order_id | ID |  FK→lab_order.lab_order_id | 否 | 加工单 |
| version_no | INT64 |  | 否 | 要求版本 |
| requirement_text | TEXT |  | 否 | 医生加工要求 |
| expected_return_at | INSTANT |  | 是 | 预计返回 |
| doctor_id | ID |  FK→employee.employee_id | 否 | 本版要求医生 |
| recorded_at | INSTANT |  | 否 | 本版保存时刻 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 该阶段保存及必要留痕的原操作 |

组合唯一：['lab_order_id', 'version_no']

组合唯一：['requirement_id', 'lab_order_id']

唯一空值语义：{"columns": ["lab_order_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["requirement_id", "lab_order_id"], "null_policy": "NON_NULL_VALUES"}

## lab_handover　加工实际交接

 阶段事实与原操作共同保存；更正留旧值，延期不生成接收事实。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| handover_id | ID | PK | 否 | 稳定技术标识 |
| lab_order_id | ID |  FK→lab_order.lab_order_id | 否 | 加工单 |
| requirement_id | ID |  FK→lab_requirement_version.requirement_id | 否 | 交接采用要求 |
| employee_id | ID |  FK→employee.employee_id | 否 | 真实交接人员 |
| direction | TEXT |  | 否 | 送出/实际接收 |
| occurred_at | INSTANT |  | 否 | 实际交接时刻 |
| handover_content | TEXT |  | 否 | 交接数量内容及相符情况 |
| matches_requirement | BOOLEAN |  | 是 | 实际接收已核实相符 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 该阶段保存及必要留痕的原操作 |

组合唯一：['handover_id', 'requirement_id']

组合唯一：['handover_id', 'lab_order_id']

唯一空值语义：{"columns": ["handover_id", "requirement_id"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["handover_id", "lab_order_id"], "null_policy": "NON_NULL_VALUES"}

## lab_review　加工临床核对

要求、接收及问题均相容才可用；旧要求改变不沿用不相容旧核对。 阶段事实与原操作共同保存；更正留旧值，延期不生成接收事实。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| review_id | ID | PK | 否 | 稳定技术标识 |
| requirement_id | ID |  FK→lab_requirement_version.requirement_id | 否 | 核对原要求 |
| received_handover_id | ID |  FK→lab_handover.handover_id | 否 | 真实接收依据 |
| doctor_id | ID |  FK→employee.employee_id | 否 | 核对医生 |
| conclusion | TEXT |  | 否 | 可用/待核实及问题结论 |
| reviewed_at | INSTANT |  | 否 | 核对时刻 |
| is_usable | BOOLEAN |  | 否 | 医生明确核对可用 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 该阶段保存及必要留痕的原操作 |

组合唯一：['review_id', 'received_handover_id']

唯一空值语义：{"columns": ["review_id", "received_handover_id"], "null_policy": "NON_NULL_VALUES"}

## treatment_item　治疗项目



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| item_id | ID | PK | 否 | 稳定技术标识 |
| name | TEXT |  | 否 | 名称 |
| charge_unit | TEXT |  | 否 | 计费单位 |
| activation_arrangement | TEXT |  | 否 | 启停安排 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## item_price_version　项目价格版本

适用诊所集合非空，生效区间冲突须按项目/诊所重验。 金额、单位含义及采用诊所作为价目版本依据；采用后不可普通覆盖，调整建立新版本，不回算旧账单。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| price_version_id | ID | PK | 否 | 稳定技术标识 |
| item_id | ID |  FK→treatment_item.item_id | 否 | 项目 |
| amount | DECIMAL(18,4) |  | 否 | 金额 |
| effective_from | INSTANT |  | 否 | 有效起始 |
| effective_to | INSTANT |  | 是 | 有效终止 |
| version_no | INT64 |  | 否 | 价格版本 |
| created_by | ID |  FK→employee.employee_id | 否 | 价目版本维护人员 |
| created_at | INSTANT |  | 否 | 本版保存时点 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 本版维护留痕 |

组合唯一：['item_id', 'version_no']

唯一空值语义：{"columns": ["item_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## item_price_clinic　价格适用诊所



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| price_version_id | ID | PK FK→item_price_version.price_version_id | 否 | 价格版 |
| clinic_id | ID | PK FK→clinic.clinic_id | 否 | 诊所 |

## treatment_bill　治疗账单

合计由行计算；付款进展与实际收款一致，开单和实收分开，护士医生开费，前台仅获授权时协助。 待付款/已付款由唯一全额receipt是否存在派生，不另存易失配的付款布尔值；无正式单据的计算草稿不落正式账单表。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| bill_id | ID | PK | 否 | 稳定技术标识 |
| visit_id | ID | UQ FK→visit.visit_id | 否 | 原就诊 |
| creator_id | ID |  FK→employee.employee_id | 否 | 首次开单人 |
| opened_at | INSTANT |  | 否 | 开单时刻 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## bill_staff　账单相关医护

至少一位；保留真实参与，不从头衔猜全部业绩归属。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| bill_id | ID | PK FK→treatment_bill.bill_id | 否 | 账单 |
| employee_id | ID | PK FK→employee.employee_id | 否 | 相关医护 |

## treatment_bill_line　治疗账单项

小计=数量×采用单价，舍入及金额核对随业务规则；治疗至多对应一条有效项。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| bill_line_id | ID | PK | 否 | 稳定技术标识 |
| bill_id | ID |  FK→treatment_bill.bill_id | 否 | 所属账单 |
| treatment_id | ID | UQ FK→treatment.treatment_id | 否 | 已确认治疗 |
| price_version_id | ID |  FK→item_price_version.price_version_id | 否 | 采用原价版 |
| quantity | DECIMAL(18,4) |  | 否 | 计费数量 |
| adopted_unit_price | DECIMAL(18,4) |  | 否 | 实际采用单价 |

## bill_revision　治疗账单原版

不可变完整列快照；业务修改、原版和审计共同提交。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| bill_revision_id | ID | PK | 否 | 稳定技术标识 |
| bill_id | ID |  FK→treatment_bill.bill_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| visit_id | ID |  FK→visit.visit_id | 否 | 原就诊 |
| creator_id | ID |  FK→employee.employee_id | 否 | 首次开单人 |
| opened_at | INSTANT |  | 否 | 开单时刻 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |
| visit_revision_id | ID |  FK→visit_revision.visit_revision_id | 否 | 采用就诊人员原版 |

组合唯一：['bill_id', 'version_no']

组合唯一：['bill_revision_id', 'bill_id']

唯一空值语义：{"columns": ["bill_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["bill_revision_id", "bill_id"], "null_policy": "NON_NULL_VALUES"}

## bill_revision_staff　账单原版相关医护



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| bill_revision_id | ID | PK FK→bill_revision.bill_revision_id | 否 | 账单原版 |
| employee_id | ID | PK FK→employee.employee_id | 否 | 当时相关医护 |

## bill_revision_line　账单原版明细



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| revision_line_id | ID | PK | 否 | 稳定技术标识 |
| bill_revision_id | ID |  FK→bill_revision.bill_revision_id | 否 | 账单原版 |
| bill_line_id | ID |  FK→treatment_bill_line.bill_line_id | 否 | 稳定原行 |
| treatment_id | ID |  FK→treatment.treatment_id | 否 | 当时计费治疗 |
| price_version_id | ID |  FK→item_price_version.price_version_id | 否 | 当时价格版 |
| quantity | DECIMAL(18,4) |  | 否 | 原数量 |
| adopted_unit_price | DECIMAL(18,4) |  | 否 | 原采用单价 |
| treatment_revision_id | ID |  FK→treatment_revision.treatment_revision_id | 否 | 采用实际治疗原版 |
| item_name | TEXT |  | 否 | 当时治疗项目名 |
| charge_unit | TEXT |  | 否 | 当时计费单位 |

组合唯一：['bill_revision_id', 'bill_line_id']

唯一空值语义：{"columns": ["bill_revision_id", "bill_line_id"], "null_policy": "NON_NULL_VALUES"}

## receipt　统一收款

CHECK恰好一个原单外键非空；每原单至多一笔有效全额实收，不增加欠费或退费。 received_at是真实到账时点，registered_at为首次登记时点，修订时点由operation保存；不以开单或登记时间替代归季依据。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| receipt_id | ID | PK | 否 | 稳定技术标识 |
| bill_id | ID | UQ FK→treatment_bill.bill_id | 是 | 治疗原单 |
| sale_id | ID | UQ FK→product_sale.sale_id | 是 | 商品原单 |
| collector_id | ID |  FK→employee.employee_id | 否 | 收款登记人员 |
| amount | DECIMAL(18,2) |  | 否 | 实收金额 |
| payment_method | TEXT |  | 否 | 付款方式 |
| received_at | INSTANT |  | 否 | 实际收款时间 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| registered_at | INSTANT |  | 否 | 首次系统登记时刻；后续修订不重置 |
| recording_reason | TEXT |  | 是 | 补录或更正依据；正常即时登记可空 |

## receipt_revision　原实收版本

不可变完整列快照；业务修改、原版和审计共同提交。 两种采用原版恰选其一，并与bill_id/sale_id同源；金额、原项目/商品分类及归属依据不回读当前可变行。 received_at是真实到账时点，registered_at为首次登记时点，修订时点由operation保存；不以开单或登记时间替代归季依据。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| receipt_revision_id | ID | PK | 否 | 稳定技术标识 |
| receipt_id | ID |  FK→receipt.receipt_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| bill_id | ID |  FK→treatment_bill.bill_id | 是 | 治疗原单 |
| sale_id | ID |  FK→product_sale.sale_id | 是 | 商品原单 |
| collector_id | ID |  FK→employee.employee_id | 否 | 收款登记人员 |
| amount | DECIMAL(18,2) |  | 否 | 实收金额 |
| payment_method | TEXT |  | 否 | 付款方式 |
| received_at | INSTANT |  | 否 | 实际收款时间 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |
| bill_revision_id | ID |  FK→bill_revision.bill_revision_id | 是 | 采用治疗单原版 |
| sale_revision_id | ID |  FK→sale_revision.sale_revision_id | 是 | 采用销售单原版 |
| registered_at | INSTANT |  | 否 | 首次系统登记时刻；后续修订不重置 |
| recording_reason | TEXT |  | 是 | 补录或更正依据；正常即时登记可空 |

组合唯一：['receipt_id', 'version_no']

组合唯一：['receipt_revision_id', 'receipt_id']

唯一空值语义：{"columns": ["receipt_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["receipt_revision_id", "receipt_id"], "null_policy": "NON_NULL_VALUES"}

## product_sale　商品销售

付款由收款事实关联，交付由交付项表达；合计按销售行计算。 交付与付款独立；未交付只存销售，不预留或扣减库存。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| sale_id | ID | PK | 否 | 稳定技术标识 |
| patient_id | ID |  FK→patient.patient_id | 否 | 购买患者 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 销售诊所 |
| creator_id | ID |  FK→employee.employee_id | 否 | 首次开单前台 |
| opened_at | INSTANT |  | 否 | 开单时刻 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## product_sale_line　商品销售项



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| sale_line_id | ID | PK | 否 | 稳定技术标识 |
| sale_id | ID |  FK→product_sale.sale_id | 否 | 原销售 |
| material_id | ID |  FK→material.material_id | 否 | 可售物资 |
| quantity | DECIMAL(18,4) |  | 否 | 销售数量 |
| adopted_unit_price | DECIMAL(18,4) |  | 否 | 采用单价 |

## product_delivery_line　商品交付分配项

整次交付各原行合计核对；多库存来源分配不等于分批交付。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| delivery_line_id | ID | PK | 否 | 稳定技术标识 |
| sale_line_id | ID |  FK→product_sale_line.sale_line_id | 否 | 原销售行 |
| stock_id | ID |  FK→stock_balance.stock_id | 否 | 实际库存来源 |
| delivered_quantity | DECIMAL(18,4) |  | 否 | 实际交付数量 |
| delivered_at | INSTANT |  | 否 | 实际交付时刻 |
| delivered_by | ID |  FK→employee.employee_id | 否 | 实际交付登记前台 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 同一次整单交付的原操作 |

组合唯一：['sale_line_id', 'stock_id']

唯一空值语义：{"columns": ["sale_line_id", "stock_id"], "null_policy": "NON_NULL_VALUES"}

## sale_revision　商品销售原版

不可变完整列快照；业务修改、原版和审计共同提交。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| sale_revision_id | ID | PK | 否 | 稳定技术标识 |
| sale_id | ID |  FK→product_sale.sale_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| patient_id | ID |  FK→patient.patient_id | 否 | 购买患者 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 销售诊所 |
| creator_id | ID |  FK→employee.employee_id | 否 | 首次开单前台 |
| opened_at | INSTANT |  | 否 | 开单时刻 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |

组合唯一：['sale_id', 'version_no']

组合唯一：['sale_revision_id', 'sale_id']

唯一空值语义：{"columns": ["sale_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["sale_revision_id", "sale_id"], "null_policy": "NON_NULL_VALUES"}

## sale_revision_line　商品销售原版明细



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| sale_revision_line_id | ID | PK | 否 | 稳定技术标识 |
| sale_revision_id | ID |  FK→sale_revision.sale_revision_id | 否 | 销售原版 |
| sale_line_id | ID |  FK→product_sale_line.sale_line_id | 否 | 稳定原行 |
| material_id | ID |  FK→material.material_id | 否 | 当时商品 |
| classification | TEXT |  | 否 | 当时商品分类 |
| unit | TEXT |  | 否 | 当时计量单位 |
| quantity | DECIMAL(18,4) |  | 否 | 原数量 |
| adopted_unit_price | DECIMAL(18,4) |  | 否 | 原采用单价 |

组合唯一：['sale_revision_id', 'sale_line_id']

唯一空值语义：{"columns": ["sale_revision_id", "sale_line_id"], "null_policy": "NON_NULL_VALUES"}

## material　物资目录

目录新建不增加库存；material_id同时作为唯一目录编码，名称相近不自动合并。已引用单位不可直接重解释历史数量。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| material_id | ID | PK | 否 | 稳定技术标识 |
| name | TEXT |  | 否 | 名称 |
| classification | TEXT |  | 否 | 分类 |
| unit | TEXT |  | 否 | 计量单位 |
| specification | TEXT |  | 是 | 规格 |
| activation_arrangement | TEXT |  | 否 | 启停安排 |
| updated_by | ID |  FK→employee.employee_id | 否 | 目录修改人 |
| updated_at | INSTANT |  | 否 | 修改时刻 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## stock_balance　诊所物资库存

按原C的诊所、物资及适用批次效期范围唯一；空批次/效期只表示该字段尚未记录，不猜真实批次。已知不同效期不能强行合并；禁止负库存。 已被变动引用的范围身份不可就地换写；真实错填通过原用例更正并保留旧范围及调整依据，不新增跨店调拨业务。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| stock_id | ID | PK | 否 | 稳定技术标识 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 诊所 |
| material_id | ID |  FK→material.material_id | 否 | 物资 |
| batch_reference | TEXT |  | 是 | 适用批次 |
| expires_on | DATE |  | 是 | 适用有效期 |
| unit | TEXT |  | 否 | 单位 |
| quantity | DECIMAL(18,4) |  | 否 | 结存数量 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

组合唯一：['clinic_id', 'material_id', 'batch_reference', 'expires_on']

唯一空值语义：{"columns": ["clinic_id", "material_id", "batch_reference", "expires_on"], "null_policy": "NULLS_EQUAL"}

## stock_movement　库存变动来源

一次操作、同一真实来源和库存仅一条净变动；各来源可空唯一按非空值生效。更正按本次真实差量追加，不能改旧变动或无基准重复应用。 每个非空delivery_line_id仅一个实际变动，不能换请求键再次作用；交付来源增量与实际交付数量方向相反。 每个入库来源至多一个首次数量作用；商品交付唯一来源约束沿D156保留。已应用记录不可覆盖；盘点和领用更正按已作用事实的净差追加。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| movement_id | ID | PK | 否 | 稳定技术标识 |
| stock_id | ID |  FK→stock_balance.stock_id | 否 | 库存 |
| occurred_at | INSTANT |  | 否 | 实际变动时刻 |
| quantity_delta | DECIMAL(18,4) |  | 否 | 带方向数量变化 |
| receipt_id | ID |  FK→stock_receipt.stock_receipt_id | 是 | 入库来源 |
| issue_revision_id | ID |  FK→issue_revision.issue_revision_id | 是 | 本次领用原版 |
| delivery_line_id | ID |  FK→product_delivery_line.delivery_line_id | 是 | 交付来源 |
| stocktake_line_id | ID |  FK→stocktake_line.stocktake_line_id | 是 | 盘点调整来源 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 本次实际变动操作 |
| stock_version_before | INT64 |  | 否 | 本次库存写前版本 |
| stock_version_after | INT64 |  | 否 | 本次库存写后版本 |

组合唯一：['operation_id', 'receipt_id', 'stock_id']

组合唯一：['operation_id', 'issue_revision_id', 'stock_id']

组合唯一：['operation_id', 'delivery_line_id', 'stock_id']

组合唯一：['operation_id', 'stocktake_line_id', 'stock_id']

组合唯一：['delivery_line_id']

组合唯一：['receipt_id']

唯一空值语义：{"columns": ["operation_id", "receipt_id", "stock_id"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["operation_id", "issue_revision_id", "stock_id"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["operation_id", "delivery_line_id", "stock_id"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["operation_id", "stocktake_line_id", "stock_id"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["delivery_line_id"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["receipt_id"], "null_policy": "NON_NULL_VALUES"}

## followup_plan　随访方案稳定身份

停用只影响新选择；已保存版本和旧患者任务不改写。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| plan_id | ID | PK | 否 | 稳定技术标识 |
| enabled | BOOLEAN |  | 否 | 当前允许新安排 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## followup_plan_version　随访方案版本

本版连同节点、适用诊所及原操作共同保存；同项目同诊所生效区间冲突拒绝。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| plan_version_id | ID | PK | 否 | 稳定技术标识 |
| plan_id | ID |  FK→followup_plan.plan_id | 否 | 同一方案稳定身份 |
| item_id | ID |  FK→treatment_item.item_id | 否 | 适用治疗项目 |
| version_no | INT64 |  | 否 | 方案版本 |
| configured_by | ID |  FK→employee.employee_id | 否 | 本版配置人员 |
| configured_at | INSTANT |  | 否 | 本版配置时刻 |
| effective_from | INSTANT |  | 否 | 适用起点 |
| effective_to | INSTANT |  | 是 | 适用终点 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 方案版本保存留痕 |

组合唯一：['plan_id', 'version_no']

唯一空值语义：{"columns": ["plan_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## followup_plan_clinic　方案适用诊所

每版明确非空范围，不默认为全部诊所。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| plan_version_id | ID | PK FK→followup_plan_version.plan_version_id | 否 | 方案版 |
| clinic_id | ID | PK FK→clinic.clinic_id | 否 | 适用诊所 |

## followup_plan_node　方案联系节点

不把访谈中的某次间隔写成全局医学规则。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| node_id | ID | PK | 否 | 稳定技术标识 |
| plan_version_id | ID |  FK→followup_plan_version.plan_version_id | 否 | 方案版 |
| time_arrangement | TEXT |  | 否 | 配置的随访时间安排 |
| contact_content | TEXT |  | 否 | 联系内容 |
| clinical_purpose | TEXT |  | 否 | 医生提供的临床目的 |

组合唯一：['node_id', 'plan_version_id']

唯一空值语义：{"columns": ["node_id", "plan_version_id"], "null_policy": "NON_NULL_VALUES"}

## followup_task　治疗随访安排

有方案要固定版/节点且相符；无方案需具体医生要求。患者经治疗/就诊推导。 成功联系事实取历史reached_patient，待医生问题取未解决事项；两个状态独立，不另存容易失配的完成布尔值。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| followup_id | ID | PK | 否 | 稳定技术标识 |
| treatment_id | ID |  FK→treatment.treatment_id | 否 | 实际治疗 |
| plan_version_id | ID |  FK→followup_plan_version.plan_version_id | 是 | 采用方案版 |
| node_id | ID |  FK→followup_plan_node.node_id | 是 | 采用节点 |
| doctor_instruction | TEXT |  | 是 | 医生具体要求 |
| instruction_doctor_id | ID |  FK→employee.employee_id | 是 | 要求医生 |
| planned_at | INSTANT |  | 否 | 计划时间 |
| planned_content | TEXT |  | 否 | 联系内容 |
| responsible_id | ID |  FK→employee.employee_id | 否 | 当前负责人员 |
| next_action | TEXT |  | 是 | 后续安排 |
| updated_by | ID |  FK→employee.employee_id | 否 | 修订人员 |
| updated_at | INSTANT |  | 否 | 修订时刻 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## followup_contact　随访真实联系

未接通也追加，不能抹掉旧成功联系事实。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| followup_contact_id | ID | PK | 否 | 稳定技术标识 |
| followup_id | ID |  FK→followup_task.followup_id | 否 | 随访 |
| employee_id | ID |  FK→employee.employee_id | 否 | 真实联系人员 |
| contacted_at | INSTANT |  | 否 | 实际尝试时间 |
| channel | TEXT |  | 否 | 渠道 |
| result_feedback | TEXT |  | 否 | 联系结果及患者反馈 |
| next_action | TEXT |  | 是 | 后续安排 |
| reached_patient | BOOLEAN |  | 否 | 本次真实联系到患者 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 该次联系记录保存留痕 |

## followup_issue　随访待处理问题

转交不解决，所有未解问题处理后才可清除待处理。 来源联系若存在须同随访；临床记录若存在须同患者及有关治疗。解决需真实医生及非空处理依据，登记人不是临床判断人。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| followup_issue_id | ID | PK | 否 | 稳定技术标识 |
| followup_id | ID |  FK→followup_task.followup_id | 否 | 随访 |
| problem | TEXT |  | 否 | 需医生处理问题 |
| doctor_id | ID |  FK→employee.employee_id | 是 | 接手医生 |
| progress_conclusion | TEXT |  | 是 | 真实跟进及处理结论 |
| resolved_at | INSTANT |  | 是 | 按真实结论解决时刻 |
| source_contact_id | ID |  FK→followup_contact.followup_contact_id | 是 | 来源联系；必要时关联 |
| clinical_record_id | ID |  FK→clinical_record.record_id | 是 | 医生实际诊疗记录依据；有对应记录时关联 |
| clinical_basis | TEXT |  | 是 | 核实的医生处理依据；非护士诊断 |
| recorded_by | ID |  FK→employee.employee_id | 是 | 本次反馈登记护士或授权前台 |
| recorded_at | INSTANT |  | 是 | 本次反馈登记时点；非医生处理时点 |

## supplier　供应商

当前完整资料及附件集合的前后内容保存于business_operation，按row_version串联；不是另建通用事件溯源系统。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| supplier_id | ID | PK | 否 | 稳定技术标识 |
| name | TEXT |  | 否 | 名称 |
| contact_info | TEXT |  | 是 | 联系信息 |
| cooperation_info | TEXT |  | 是 | 合作资料 |
| activation_arrangement | TEXT |  | 否 | 合作启停安排 |
| pending_note | TEXT |  | 是 | 待补事项 |
| updated_by | ID |  FK→employee.employee_id | 否 | 修改人员 |
| updated_at | INSTANT |  | 否 | 修改时刻 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## supplier_file　供应商资质合同



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| supplier_file_id | ID | PK | 否 | 稳定技术标识 |
| supplier_id | ID |  FK→supplier.supplier_id | 否 | 供应商 |
| file_id | ID |  FK→file_asset.file_id | 否 | 受控附件 |
| file_purpose | TEXT |  | 否 | 资质/合同及说明 |

## stock_receipt　实际入库

仅初次实际接收产生一次正增量；后续补价只改价格依据和历史，不二次增加数量。数量/库存身份不普通覆盖；真实记错须先核实原来源及净差，不能伪作补价。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| stock_receipt_id | ID | PK | 否 | 稳定技术标识 |
| stock_id | ID |  FK→stock_balance.stock_id | 否 | 接收库存 |
| supplier_id | ID |  FK→supplier.supplier_id | 否 | 实际到货来源 |
| registrar_id | ID |  FK→employee.employee_id | 否 | 接收登记库管 |
| quantity | DECIMAL(18,4) |  | 否 | 实际接收数量 |
| unit | TEXT |  | 否 | 单位 |
| received_at | INSTANT |  | 否 | 接收时间 |
| unit_price | DECIMAL(18,4) |  | 是 | 价格资料 |
| batch_expiry_note | TEXT |  | 是 | 原批次效期资料 |
| pending_note | TEXT |  | 是 | 待核实事项 |
| row_version | INT64 |  | 否 | 当前补价并发版本 |
| source_reference | TEXT |  | 否 | 到货凭据编号或可核实来源说明 |
| file_id | ID |  FK→file_asset.file_id | 是 | 已准备成功的凭据附件；纸质可空 |
| registered_at | INSTANT |  | 否 | 本次实际接收的首次系统登记时间 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 首次入库登记原操作；补价留痕另存 |

## material_issue　材料领用出库

领用人不自动等于最终牙医成本归属；价格未明不能当0。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| issue_id | ID | PK | 否 | 稳定技术标识 |
| stock_id | ID |  FK→stock_balance.stock_id | 否 | 实发库存 |
| recipient_id | ID |  FK→employee.employee_id | 否 | 领用人员 |
| registrar_id | ID |  FK→employee.employee_id | 否 | 出库登记库管 |
| quantity | DECIMAL(18,4) |  | 否 | 数量 |
| unit | TEXT |  | 否 | 单位 |
| issued_at | INSTANT |  | 否 | 实际领用时间 |
| cost_unit_price | DECIMAL(18,4) |  | 是 | 核实的原成本单价 |
| pending_note | TEXT |  | 是 | 待核实事项 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## issue_revision　原领用版本

不可变完整列快照；业务修改、原版和审计共同提交。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| issue_revision_id | ID | PK | 否 | 稳定技术标识 |
| issue_id | ID |  FK→material_issue.issue_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| stock_id | ID |  FK→stock_balance.stock_id | 否 | 实发库存 |
| recipient_id | ID |  FK→employee.employee_id | 否 | 领用人员 |
| registrar_id | ID |  FK→employee.employee_id | 否 | 出库登记库管 |
| quantity | DECIMAL(18,4) |  | 否 | 数量 |
| unit | TEXT |  | 否 | 单位 |
| issued_at | INSTANT |  | 否 | 实际领用时间 |
| cost_unit_price | DECIMAL(18,4) |  | 是 | 核实的原成本单价 |
| pending_note | TEXT |  | 是 | 待核实事项 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |

组合唯一：['issue_id', 'version_no']

组合唯一：['issue_revision_id', 'issue_id']

唯一空值语义：{"columns": ["issue_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["issue_revision_id", "issue_id"], "null_policy": "NON_NULL_VALUES"}

## stocktake　盘点



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| stocktake_id | ID | PK | 否 | 稳定技术标识 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 盘点诊所 |
| initiator_id | ID |  FK→employee.employee_id | 否 | 发起库管 |
| scope_note | TEXT |  | 否 | 明确盘点范围 |
| baseline_at | INSTANT |  | 否 | 基准时点 |
| row_version | INT64 |  | 否 | 盘点聚合并发版本 |
| processed_at | INSTANT |  | 是 | 当前有效核实处理时刻 |
| processed_by | ID |  FK→employee.employee_id | 是 | 当前有效调整核实库管；未处理可空 |

## stocktake_line　盘点项

对齐差异按基准/期间净变动/实盘计算，不拿旧实盘覆盖当前结存。 原账面和版本固定；实盘同时间对齐，核实净差D减去已经作用的A才是本次增量。所有来源版本及核实依据进入操作留痕。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| stocktake_line_id | ID | PK | 否 | 稳定技术标识 |
| stocktake_id | ID |  FK→stocktake.stocktake_id | 否 | 原盘点 |
| stock_id | ID |  FK→stock_balance.stock_id | 否 | 原库存 |
| unit | TEXT |  | 否 | 单位 |
| baseline_quantity | DECIMAL(18,4) |  | 否 | 账面数量快照 |
| counted_at | INSTANT |  | 是 | 真实清点时点 |
| counted_quantity | DECIMAL(18,4) |  | 是 | 实盘数量 |
| period_net_movement | DECIMAL(18,4) |  | 是 | 基准至清点的已核对变动 |
| reason_pending_note | TEXT |  | 是 | 核实原因及待处理事项 |
| actual_adjustment | DECIMAL(18,4) |  | 是 | 该盘点项当前已有效作用的累计净差；不是本次重复增量 |
| baseline_stock_version | INT64 |  | 否 | 基准已包含的库存版本 |
| counted_by | ID |  FK→employee.employee_id | 是 | 实际清点登记库管；未清点可空 |

组合唯一：['stocktake_id', 'stock_id']

唯一空值语义：{"columns": ["stocktake_id", "stock_id"], "null_policy": "NON_NULL_VALUES"}

## qualification_version　牙医证书版本



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| qualification_version_id | ID | PK | 否 | 稳定技术标识 |
| qualification_id | ID |  FK→qualification.qualification_id | 否 | 所属稳定证书 |
| certificate_name | TEXT |  | 否 | 证书名称 |
| certificate_number | TEXT |  | 是 | 证书编号 |
| source_validity | TEXT |  | 是 | 来源及有效信息 |
| pending_note | TEXT |  | 是 | 待补说明 |
| review_conclusion | TEXT |  | 是 | 人工核对结论 |
| version_no | INT64 |  | 否 | 证书版本 |
| updated_by | ID |  FK→employee.employee_id | 否 | 修改人员 |
| updated_at | INSTANT |  | 否 | 修改时刻 |

组合唯一：['qualification_id', 'version_no']

唯一空值语义：{"columns": ["qualification_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## staff_account　员工账号

账号不转给他人；无业务授权不等于有临床许可；凭据不得写进操作历史。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| account_id | ID | PK | 否 | 稳定技术标识 |
| employee_id | ID | UQ FK→employee.employee_id | 否 | 真实员工 |
| login_name | STRING(100) | UQ | 否 | 登录名 |
| credential_verifier | TEXT |  | 否 | 不可逆凭据验证材料 |
| account_scope | TEXT |  | 是 | 账号所属范围说明 |
| activation_arrangement | TEXT |  | 否 | 启停安排 |
| opened_at | INSTANT |  | 否 | 开通时刻 |
| disabled_at | INSTANT |  | 是 | 实际停用时刻 |
| maintained_by | ID |  FK→employee.employee_id | 否 | 维护人员 |
| maintained_at | INSTANT |  | 否 | 维护时刻 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## security_role　访问角色



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| role_id | ID | PK | 否 | 稳定技术标识 |
| name | STRING(100) |  | 否 | 名称 |
| responsibility | TEXT |  | 是 | 职责 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## role_function　角色功能



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| role_version_id | ID | PK FK→role_version.role_version_id | 否 | 采用角色定义原版 |
| function_code | STRING(80) | PK | 否 | 允许功能代码 |

## access_grant　账号授权版本

空许可/零诊所不等于全连锁；保存时核对当前配置权及管理接续。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| grant_id | ID | PK | 否 | 稳定技术标识 |
| account_id | ID |  FK→staff_account.account_id | 否 | 目标账号 |
| version_no | INT64 |  | 否 | 许可版本 |
| effective_from | INSTANT |  | 否 | 生效起点 |
| effective_to | INSTANT |  | 是 | 终止时点 |
| object_scope | TEXT |  | 是 | 对象数据范围 |
| configured_by | ID |  FK→employee.employee_id | 否 | 配置人员 |
| configured_at | INSTANT |  | 否 | 配置时刻 |

组合唯一：['account_id', 'version_no']

唯一空值语义：{"columns": ["account_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## grant_role　授权采用角色



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| grant_id | ID | PK FK→access_grant.grant_id | 否 | 授权版 |
| role_version_id | ID | PK FK→role_version.role_version_id | 否 | 采用角色定义原版 |

## grant_clinic　授权允许诊所



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| grant_id | ID | PK FK→access_grant.grant_id | 否 | 授权版 |
| clinic_id | ID | PK FK→clinic.clinic_id | 否 | 允许诊所 |

## grant_field　授权字段及动作



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| grant_field_id | ID | PK | 否 | 稳定技术标识 |
| grant_id | ID |  FK→access_grant.grant_id | 否 | 授权版 |
| resource_code | STRING(80) |  | 否 | 资源种类 |
| field_code | STRING(100) |  | 否 | 字段代码 |
| action_code | STRING(40) |  | 否 | 查看/维护/导出动作 |

组合唯一：['grant_id', 'resource_code', 'field_code', 'action_code']

唯一空值语义：{"columns": ["grant_id", "resource_code", "field_code", "action_code"], "null_policy": "NON_NULL_VALUES"}

## operating_expense　运营费用当前资料

费用登记不是支付，不推牙医归属。凭据编号及来源说明按UC24核验；未知明确待补，疑似重复先核实，更正另留原版。 当前UC24维护；费用发生日期按业务时区解释，登记不代表支付，公共分配另在UC26核对。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| expense_id | ID | PK | 否 | 稳定技术标识 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 费用诊所 |
| creator_id | ID |  FK→employee.employee_id | 否 | 首次登记财务 |
| category | TEXT |  | 否 | 类别 |
| amount | DECIMAL(18,2) |  | 否 | 金额 |
| occurred_on | DATE |  | 否 | 发生日期 |
| pending_note | TEXT |  | 是 | 待补说明 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| voucher_reference | TEXT |  | 是 | 凭据编号或可追查的来源定位 |
| voucher_note | TEXT |  | 是 | 凭据来源说明 |

## quarter_run　季度核算上下文

原范围非空且不缩减；调整另版不重置首次完成时刻。 同一ADC业务时区和自然季度只一个上下文；首次结果标识与首次时刻成组保存，指向本季度已确认的全范围结果。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| quarter_id | ID | PK | 否 | 稳定技术标识 |
| quarter_label | TEXT |  | 否 | 业务季度 |
| business_timezone | TEXT |  | 否 | 业务时区 |
| quarter_end_at | INSTANT |  | 否 | 原季度结束时刻 |
| first_full_confirmed_at | INSTANT |  | 是 | 首次全范围正式确认 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| quarter_start_at | INSTANT |  | 否 | 自然季度首日零时；右端采用quarter_end_at |
| first_confirmed_result_id | ID |  FK→quarter_result_version.result_id | 是 | 首次全范围确认结果；以后不改 |

组合唯一：['business_timezone', 'quarter_start_at', 'quarter_end_at']

唯一空值语义：{"columns": ["business_timezone", "quarter_start_at", "quarter_end_at"], "null_policy": "NON_NULL_VALUES"}

## quarter_scope　季度原纳入诊所



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| quarter_id | ID | PK FK→quarter_run.quarter_id | 否 | 核算上下文 |
| clinic_id | ID | PK FK→clinic.clinic_id | 否 | 原诊所 |

## quarter_doctor_scope　季度原牙医诊所范围

原牙医/诊所组合固定，不能通过少分项绕过完整核算。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| quarter_id | ID | PK FK→quarter_run.quarter_id | 否 | 核算上下文 |
| clinic_id | ID | PK FK→clinic.clinic_id | 否 | 原诊所 |
| doctor_id | ID | PK FK→employee.employee_id | 否 | 原牙医 |

## quarter_submission　诊所季度资料版本



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| submission_id | ID | PK | 否 | 稳定技术标识 |
| quarter_id | ID |  FK→quarter_run.quarter_id | 否 | 核算上下文 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 提交诊所 |
| version_no | INT64 |  | 否 | 提交版本 |
| submitted_by | ID |  FK→employee.employee_id | 否 | 提交人员 |
| submitted_at | INSTANT |  | 否 | 提交时刻 |
| unresolved_note | TEXT |  | 是 | 当时未解决事项 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 本次固定提交留痕 |

组合唯一：['quarter_id', 'clinic_id', 'version_no']

组合唯一：['submission_id', 'quarter_id', 'clinic_id']

唯一空值语义：{"columns": ["quarter_id", "clinic_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["submission_id", "quarter_id", "clinic_id"], "null_policy": "NON_NULL_VALUES"}

## calculation_policy_version　核算口径原版



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| policy_version_id | ID | PK | 否 | 稳定技术标识 |
| version_no | INT64 |  | 否 | 口径版本 |
| business_timezone | TEXT |  | 否 | 业务时区 |
| income_rule | TEXT |  | 否 | 收入归集口径 |
| cost_rule | TEXT |  | 否 | 成本归集口径 |
| expense_rule | TEXT |  | 否 | 费用分配规则 |

## quarter_result_version　季度整批结果版本

一版完整整批，不是每牙医一份审批；人员和时间共同有/共同无。 本版状态显式保存；退回或确认终结本版，后续调整新建另一版。核算人与时点独立于复核确认人；前版须同季度，调整须原因。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| result_id | ID | PK | 否 | 稳定技术标识 |
| quarter_id | ID |  FK→quarter_run.quarter_id | 否 | 原核算范围 |
| policy_version_id | ID |  FK→calculation_policy_version.policy_version_id | 否 | 采用口径 |
| version_no | INT64 |  | 否 | 整批结果版本 |
| confirmed_by | ID |  FK→employee.employee_id | 是 | 正式确认人员 |
| confirmed_at | INSTANT |  | 是 | 本版正式确认时刻 |
| review_state | STRING(20) |  | 否 | pending_review / returned / confirmed |
| calculated_by | ID |  FK→employee.employee_id | 否 | 核算财务人员 |
| calculated_at | INSTANT |  | 否 | 本版计算保存时点 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 本版计算保存原操作 |
| previous_result_id | ID |  FK→quarter_result_version.result_id | 是 | 本版调整所依据的原版；首版可空 |
| change_reason | TEXT |  | 是 | 调整版须有核实原因；首版可空 |

组合唯一：['quarter_id', 'version_no']

组合唯一：['result_id', 'quarter_id']

唯一空值语义：{"columns": ["quarter_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["result_id", "quarter_id"], "null_policy": "NON_NULL_VALUES"}

## result_submission　整批采用提交版

同版同诊所只一份采用提交，核验同季度同诊所且覆盖原范围。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| result_id | ID | PK FK→quarter_result_version.result_id | 否 | 结果版 |
| clinic_id | ID | PK FK→clinic.clinic_id | 否 | 原诊所 |
| submission_id | ID |  FK→quarter_submission.submission_id | 否 | 该诊所采用提交版 |
| quarter_id | ID |  FK→quarter_run.quarter_id | 否 | 同一核算上下文 |

## result_review　整批复核结论历史

本版仅待复核可退回或确认；重复确认返回原结果，不追加第二个确认事实。人工意见不能由系统自动代作。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| review_id | ID | PK | 否 | 稳定技术标识 |
| result_id | ID |  FK→quarter_result_version.result_id | 否 | 原结果版 |
| employee_id | ID |  FK→employee.employee_id | 否 | 真实复核人员 |
| conclusion | TEXT |  | 否 | 退回/核对/正式确认及意见 |
| reviewed_at | INSTANT |  | 否 | 实际复核时刻 |
| decision | STRING(20) |  | 否 | return / confirm；与意见分开 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 退回或确认保存原操作 |

## quarter_result_line　牙医诊所结果分项

费用合计由分配项汇总，经营贡献按原口径派生；同员工跨店再合计。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| result_line_id | ID | PK | 否 | 稳定技术标识 |
| result_id | ID |  FK→quarter_result_version.result_id | 否 | 整批结果版 |
| doctor_id | ID |  FK→employee.employee_id | 否 | 一位牙医 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 一家诊所 |
| received_income | DECIMAL(18,2) |  | 否 | 已核实实收收入 |
| material_cost | DECIMAL(18,2) |  | 否 | 已核实材料成本 |
| quarter_id | ID |  FK→quarter_run.quarter_id | 否 | 原核算上下文 |

组合唯一：['result_id', 'doctor_id', 'clinic_id']

唯一空值语义：{"columns": ["result_id", "doctor_id", "clinic_id"], "null_policy": "NON_NULL_VALUES"}

## expense_allocation_line　费用分配项

按每份原费用版本核对可分配总额，不猜比例或把待分项作零。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| allocation_id | ID | PK | 否 | 稳定技术标识 |
| result_line_id | ID |  FK→quarter_result_line.result_line_id | 否 | 原业绩分项 |
| expense_revision_id | ID |  FK→expense_revision.expense_revision_id | 否 | 采用原费用版本 |
| adopted_amount | DECIMAL(18,2) |  | 否 | 核对分配金额 |
| basis | TEXT |  | 否 | 核实分配依据 |

组合唯一：['result_line_id', 'expense_revision_id']

唯一空值语义：{"columns": ["result_line_id", "expense_revision_id"], "null_policy": "NON_NULL_VALUES"}

## submission_receipt　提交原实收依据



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| submission_id | ID | PK FK→quarter_submission.submission_id | 否 | 提交版 |
| receipt_revision_id | ID | PK FK→receipt_revision.receipt_revision_id | 否 | 原收款版 |
| receipt_id | ID |  FK→receipt.receipt_id | 否 | 采用稳定来源 |

组合唯一：['submission_id', 'receipt_id']

唯一空值语义：{"columns": ["submission_id", "receipt_id"], "null_policy": "NON_NULL_VALUES"}

## submission_issue　提交原材料依据



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| submission_id | ID | PK FK→quarter_submission.submission_id | 否 | 提交版 |
| issue_revision_id | ID | PK FK→issue_revision.issue_revision_id | 否 | 原领用版 |
| issue_id | ID |  FK→material_issue.issue_id | 否 | 采用稳定来源 |

组合唯一：['submission_id', 'issue_id']

唯一空值语义：{"columns": ["submission_id", "issue_id"], "null_policy": "NON_NULL_VALUES"}

## submission_expense　提交原费用依据



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| submission_id | ID | PK FK→quarter_submission.submission_id | 否 | 提交版 |
| expense_revision_id | ID | PK FK→expense_revision.expense_revision_id | 否 | 原费用版 |
| expense_id | ID |  FK→operating_expense.expense_id | 否 | 采用稳定来源 |

组合唯一：['submission_id', 'expense_id']

唯一空值语义：{"columns": ["submission_id", "expense_id"], "null_policy": "NON_NULL_VALUES"}

## result_income_source　牙医实收来源核对

逐原交易去重并核对合计，不能把同一笔全额复制给多个牙医分项。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| income_source_id | ID | PK | 否 | 稳定技术标识 |
| result_line_id | ID |  FK→quarter_result_line.result_line_id | 否 | 业绩分项 |
| receipt_revision_id | ID |  FK→receipt_revision.receipt_revision_id | 否 | 采用原收款版 |
| adopted_amount | DECIMAL(18,2) |  | 否 | 核对归集金额 |
| basis | TEXT |  | 否 | 原归属核实依据 |

组合唯一：['result_line_id', 'receipt_revision_id']

唯一空值语义：{"columns": ["result_line_id", "receipt_revision_id"], "null_policy": "NON_NULL_VALUES"}

## result_material_source　材料成本来源核对

采用已核实数量、成本价和归属；不声称逐牙治疗精确耗材。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| material_source_id | ID | PK | 否 | 稳定技术标识 |
| result_line_id | ID |  FK→quarter_result_line.result_line_id | 否 | 业绩分项 |
| issue_revision_id | ID |  FK→issue_revision.issue_revision_id | 否 | 采用原领用版 |
| adopted_cost | DECIMAL(18,2) |  | 否 | 核对归集成本 |
| basis | TEXT |  | 否 | 核实归集依据 |

组合唯一：['result_line_id', 'issue_revision_id']

唯一空值语义：{"columns": ["result_line_id", "issue_revision_id"], "null_policy": "NON_NULL_VALUES"}

## result_unassigned_sale　未归属商品实收来源

保留诊所来源，不猜牙医、不当零、不重复归集已分项金额。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| unassigned_id | ID | PK | 否 | 稳定技术标识 |
| result_id | ID |  FK→quarter_result_version.result_id | 否 | 结果版 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 原诊所 |
| receipt_revision_id | ID |  FK→receipt_revision.receipt_revision_id | 否 | 原商品收款版 |
| unassigned_amount | DECIMAL(18,2) |  | 否 | 仍未归属牙医金额 |

组合唯一：['result_id', 'receipt_revision_id']

唯一空值语义：{"columns": ["result_id", "receipt_revision_id"], "null_policy": "NON_NULL_VALUES"}

## data_issue　资料检查问题

原对象整体缺失不造假源对象；通知不是解决，合理空项不补成有值。 问题当前状态显式保存，不从通知文本猜已解决；复查历史保原来源版本和解释。未知整个来源可用受控缺失定位，不伪造业务行。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| issue_id | ID | PK | 否 | 稳定技术标识 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 检查诊所 |
| period_note | TEXT |  | 是 | 检查期间 |
| source_locator | TEXT |  | 否 | 原来源或缺失定位 |
| category | TEXT |  | 否 | 问题类别 |
| severity | TEXT |  | 否 | 关键程度 |
| responsible_role | TEXT |  | 否 | 负责岗位 |
| handling_note | TEXT |  | 是 | 处理事项 |
| notification_note | TEXT |  | 是 | 真实通知情况 |
| recheck_conclusion | TEXT |  | 是 | 复查结论 |
| reasonable_blank | TEXT |  | 是 | 合理空项解释 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |
| resolution_state | STRING(20) |  | 否 | open / corrected / justified_blank |
| rechecked_by | ID |  FK→employee.employee_id | 是 | 最近真实复查人员；尚未复查可空 |
| rechecked_at | INSTANT |  | 是 | 最近复查保存时点；非仅通知 |

## issue_action　资料问题处理历史



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| issue_action_id | ID | PK | 否 | 稳定技术标识 |
| issue_id | ID |  FK→data_issue.issue_id | 否 | 问题 |
| employee_id | ID |  FK→employee.employee_id | 否 | 实际处理人 |
| occurred_at | INSTANT |  | 否 | 处理时刻 |
| action_conclusion | TEXT |  | 否 | 动作及核实结论 |
| action_kind | STRING(20) |  | 否 | assign / notify / recheck；实际动作 |
| source_basis | TEXT |  | 是 | 复查原记录和版本及解释依据；仅通知可空 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 问题处理原操作 |

## submission_problem　提交保留问题



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| submission_id | ID | PK FK→quarter_submission.submission_id | 否 | 提交版 |
| issue_id | ID | PK FK→data_issue.issue_id | 否 | 问题 |
| adopted_conclusion | TEXT |  | 否 | 提交当时结论 |

## quarter_problem　季度范围内问题

涵盖尚未提交诊所的缺漏问题，不只检查已提交资料内的问题；原范围与问题诊所/期间须相容。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| quarter_id | ID | PK FK→quarter_run.quarter_id | 否 | 核算上下文 |
| issue_id | ID | PK FK→data_issue.issue_id | 否 | 待检查问题 |

## practice_revision　执业关系原版

不可变完整列快照；业务修改、原版和审计共同提交。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| practice_revision_id | ID | PK | 否 | 稳定技术标识 |
| practice_id | ID |  FK→practice_assignment.practice_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| employee_id | ID |  FK→employee.employee_id | 否 | 执业牙医 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 执业诊所 |
| valid_from | DATE |  | 否 | 有效起始日(含) |
| valid_to | DATE |  | 是 | 有效终止日(含) |
| practice_arrangement | TEXT |  | 否 | 执业启停安排 |
| affected_arrangements | TEXT |  | 是 | 已核对的影响安排引用 |
| updated_by | ID |  FK→employee.employee_id | 否 | 修改人员 |
| updated_at | INSTANT |  | 否 | 修改时刻 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |

组合唯一：['practice_id', 'version_no']

唯一空值语义：{"columns": ["practice_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## expense_revision　原费用版本

不可变完整原版，固定当时凭据编号、来源说明及费用事实；与业务修改和审计共同提交。旧季度采用原版不回读后来更正。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| expense_revision_id | ID | PK | 否 | 稳定技术标识 |
| expense_id | ID |  FK→operating_expense.expense_id | 否 | 所属稳定业务对象 |
| version_no | INT64 |  | 否 | 该对象历史版本 |
| clinic_id | ID |  FK→clinic.clinic_id | 否 | 费用诊所 |
| creator_id | ID |  FK→employee.employee_id | 否 | 首次登记财务 |
| category | TEXT |  | 否 | 类别 |
| amount | DECIMAL(18,2) |  | 否 | 金额 |
| occurred_on | DATE |  | 否 | 发生日期 |
| pending_note | TEXT |  | 是 | 待补说明 |
| operation_id | ID |  FK→business_operation.operation_id | 否 | 形成此版的原操作 |
| voucher_reference | TEXT |  | 是 | 凭据编号或可追查的来源定位 |
| voucher_note | TEXT |  | 是 | 凭据来源说明 |

组合唯一：['expense_id', 'version_no']

组合唯一：['expense_revision_id', 'expense_id']

唯一空值语义：{"columns": ["expense_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

唯一空值语义：{"columns": ["expense_revision_id", "expense_id"], "null_policy": "NON_NULL_VALUES"}

## qualification　证书稳定身份

同一份证书修订保留同一身份；不同证书不因编号缺失而合并。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| qualification_id | ID | PK | 否 | 稳定技术标识 |
| employee_id | ID |  FK→employee.employee_id | 否 | 持证牙医 |
| row_version | INT64 |  | 否 | 并发更新读取基准 |

## role_version　角色功能原版

原定义与功能集合不可变，旧许可不回读可变角色模板。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| role_version_id | ID | PK | 否 | 稳定技术标识 |
| role_id | ID |  FK→security_role.role_id | 否 | 稳定角色 |
| version_no | INT64 |  | 否 | 角色定义版本 |
| name | TEXT |  | 否 | 本版角色名称 |
| responsibility | TEXT |  | 是 | 本版职责 |
| configured_by | ID |  FK→employee.employee_id | 否 | 配置人员 |
| configured_at | INSTANT |  | 否 | 本版保存时刻 |

组合唯一：['role_id', 'version_no']

唯一空值语义：{"columns": ["role_id", "version_no"], "null_policy": "NON_NULL_VALUES"}

## qualification_file　证书附件



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| qualification_version_id | ID | PK FK→qualification_version.qualification_version_id | 否 | 证书版 |
| file_id | ID | PK FK→file_asset.file_id | 否 | 附件 |

## analysis_run　经营分析查询原版

保存本次原查询条件、固定来源清单及原结果的单个聚合；允许未知分项，不把失败冒充完整结果。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| analysis_id | ID | PK | 否 | 稳定技术标识 |
| employee_id | ID |  FK→employee.employee_id | 否 | 实际查询人员 |
| analysis_type | TEXT |  | 否 | 分析类别与对象 |
| period_from | INSTANT |  | 否 | 期间起点 |
| period_to | INSTANT |  | 否 | 期间终点 |
| business_timezone | TEXT |  | 否 | 业务时区 |
| data_as_of | INSTANT |  | 否 | 固定数据时点 |
| statistical_rule | TEXT |  | 否 | 统计口径 |
| completeness_note | TEXT |  | 否 | 完整程度及未知待核实项 |
| queried_at | INSTANT |  | 否 | 实际查询时刻 |
| source_version_manifest | DOCUMENT |  | 否 | 原来源版本清单 |
| result_snapshot | DOCUMENT |  | 否 | 数量金额构成及未知项原结果 |

## analysis_scope　分析原诊所范围

范围非空，明细与导出分别授权。

| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| analysis_id | ID | PK FK→analysis_run.analysis_id | 否 | 分析 |
| clinic_id | ID | PK FK→clinic.clinic_id | 否 | 原诊所 |

## analysis_staff_scope　分析人员及维度



| 字段 | 类型 | 键/引用 | NULL | 含义 |
| --- | --- | --- | --- | --- |
| analysis_staff_scope_id | ID | PK | 否 | 稳定技术标识 |
| analysis_id | ID |  FK→analysis_run.analysis_id | 否 | 分析 |
| employee_id | ID |  FK→employee.employee_id | 是 | 选定人员 |
| dimension_definition | TEXT |  | 否 | 原维度与条件 |

## 组合引用

- CF01 visit['appointment_revision_id', 'appointment_id'] → appointment_revision['appointment_revision_id', 'appointment_id']
- CF02 visit_revision['appointment_revision_id', 'appointment_id'] → appointment_revision['appointment_revision_id', 'appointment_id']
- CF03 appointment['schedule_id', 'clinic_id', 'doctor_id'] → doctor_schedule['schedule_id', 'clinic_id', 'doctor_id']
- CF04 appointment['schedule_id', 'schedule_row_version'] → schedule_revision['schedule_id', 'version_no']
- CF05 appointment['rule_version_id', 'clinic_id'] → clinic_booking_rule_version['rule_version_id', 'clinic_id']
- CF06 appointment['service_version_id', 'clinic_id', 'doctor_id'] → booking_service_version['service_version_id', 'clinic_id', 'doctor_id']
- CF07 appointment_revision['schedule_id', 'clinic_id', 'doctor_id'] → doctor_schedule['schedule_id', 'clinic_id', 'doctor_id']
- CF08 appointment_revision['schedule_id', 'schedule_row_version'] → schedule_revision['schedule_id', 'version_no']
- CF09 appointment_revision['rule_version_id', 'clinic_id'] → clinic_booking_rule_version['rule_version_id', 'clinic_id']
- CF10 appointment_revision['service_version_id', 'clinic_id', 'doctor_id'] → booking_service_version['service_version_id', 'clinic_id', 'doctor_id']
- CF11 bill_revision_line['treatment_revision_id', 'treatment_id'] → treatment_revision['treatment_revision_id', 'treatment_id']
- CF12 lab_handover['requirement_id', 'lab_order_id'] → lab_requirement_version['requirement_id', 'lab_order_id']
- CF13 lab_review['received_handover_id', 'requirement_id'] → lab_handover['handover_id', 'requirement_id']
- CF14 receipt_revision['bill_revision_id', 'bill_id'] → bill_revision['bill_revision_id', 'bill_id']
- CF15 receipt_revision['sale_revision_id', 'sale_id'] → sale_revision['sale_revision_id', 'sale_id']
- CF16 bill_revision['visit_revision_id', 'visit_id'] → visit_revision['visit_revision_id', 'visit_id']
- CF17 lab_order['current_received_handover_id', 'lab_order_id'] → lab_handover['handover_id', 'lab_order_id']
- CF18 lab_order['current_review_id', 'current_received_handover_id'] → lab_review['review_id', 'received_handover_id']
- CF19 followup_task['node_id', 'plan_version_id'] → followup_plan_node['node_id', 'plan_version_id']
- CF20 submission_receipt['receipt_revision_id', 'receipt_id'] → receipt_revision['receipt_revision_id', 'receipt_id']
- CF21 submission_issue['issue_revision_id', 'issue_id'] → issue_revision['issue_revision_id', 'issue_id']
- CF22 submission_expense['expense_revision_id', 'expense_id'] → expense_revision['expense_revision_id', 'expense_id']
- CF23 quarter_doctor_scope['quarter_id', 'clinic_id'] → quarter_scope['quarter_id', 'clinic_id']
- CF24 quarter_submission['quarter_id', 'clinic_id'] → quarter_scope['quarter_id', 'clinic_id']
- CF25 result_submission['result_id', 'quarter_id'] → quarter_result_version['result_id', 'quarter_id']
- CF26 result_submission['submission_id', 'quarter_id', 'clinic_id'] → quarter_submission['submission_id', 'quarter_id', 'clinic_id']
- CF27 quarter_result_line['result_id', 'quarter_id'] → quarter_result_version['result_id', 'quarter_id']
- CF28 quarter_result_line['quarter_id', 'clinic_id', 'doctor_id'] → quarter_doctor_scope['quarter_id', 'clinic_id', 'doctor_id']
- CF29 quarter_result_line['result_id', 'clinic_id'] → result_submission['result_id', 'clinic_id']

## 行约束

- CK001 receipt['bill_id', 'sale_id']：每笔收款恰选一个原单据。
- CK002 receipt_revision['bill_id', 'sale_id']：收款原版恰选一种稳定原单。
- CK003 receipt_revision['bill_id', 'bill_revision_id']：治疗原单与治疗单原版成组存在。
- CK004 receipt_revision['sale_id', 'sale_revision_id']：商品原单与商品单原版成组存在。
- CK005 stock_movement['receipt_id', 'issue_revision_id', 'delivery_line_id', 'stocktake_line_id']：每条库存变动恰有一种真实来源。
- CK006 visit['appointment_id', 'appointment_revision_id']：无预约到院允许；有预约则固定采用原版。
- CK007 visit_revision['appointment_id', 'appointment_revision_id']：就诊原版保留同样的成组条件。
- CK008 visit['arrived_at', 'started_at', 'ended_at', 'left_at']：仅比较已知到院、开始、结束、离开事实，允许未接诊先离开。
- CK009 visit_revision['arrived_at', 'started_at', 'ended_at', 'left_at']：原版已知事实同样按真实时间相容。
- CK010 item_price_version['effective_from', 'effective_to']：已知终点不得早于起点；时间区间终点不含，执业日期起止均含。
- CK011 stock_balance['quantity']：已知数量/金额非负；可空成本价仍表示未核实，不补0。
- CK012 item_price_version['amount']：已知数量/金额非负；可空成本价仍表示未核实，不补0。
- CK013 receipt['amount']：已知数量/金额非负；可空成本价仍表示未核实，不补0。
- CK014 receipt_revision['amount']：已知数量/金额非负；可空成本价仍表示未核实，不补0。
- CK015 treatment_bill_line['adopted_unit_price']：已知数量/金额非负；可空成本价仍表示未核实，不补0。
- CK016 product_sale_line['adopted_unit_price']：已知数量/金额非负；可空成本价仍表示未核实，不补0。
- CK017 file_asset['byte_size']：已知数量/金额非负；可空成本价仍表示未核实，不补0。
- CK018 treatment_bill_line['quantity']：实际业务行数量必须大于0。
- CK019 product_sale_line['quantity']：实际业务行数量必须大于0。
- CK020 product_delivery_line['delivered_quantity']：实际业务行数量必须大于0。
- CK021 employee['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK022 clinic['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK023 patient['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK024 visit['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK025 clinical_record['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK026 treatment['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK027 clinical_image['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK028 lab_order['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK029 lab_requirement_version['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK030 treatment_item['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK031 item_price_version['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK032 treatment_bill['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK033 product_sale['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK034 receipt['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK035 material['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK036 stock_balance['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK037 employee_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK038 visit_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK039 clinical_record_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK040 bill_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK041 sale_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK042 receipt_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK043 treatment_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK044 lab_handover['direction']：交接方向取固定技术代码，保留实际交接内容。
- CK045 lab_order['current_review_id', 'current_received_handover_id']：有当前核对指针必须有当前接收指针；初次建单两者可空。
- CK046 lab_handover['direction', 'matches_requirement']：送出不填接收相符结论；接收NULL为未核实，不能当TRUE。
- CK047 stock_movement['stock_version_before', 'stock_version_after']：非负写前版，写后版等于写前版加1；同库存同次总写可含多来源变动，不加一版本一行错误唯一。
- CK048 patient['allergy_knowledge']：NULL或unknown表示尚未了解；none_reported表示患者表示无已知过敏；reported表示已报告具体过敏。不由空备注推导。
- CK049 clinical_record['completeness', 'body', 'pending_note']：complete有非空正文；pending有非空待补说明。
- CK050 clinical_record_revision['completeness', 'body', 'pending_note']：complete有非空正文；pending有非空待补说明。
- CK051 followup_task['plan_version_id', 'node_id']：有方案时节点与版本同时存在；无方案时两者同时空。
- CK052 followup_task['plan_version_id', 'doctor_instruction', 'instruction_doctor_id']：无方案时有非空医生要求及要求医生。
- CK053 followup_plan_version['effective_from', 'effective_to']：已知终点不得早于起点；时间区间终点不含，执业日期起止均含。
- CK054 material_issue['cost_unit_price']：已知数量/金额非负；可空成本价仍表示未核实，不补0。
- CK055 stock_receipt['unit_price']：已知数量/金额非负；可空成本价仍表示未核实，不补0。
- CK056 material_issue['quantity']：实际业务行数量必须大于0。
- CK057 stock_receipt['quantity']：实际业务行数量必须大于0。
- CK058 supplier['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK059 material_issue['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK060 followup_plan_version['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK061 followup_task['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK062 issue_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK063 followup_plan['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK064 followup_issue['resolved_at', 'doctor_id', 'progress_conclusion']：解除专业待处理须真实医生及具体处理依据；字段非空只是后备，不代替真实核验。
- CK065 stock_receipt['row_version']：当前补价版本为正；原字段不能据此自动补造。
- CK066 stocktake['row_version']：盘点所有子项变更共同推进同一根版本。
- CK067 stocktake_line['baseline_stock_version']：非负基准库存版本；必须来自实际一致性读取，不能据当前量猜旧值。
- CK068 followup_issue['resolved_at', 'doctor_id', 'clinical_basis', 'recorded_by', 'recorded_at']：解决时医生、真实处理依据、反馈登记人及时点齐全；未完成不填解决时刻。
- CK069 stocktake['processed_at', 'processed_by']：有效处理时点与核实人员成对；未处理均可空。
- CK070 stocktake_line['counted_at', 'counted_quantity', 'counted_by']：实盘时点、非负实盘数及登记库管成组保存，未清点不猜零。
- CK071 quarter_result_version['confirmed_by', 'confirmed_at']：确认人员与真实确认时刻成组保存。
- CK072 analysis_run['period_from', 'period_to']：结束必须晚于开始。
- CK073 practice_assignment['valid_from', 'valid_to']：已知终点不得早于起点；时间区间终点不含，执业日期起止均含。
- CK074 access_grant['effective_from', 'effective_to']：已知终点不得早于起点；时间区间终点不含，执业日期起止均含。
- CK075 clinic_availability_plan['effective_from', 'effective_to']：已知终点不得早于起点；时间区间终点不含，执业日期起止均含。
- CK076 operating_expense['amount']：已知数量/金额非负；可空成本价仍表示未核实，不补0。
- CK077 expense_revision['amount']：已知数量/金额非负；可空成本价仍表示未核实，不补0。
- CK078 practice_assignment['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK079 qualification_version['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK080 staff_account['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK081 security_role['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK082 access_grant['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK083 operating_expense['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK084 quarter_run['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK085 quarter_submission['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK086 calculation_policy_version['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK087 quarter_result_version['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK088 data_issue['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK089 clinic_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK090 practice_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK091 expense_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK092 qualification['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK093 role_version['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK094 quarter_run['first_full_confirmed_at', 'first_confirmed_result_id']：首次时点及首次结果同时有或同时无；存在时不得普通改写。
- CK095 quarter_result_version['review_state', 'confirmed_by', 'confirmed_at']：confirmed必须有确认人及时点；其余两状态不得带确认事实。
- CK096 quarter_result_version['previous_result_id', 'change_reason']：有前版的调整结果须非空核实原因，不能自指；首版不强填更正原因。
- CK097 data_issue['resolution_state', 'rechecked_by', 'rechecked_at', 'recheck_conclusion', 'reasonable_blank']：复查人员时点成对；解决态有复查依据和结论，合理空项还须解释。
- CK098 doctor_schedule['starts_at', 'ends_at']：结束必须晚于开始。
- CK099 doctor_schedule['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK100 appointment['row_version']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK101 patient_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK102 schedule_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK103 appointment_revision['version_no']：技术版本号为正数，不能据此代替权限或实际业务状态。
- CK104 patient_revision['allergy_knowledge']：NULL或unknown表示尚未了解；none_reported表示患者表示无已知过敏；reported表示已报告具体过敏。不由空备注推导。
- CK105 patient_allergy['allergen']：过敏对象去首尾空白后非空；说明可未知，不猜过敏程度。
- CK106 patient_revision_allergy['allergen']：过敏对象去首尾空白后非空；说明可未知，不猜过敏程度。

## 领域规则

- BR01 预约身份：appointment.patient_id与booking_subject_id至少一项非空；患者渠道必须绑定当前已验证主体。正式档案可空，姓名、必要联系不可空。
- BR02 区间与容量：starts_at < ends_at；scheduled_at < scheduled_end_at；capacity_limit > 0；duration_minutes > 0。预约区间起点含、终点不含。
- BR03 不可变采用：预约及其原版固定服务版、规则版和截止；改约后另存完整原版。历史已缺的主体、版本和截止不猜补，先只读核实或由前台办理。
- BR04 取消事实：cancelled才有cancelled_at、取消渠道和原因；no_show须有核实时间、人员和依据；arrived须与实际就诊一致。
- BR05 同范围引用：排班、服务版、规则版与预约诊所/医生一致，使用组合外键；服务适用、执业有效和当前启停由领域层重验。
- BR06 当前占用：直接从active或arrived预约区间计算已占用容量，不再存第二份可漂移的库存式预约余额；取消与未到事实生效后不再占用。
- BR07 本人及医生冲突：同一已核实本人不得重叠预约；医生跨店安排不能重叠。同店同时段按配置容量逐时点核验，不把多容量误写为一律禁止重叠。
- BR08 本人与员工留痕：business_operation及command_dedup的actor_id / patient_actor_id恰一非空，禁止伪造员工替代患者操作。
- BR09 实际到院：一预约最多一个有效visit；visit.patient_id必须有正式档案；appointment_id与appointment_revision_id同时可空或同时有值，且原版同根。到院关联与预约处置共同提交。
- BR10 接诊进展：前台分别据实登记四个时点，校验已知时点顺序；每次原版关联operation，留存登记时点、操作人、原值新值及依据，不从收费或病历推导。
- BR11 临床与收费：医生保存确认的实际治疗和牙位，护士不代定临床内容。病历正文可待补，已确认治疗可开费；结束、付款、离开均不自动补齐病历。
- BR12 归档与访问：先准备不可变文件，再确认正确就诊关联；文件未准备成功不建成功归档。供阅、对比、下载分别核当前字段及患者范围并留访问。
- BR13 加工可用依据：当前要求、正确接收和医生核对同根同版相容才可用；延期不当接收。要求或接收失效清除当前可用依据，不删除旧真实交接和结论。
- BR14 价目及草稿：参考价来自已维护的适用版本；医护提交数量并核价后才能算草稿。数量不默认1，不等于耗材；草稿不是正式单据或收入。
- BR15 唯一治疗单：treatment_bill.visit_id唯一；明细至少一行，treatment_id非空且当前有效项唯一。确认开单时重验治疗、价格、原基准和权限，失败不留半单。
- BR16 原版采用：bill_revision_line固定治疗原版、当时项目名、单位及价格；receipt_revision固定当时账单或销售版。更正临床、价目或商品目录不静默改旧依据。
- BR17 全额实收：receipt.bill_id与sale_id恰一非空，分别对非空值唯一。实际全额到账才登记；金额等于采用单据行合计，未收到不创建实收，重复返回原结果。
- BR18 三种时间：真实实施/交付/到账时间与系统登记时间不同。跨季补录按实际到账归季，影响已确认季度另版核算复核，不改原确认和首次完成时刻。
- BR19 付款与交付：销售单、实收、实际整次交付分别成立。开单、收款不扣库存；交付不推断已付款，不增加分批交付、退货或预留。
- BR20 整次交付数量：各销售行的库存分配合计等于该行原数量；库存物资、单位、诊所相符，同次交付时点及操作一致。先按同库存合并需求，再核验当前结存。
- BR21 唯一库存作用：交付项、来源变动、库存及必要留痕同事务。每个交付分配只扣一次，库存非负；不再用材料领用为同笔销售重复出库。
- BR22 人员与历史：UC07—14须有当前员工的相应权限；公共留痕虽支持患者主体，本组临床收费写入不能用患者身份。正常新建不强填更正原因，实际更正保留原内容。
- BR23 方案采用：方案版明确治疗项目、非空诊所集合、节点时间内容及生效范围。同项目同诊所生效区间不得矛盾；节点与采用版本用组合引用兜底。
- BR24 任务来源：任务关联实际治疗，患者和诊所经治疗/就诊推导。无方案须具体医生要求及提供医生；不把访谈中的某次间隔设为全局医疗规则。
- BR25 两种进展：实际联系成功与仍有医生问题并存。未接通也留尝试，不抹旧成功；转交或通知医生不等于问题已解决。
- BR26 专业处理：护士或授权前台据实登记医生处理反馈和依据，关联医生与可用临床记录。医生临床判断仍在UC08，不新增医生直接操作UC15角色。
- BR27 历史及范围：方案修改停用不改旧任务、旧节点；任务调整需重新核对。待办按责任人、日期及当前患者联系偏好供阅，不增加长期未就诊邀约或自动外呼。
- BR28 库存身份：同诊所、物资、批次、效期及单位解释同一库存；未知批次效期不猜填，不同已知效期不合并。空值唯一语义明确，结存非负。
- BR29 真实入库：实际接收正数量才增库存，保存原凭据及供应商。每个入库来源只作用一次；补价不改数量。缺价格为待核实，不是零成本。
- BR30 真实领用：实发领用才减库存，领用人员和登记库管分开。数量不等于逐治疗耗用，领用人不自动等于牙医成本归属；销售交付不重复领用出库。
- BR31 盘点对齐：原账面Q0及库存版本固定。清点时点t的可比账面为Q0加核实期间净变动M，核实差D＝实盘C－(Q0＋M)。晚录来源按原基准已包含与否对齐，不重复算。
- BR32 盘点净差：本次实际增量＝新核实差D－已作用差A；应用至当前结存后，将A记为D。未核实不调整，失败无半份结果，重复不再作用；不以旧实盘覆盖当前。
- BR33 来源守恒：变动恰选入库、领用原版、商品交付或盘点项一种来源，带方向且同库存。领域核数量守恒、根版本和权限，库层守键、非空、数值及来源XOR。
- BR34 目录及附件：停用目录/供应商保留历史，不自动合并主体。单位已引用不得直接改义；附件先准备成功再关联，失败标待补，不冒称已归档或完成外部资质认证。
- BR35 按次预警：本次选择数量维度才核非负阈值且低于时预警；效期维度区分已到期、所选临期及缺失。返回查询时点及条件，不新增永久阈值配置或自动采购报废。
- BR36 季度及原范围：按明确业务时区的自然季度[首日零时,下一季度首日零时)归集；原诊所集合及牙医诊所组合非空并固定，不允许删掉缺资料成员绕过确认。
- BR37 来源版本：每份提交按稳定实收、领用、费用各采用一份完整原版；同根、同诊所和期间必须相符。提交是固定内容，不是后来会变的当前查询列表。
- BR38 实收口径：实际到账时间归季，登记时间另存；待付款不计收入，开单不等于到账。跨季补录或时间更正同时查受影响原季度，新版重核不覆盖旧结果。
- BR39 来源守恒：逐稳定实收核分项归集与未归属商品余额，合计等于原实收；逐领用核归集成本；逐费用核分配合计等于原费用。不换历史版本重复归集同一来源。
- BR40 未知不作零：单价、牙医归属或交易关键问题未核实，不造零分项冒充可确认结果。未归属商品实收保留诊所；非关键病历附件待补不等于不能正常结算。
- BR41 整批计算：每分项对应同一牙医在一家诊所；分项集合恰等于原组合范围，跨店员工用同一身份合计。经营贡献＝实收－材料成本－分配费用，不是工资或奖金。
- BR42 人工与系统：总部负责人查原版和分配，人工决定退回或明确同意；系统只重验权限、关键问题、原范围、来源和结果基准，不替人批准。
- BR43 首次与调整：确认快照、确认事实和首次全范围标记同事务。首次时点及指向结果以后不重置；退回或确认版不倒退，后续核对以有原因的新版本复核。
- BR44 问题复查：分派、通知、补正、复查分别留历史；通知不关闭。补正回有权原用例，合理空项留解释，不给检查人员任意改病历权限。
- BR45 查询及导出：结果、来源、字段和导出各核当前权限。季度展示原确认版，不回读当前资料重算；经营日报分接诊/开单/实收，工作量不是工资，分类与支付方式两维度不相加。
- BR46 账号及授权：账号关联唯一真实员工，登录名唯一且不转给他人。功能、诊所、对象及字段共同限制；空范围不当全连锁，停用限制后续请求，凭据不进界面结果或日志。
- BR47 授权接续：修改角色功能时按受影响账号共同生成有效许可新版本；保存前重验可授范围与至少一个有效管理接续。管理员不因此取得全部临床权限。
- BR48 牙医基础：同牙医跨店沿统一身份；专业、证书、执业和公开介绍分支分别维护，未提交集合不清空。关系变化只列未来影响，排班预约回UC04/05处理，不代患者接受改约。
- BR49 公开及文件：公开仅明确选定姓名、专业及介绍；不发布内部联系方式或证书附件。文件沿D156先准备再关联，失败待补，证书登记不等于外部资格认证。
- BR50 诊所基础：稳定诊所键不因改名改址改变；基础维护不自动授跨店权限。自助规则及已告知截止沿D155留版，5分钟仅联系提醒，不自动取消或标未到。

## 诊疗收费与销售实现约束



沿用既有拟议金额口径：数量/单价十进制4位，逐行乘积四舍五入到2位，再汇总；实施前固定统一舍入算法，不能用二进制浮点。金额或数量溢出应拒绝。
金额及数量的正值/非负、单笔来源XOR、原单与原版同时有值由行约束兜底；至少一行、金额相等、跨表患者/就诊/项目/诊所和库存数量守恒由领域层在共同事务中核验。
所有版本按稳定根、version_no唯一；当前row_version与该次完整原版相对应。采用的历史行、集合及文件字节不可普通覆盖。
参考价按项目、诊所和生效时点确定唯一版本：同一适用诊所的新版本起点截断旧版在该诊所的可选区间，不覆写原价版的金额和原有效期；原有效终点如更早仍生效。同一生效起点存在多个适用版本则拒绝。旧版不能因新版本到期而自动复活。
索引沿主键、唯一和常用FK建立；另按clinical_record(visit_id)、treatment(visit_id)、clinical_image(visit_id,formed_at)、lab_handover(lab_order_id,occurred_at)、receipt(received_at)、business_operation(subject_kind,subject_key,occurred_at)支持检索。
数据库外键存在不等于当前人有访问权限；诊疗供阅、文件预览、下载及历史回查均核当次授权。


## 随访与物资实现约束



方案版、节点及适用诊所不可普通覆盖；当前资料、完整附件集合或任务安排的更正前后内容由business_operation保存。普通新建不强填更正原因。
联系和问题关联同一随访；专业依据若引用临床记录须核同患者及有关治疗。resolved_at表示经核实的真实处理时点，recorded_at为反馈登记时点。
补价只补价格/待补说明及历史，不允许顺便改已作用数量或库存身份；真实数量记错需核实原事实、已作用变动和净差，不通过新建伪入库补正。
库存增量统一走唯一真实来源：入库增加、领用减少、实际商品交付减少、盘点核实净差正负均可。每个入库及交付来源只首次作用一次；同盘点项允许后续核实净差，但不能重复应用相同原基准结果。
已应用盘点若因晚录来源需复核，重新核定同一清点时点的D；A取本盘点项历史变动累计，不把其他盘点调整混入普通期间收发，避免同一差异再次补偿。基准版本已包含的来源不重复加到M；未含且实际发生于清点前的来源才补入，必要证据不足保持待处理。
同库存写入遵守D156统一固定根顺序。并发新库存创建由组合唯一及冲突重读处理，不只锁不存在的行；未知批次效期的NULLS_EQUAL语义由产品选型后实现。
数量十进制4位，不用浮点；单位一致且数量非负。成本未知保留NULL及待核实说明，不用0替代，不引入未经核实单位换算。
数据库约束守主外键、组合引用、非空、数值及来源XOR；同诊所、同患者、方案冲突、库存守恒、净差对齐、当前权限由领域层在共同事务内重验。
查询索引：followup_task(responsible_id,planned_at)、followup_contact(followup_id,contacted_at)、followup_issue(followup_id,resolved_at)、stock_balance(clinic_id,material_id,expires_on)、stock_movement(stock_id,stock_version_after)、stock_receipt(stock_id,received_at)、material_issue(stock_id,issued_at)。


## 季度与基础管理实现约束



自然季度起止按同一业务时区计算，不以季度标签字符串参与计算；季度起点、终点及标签相符。原范围固定，来源跨季度改期核原新两边，既有确认版均不可覆盖。
提交的三类桥接行与稳定根/原版组合FK防错根；结果采用提交及分项组合FK防错季度诊所。成员合法只是必要条件，领域仍要核原集合相等、每诊所恰一提交、源范围及无重复。
采用的每笔实收，牙医归集与未归属商品余额合计等于实收金额；治疗来源归属未核实不能当未归属商品隐藏。按采用领用数量×核实单价核成本并与归集明细合计一致；每笔费用分配合计相符。未知阻止可确认结果，不伪存零值。
材料成本按明确领用期间归集，不声称逐牙治疗精确耗用。数值沿十进制定点及原采用舍入口径；材料逐来源核算成本、费用逐来源分配合计，最后汇总，不能二进制浮点回算或用现行价替代原价。
result_line保存核实收入和材料成本；费用为expense_allocation_line合计，经营贡献由三者派生，不多存第二份易失配的费用/贡献数。未归属商品收入保诊所，不自动灌进牙医分项。
结果保存明确review_state；pending_review可一次退回或确认，returned/confirmed终结本版。previous_result_id须同季度、已存在且非自身；调整原因非空，新版号在稳定季度根保护下生成。确认时点为系统成功保存确认的时点，不采用人工回填替代首次完成指标。
首次全范围完成指针及时间同事务仅由空设一次；必须指向本季度完整已确认结果。后续调整不回写首次指针或首次时刻。确认、问题复查及相关来源修改遵守同一固定根顺序和保护协议，不能只在界面读取后无条件确认。
影响待复核结果的来源修改或补录会使基准校验失效；保存提交/结果/确认时同时核原源版本及原范围内新增来源，不能只检查清单中已存在的行。统一诊所期间保护覆盖新增来源的并发写入；原始来源写入也参加该协议，而不是单方锁核算行。
当前有权只读或导出仍核来源字段权限，历史快照不作为绕过当前授权的后门。经营分析保存受控原条件、来源版本清单和原结果；DOCUMENT限有schema版本的白名单结构，不执行任意脚本，不替代规范业务外键。
员工账号credential_verifier只存安全认证实现所需验证材料，不存可读口令，不写普通审计前后内容；方案未指定认证产品，认证流程与凭据存储需后续实现验证。当前停用及许可版本在每次新请求重验，不只依赖旧登录状态或隐藏按钮。
角色功能改变先固定当前受影响账号集合，在共同保存内核可授上限、更新角色功能版本及这些账号的许可版。新授角色与功能变更在同一角色/授权配置保护范围内处理，避免并发漏掉新关联账号；任一步失败整体回滚。
管理接续按当前可登录账号及有效管理功能和配置范围核验，不只数管理员角色名字；保存前核本次撤销/停用生效后的状态，并保护管理配置范围，防并发各删一个导致全失。未来生效变更不得覆盖已知管理能力而留下空档。
启停、有效日期和公开状态分别解释；执业有效日期起止含当日，预约时点区间右端不含。未提交技能、证书和附件集合保留，明确修改的集合整体核对并与原版历史共同保存。
来源定位、影响安排说明及审计subject_key为受控逻辑定位，不在ERD冒充FK。附件元数据存在不证明可读，先准备非公开文件再关联，不假称外部文件和数据库天然同事务。
建议检索：quarter_submission(quarter_id,clinic_id,version_no)、quarter_result_version(quarter_id,version_no)、data_issue(clinic_id,resolution_state)、receipt(received_at)、material_issue(issued_at)、operating_expense(occurred_on)、access_grant(account_id,effective_from)、practice_assignment(employee_id,clinic_id)。


## 本人验证与岗位入口衔接（166）

本人验证由独立验证适配边界提供已核验主体，不把手机号匹配当身份认证。线上须绑定verified_identity_key，人工核实记录verified_by；本人操作仅访问绑定主体的预约。具体认证机制及凭据生命周期在实施前确定，本稿未声称已实现，不默认短信。

UC11：诊所管理人员或获授权前台；UC25：诊所管理人员；UC29：前台、财务、总部按B的功能和数据范围分别使用。医护开单属于UC12，不等于参考价维护。
