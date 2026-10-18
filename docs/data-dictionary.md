# ADC全系统逻辑数据字典

与本版单页总ERD同源；不是DDL或已经部署的数据库。
ID为稳定技术标识；INSTANT按业务时区解释并规范化；DATE为业务日期；定点金额/数量与STRING长度仍是候选。DOCUMENT使用106已定义schema及受控定位，不替代业务FK。
PK非空；单列UQ与组合唯一分别列出；默认RESTRICT保留历史。NULL不是0、无过敏、未过期或全权限。

## 组织执业与访问控制

### employee　员工

同人跨店沿同一身份；岗位事实与账号访问角色不是同一概念。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|employee_id|ID|PK|非空 / 无默认|稳定技术标识|
|name|STRING(100)||非空 / 无默认|姓名|
|contact_info|TEXT||可空 / 无默认|联系方式|
|personal_profile|TEXT||可空 / 无默认|个人资料|
|employment_arrangement|TEXT||可空 / 无默认|任职安排|
|professional_editor_id|ID|FK|可空 / 无默认|专业资料修改人 -> employee.employee_id|
|professional_edited_at|INSTANT||可空 / 无默认|专业资料修改时刻|
|row_version|INT64||非空 / 1|并发更新读取基准|

### employee_skill　员工专业技能

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|employee_id|ID|PK FK|非空 / 无默认|员工 -> employee.employee_id|
|skill_name|STRING(120)|PK|非空 / 无默认|一项专业技能|

### employee_revision　员工原版

不可变完整列快照；业务修改、原版和审计共同提交。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|employee_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|employee_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> employee.employee_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|name|STRING(100)||非空 / 无默认|姓名|
|contact_info|TEXT||可空 / 无默认|联系方式|
|personal_profile|TEXT||可空 / 无默认|个人资料|
|employment_arrangement|TEXT||可空 / 无默认|任职安排|
|professional_editor_id|ID|FK|可空 / 无默认|专业资料修改人 -> employee.employee_id|
|professional_edited_at|INSTANT||可空 / 无默认|专业资料修改时刻|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|

组合唯一：employee_id, version_no；NULL策略：NON_NULL_VALUES。

### employee_revision_skill　员工原版技能

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|employee_revision_id|ID|PK FK|非空 / 无默认|员工原版 -> employee_revision.employee_revision_id|
|skill_name|STRING(120)|PK|非空 / 无默认|当时专业技能|

### clinic　诊所

名称/地址非身份键；主管可空，不自动获得权限。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|clinic_id|ID|PK|非空 / 无默认|稳定技术标识|
|name|STRING(150)||非空 / 无默认|名称|
|address|TEXT||可空 / 无默认|地址|
|contact_info|TEXT||可空 / 无默认|联系方式|
|manager_id|ID|FK|可空 / 无默认|当前主管 -> employee.employee_id|
|area_value|DECIMAL(18,2)||可空 / 无默认|面积|
|area_unit|TEXT||可空 / 无默认|面积单位|
|created_by|ID|FK|非空 / 无默认|创建人员 -> employee.employee_id|
|created_at|INSTANT||非空 / 无默认|创建时刻|
|updated_by|ID|FK|非空 / 无默认|修改人员 -> employee.employee_id|
|updated_at|INSTANT||非空 / 无默认|修改时刻|
|row_version|INT64||非空 / 1|并发更新读取基准|

### clinic_availability_plan　诊所业务启停安排

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|availability_id|ID|PK|非空 / 无默认|稳定技术标识|
|clinic_id|ID|FK|非空 / 无默认|诊所 -> clinic.clinic_id|
|effective_from|INSTANT||非空 / 无默认|适用起点|
|effective_to|INSTANT||可空 / 无默认|适用终点|
|business_enabled|BOOLEAN||非空 / 无默认|该安排允许业务|
|reason|TEXT||可空 / 无默认|启停原因|

### clinic_revision　诊所原版

不可变完整列快照；业务修改、原版和审计共同提交。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|clinic_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|clinic_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> clinic.clinic_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|name|STRING(150)||非空 / 无默认|名称|
|address|TEXT||可空 / 无默认|地址|
|contact_info|TEXT||可空 / 无默认|联系方式|
|manager_id|ID|FK|可空 / 无默认|当前主管 -> employee.employee_id|
|area_value|DECIMAL(18,2)||可空 / 无默认|面积|
|area_unit|TEXT||可空 / 无默认|面积单位|
|created_by|ID|FK|非空 / 无默认|创建人员 -> employee.employee_id|
|created_at|INSTANT||非空 / 无默认|创建时刻|
|updated_by|ID|FK|非空 / 无默认|修改人员 -> employee.employee_id|
|updated_at|INSTANT||非空 / 无默认|修改时刻|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|

组合唯一：clinic_id, version_no；NULL策略：NON_NULL_VALUES。

### practice_assignment　跨店执业关系

同人同店重叠有效期间领域核验；终止不自动改约或改过往就诊。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|practice_id|ID|PK|非空 / 无默认|稳定技术标识|
|employee_id|ID|FK|非空 / 无默认|执业牙医 -> employee.employee_id|
|clinic_id|ID|FK|非空 / 无默认|执业诊所 -> clinic.clinic_id|
|valid_from|DATE||非空 / 无默认|有效起始日(含)|
|valid_to|DATE||可空 / 无默认|有效终止日(含)|
|practice_arrangement|TEXT||非空 / 无默认|执业启停安排|
|affected_arrangements|TEXT||可空 / 无默认|已核对的影响安排引用|
|updated_by|ID|FK|非空 / 无默认|修改人员 -> employee.employee_id|
|updated_at|INSTANT||非空 / 无默认|修改时刻|
|row_version|INT64||非空 / 1|并发更新读取基准|

### practice_revision　执业关系原版

不可变完整列快照；业务修改、原版和审计共同提交。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|practice_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|practice_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> practice_assignment.practice_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|employee_id|ID|FK|非空 / 无默认|执业牙医 -> employee.employee_id|
|clinic_id|ID|FK|非空 / 无默认|执业诊所 -> clinic.clinic_id|
|valid_from|DATE||非空 / 无默认|有效起始日(含)|
|valid_to|DATE||可空 / 无默认|有效终止日(含)|
|practice_arrangement|TEXT||非空 / 无默认|执业启停安排|
|affected_arrangements|TEXT||可空 / 无默认|已核对的影响安排引用|
|updated_by|ID|FK|非空 / 无默认|修改人员 -> employee.employee_id|
|updated_at|INSTANT||非空 / 无默认|修改时刻|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|

组合唯一：practice_id, version_no；NULL策略：NON_NULL_VALUES。

### qualification　证书稳定身份

同一份证书修订保留同一身份；不同证书不因编号缺失而合并。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|qualification_id|ID|PK|非空 / 无默认|稳定技术标识|
|employee_id|ID|FK|非空 / 无默认|持证牙医 -> employee.employee_id|
|row_version|INT64||非空 / 1|并发更新读取基准|

### qualification_version　牙医证书版本

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|qualification_version_id|ID|PK|非空 / 无默认|稳定技术标识|
|qualification_id|ID|FK|非空 / 无默认|所属稳定证书 -> qualification.qualification_id|
|certificate_name|TEXT||非空 / 无默认|证书名称|
|certificate_number|TEXT||可空 / 无默认|证书编号|
|source_validity|TEXT||可空 / 无默认|来源及有效信息|
|pending_note|TEXT||可空 / 无默认|待补说明|
|review_conclusion|TEXT||可空 / 无默认|人工核对结论|
|version_no|INT64||非空 / 无默认|证书版本|
|updated_by|ID|FK|非空 / 无默认|修改人员 -> employee.employee_id|
|updated_at|INSTANT||非空 / 无默认|修改时刻|

组合唯一：qualification_id, version_no；NULL策略：NON_NULL_VALUES。

### qualification_file　证书附件

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|qualification_version_id|ID|PK FK|非空 / 无默认|证书版 -> qualification_version.qualification_version_id|
|file_id|ID|PK FK|非空 / 无默认|附件 -> file_asset.file_id|

### staff_account　员工账号

账号不转给他人；无业务授权不等于有临床许可；凭据不得写进操作历史。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|account_id|ID|PK|非空 / 无默认|稳定技术标识|
|employee_id|ID|FK UQ|非空 / 无默认|真实员工 -> employee.employee_id|
|login_name|STRING(100)|UQ|非空 / 无默认|登录名|
|credential_verifier|TEXT||非空 / 无默认|不可逆凭据验证材料|
|account_scope|TEXT||可空 / 无默认|账号所属范围说明|
|activation_arrangement|TEXT||非空 / 无默认|启停安排|
|opened_at|INSTANT||非空 / 无默认|开通时刻|
|disabled_at|INSTANT||可空 / 无默认|实际停用时刻|
|maintained_by|ID|FK|非空 / 无默认|维护人员 -> employee.employee_id|
|maintained_at|INSTANT||非空 / 无默认|维护时刻|
|row_version|INT64||非空 / 1|并发更新读取基准|

### security_role　访问角色

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|role_id|ID|PK|非空 / 无默认|稳定技术标识|
|name|STRING(100)||非空 / 无默认|名称|
|responsibility|TEXT||可空 / 无默认|职责|
|row_version|INT64||非空 / 1|并发更新读取基准|

### role_version　角色功能原版

原定义与功能集合不可变，旧许可不回读可变角色模板。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|role_version_id|ID|PK|非空 / 无默认|稳定技术标识|
|role_id|ID|FK|非空 / 无默认|稳定角色 -> security_role.role_id|
|version_no|INT64||非空 / 无默认|角色定义版本|
|name|TEXT||非空 / 无默认|本版角色名称|
|responsibility|TEXT||可空 / 无默认|本版职责|
|configured_by|ID|FK|非空 / 无默认|配置人员 -> employee.employee_id|
|configured_at|INSTANT||非空 / 无默认|本版保存时刻|

组合唯一：role_id, version_no；NULL策略：NON_NULL_VALUES。

### role_function　角色功能

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|role_version_id|ID|PK FK|非空 / 无默认|采用角色定义原版 -> role_version.role_version_id|
|function_code|STRING(80)|PK|非空 / 无默认|允许功能代码|

### access_grant　账号授权版本

空许可/零诊所不等于全连锁；保存时核对当前配置权及管理接续。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|grant_id|ID|PK|非空 / 无默认|稳定技术标识|
|account_id|ID|FK|非空 / 无默认|目标账号 -> staff_account.account_id|
|version_no|INT64||非空 / 无默认|许可版本|
|effective_from|INSTANT||非空 / 无默认|生效起点|
|effective_to|INSTANT||可空 / 无默认|终止时点|
|object_scope|TEXT||可空 / 无默认|对象数据范围|
|configured_by|ID|FK|非空 / 无默认|配置人员 -> employee.employee_id|
|configured_at|INSTANT||非空 / 无默认|配置时刻|

组合唯一：account_id, version_no；NULL策略：NON_NULL_VALUES。

### grant_role　授权采用角色

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|grant_id|ID|PK FK|非空 / 无默认|授权版 -> access_grant.grant_id|
|role_version_id|ID|PK FK|非空 / 无默认|采用角色定义原版 -> role_version.role_version_id|

### grant_clinic　授权允许诊所

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|grant_id|ID|PK FK|非空 / 无默认|授权版 -> access_grant.grant_id|
|clinic_id|ID|PK FK|非空 / 无默认|允许诊所 -> clinic.clinic_id|

### grant_field　授权字段及动作

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|grant_field_id|ID|PK|非空 / 无默认|稳定技术标识|
|grant_id|ID|FK|非空 / 无默认|授权版 -> access_grant.grant_id|
|resource_code|STRING(80)||非空 / 无默认|资源种类|
|field_code|STRING(100)||非空 / 无默认|字段代码|
|action_code|STRING(40)||非空 / 无默认|查看/维护/导出动作|

组合唯一：grant_id, resource_code, field_code, action_code；NULL策略：NON_NULL_VALUES。

## 患者预约与实际就诊

### patient　患者

姓名电话不唯一；空过敏不代表无过敏。首次建档诊所与逐项过敏按DC25核验；普通修订保留建档来源，不由首次就诊推导。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|patient_id|ID|PK|非空 / 无默认|稳定技术标识|
|name|STRING(100)||非空 / 无默认|姓名|
|birth_date|DATE||可空 / 无默认|出生日期|
|phone|STRING(40)||可空 / 无默认|电话|
|contact_address|TEXT||可空 / 无默认|联系地址|
|billing_address|TEXT||可空 / 无默认|账单地址|
|email|STRING(254)||可空 / 无默认|可选邮箱|
|source_note|TEXT||可空 / 无默认|来源|
|introducer_note|TEXT||可空 / 无默认|适用时的介绍人说明|
|allergy_knowledge|TEXT||可空 / 无默认|unknown / none_reported / reported；旧NULL视为尚未了解|
|allergy_note|TEXT||可空 / 无默认|补充或旧备注原文；不代替逐项过敏内容|
|contact_preference|TEXT||可空 / 无默认|联系偏好|
|row_version|INT64||非空 / 1|并发更新读取基准|
|created_clinic_id|ID|FK|可空 / 无默认|首次建档诊所；旧来源不明可空 -> clinic.clinic_id|

### patient_tag　患者标签

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|patient_id|ID|PK FK|非空 / 无默认|患者 -> patient.patient_id|
|tag_text|STRING(100)|PK|非空 / 无默认|实际标签|

### patient_channel　患者沟通渠道

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|channel_id|ID|PK|非空 / 无默认|稳定技术标识|
|patient_id|ID|FK|非空 / 无默认|患者 -> patient.patient_id|
|channel_name|TEXT||非空 / 无默认|渠道名称|
|association_note|TEXT||可空 / 无默认|渠道关联情况|

### patient_revision　患者原版

不可变完整原版，包含当时建档诊所及完整过敏明细；业务修改、原版和审计共同提交。旧版不回读当前明细。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|patient_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|patient_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> patient.patient_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|name|STRING(100)||非空 / 无默认|姓名|
|birth_date|DATE||可空 / 无默认|出生日期|
|phone|STRING(40)||可空 / 无默认|电话|
|contact_address|TEXT||可空 / 无默认|联系地址|
|billing_address|TEXT||可空 / 无默认|账单地址|
|email|STRING(254)||可空 / 无默认|可选邮箱|
|source_note|TEXT||可空 / 无默认|来源|
|introducer_note|TEXT||可空 / 无默认|适用时的介绍人说明|
|allergy_knowledge|TEXT||可空 / 无默认|unknown / none_reported / reported；旧NULL视为尚未了解|
|allergy_note|TEXT||可空 / 无默认|补充或旧备注原文；不代替逐项过敏内容|
|contact_preference|TEXT||可空 / 无默认|联系偏好|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|
|created_clinic_id|ID|FK|可空 / 无默认|首次建档诊所；旧来源不明可空 -> clinic.clinic_id|

组合唯一：patient_id, version_no；NULL策略：NON_NULL_VALUES。

### patient_revision_tag　患者原版标签

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|patient_revision_id|ID|PK FK|非空 / 无默认|患者原版 -> patient_revision.patient_revision_id|
|tag_text|STRING(100)|PK|非空 / 无默认|当时标签|

### patient_revision_channel　患者原版渠道

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|patient_revision_id|ID|PK FK|非空 / 无默认|患者原版 -> patient_revision.patient_revision_id|
|channel_id|ID|PK FK|非空 / 无默认|稳定渠道关联 -> patient_channel.channel_id|
|channel_name|TEXT||非空 / 无默认|当时渠道名|
|association_note|TEXT||可空 / 无默认|当时关联情况|

### patient_allergy　患者过敏明细

每项明确过敏对象和可选说明，明细键在患者内稳定。集合与了解情况按DC25核验；未提交或无权集合不清空，与患者根及原版共同提交。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|patient_id|ID|PK FK|非空 / 无默认|所属患者 -> patient.patient_id|
|item_key|ID|PK|非空 / 无默认|所属根内的稳定明细键；不依赖当前项存在|
|allergen|STRING(200)||非空 / 无默认|实际报告的过敏对象|
|description|TEXT||可空 / 无默认|该项说明|

### patient_revision_allergy　患者原版过敏明细

逐项复制本版过敏对象及说明；只引用不可变患者原版，不引用可变当前明细，不以当前项是否仍存在决定旧版内容。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|patient_revision_id|ID|PK FK|非空 / 无默认|所属不可变患者原版 -> patient_revision.patient_revision_id|
|item_key|ID|PK|非空 / 无默认|所属根内的稳定明细键；不依赖当前项存在|
|allergen|STRING(200)||非空 / 无默认|实际报告的过敏对象|
|description|TEXT||可空 / 无默认|该项说明|

### doctor_schedule　医生排班

终点晚于起点；按同医生范围保护跨店接诊时段。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|schedule_id|ID|PK|非空 / 无默认|稳定技术标识|
|doctor_id|ID|FK|非空 / 无默认|排班医生 -> employee.employee_id|
|clinic_id|ID|FK|非空 / 无默认|排班诊所 -> clinic.clinic_id|
|starts_at|INSTANT||非空 / 无默认|时段起点|
|ends_at|INSTANT||非空 / 无默认|时段终点|
|can_receive|BOOLEAN||非空 / 无默认|可接诊安排|
|change_reason|TEXT||可空 / 无默认|休息外出变更原因|
|row_version|INT64||非空 / 1|并发更新读取基准|

### schedule_revision　排班原版

不可变完整列快照；业务修改、原版和审计共同提交。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|schedule_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|schedule_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> doctor_schedule.schedule_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|doctor_id|ID|FK|非空 / 无默认|排班医生 -> employee.employee_id|
|clinic_id|ID|FK|非空 / 无默认|排班诊所 -> clinic.clinic_id|
|starts_at|INSTANT||非空 / 无默认|时段起点|
|ends_at|INSTANT||非空 / 无默认|时段终点|
|can_receive|BOOLEAN||非空 / 无默认|可接诊安排|
|change_reason|TEXT||可空 / 无默认|休息外出变更原因|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|

组合唯一：schedule_id, version_no；NULL策略：NON_NULL_VALUES。

### appointment　就诊预约

未接通不取消；不猜固定治疗时长，不由预约推实际到院。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|appointment_id|ID|PK|非空 / 无默认|稳定技术标识|
|patient_id|ID|FK|非空 / 无默认|患者 -> patient.patient_id|
|clinic_id|ID|FK|非空 / 无默认|预约诊所 -> clinic.clinic_id|
|doctor_id|ID|FK|非空 / 无默认|预约医生 -> employee.employee_id|
|scheduled_at|INSTANT||非空 / 无默认|预约日期时间|
|cancelled_at|INSTANT||可空 / 无默认|当前取消事实|
|confirmation_note|TEXT||可空 / 无默认|确认及后续安排|
|row_version|INT64||非空 / 1|并发更新读取基准|

### appointment_contact　预约联系历史

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|contact_id|ID|PK|非空 / 无默认|稳定技术标识|
|appointment_id|ID|FK|非空 / 无默认|预约 -> appointment.appointment_id|
|contacted_at|INSTANT||非空 / 无默认|真实联系时间|
|employee_id|ID|FK|非空 / 无默认|实际联系人员 -> employee.employee_id|
|result_note|TEXT||非空 / 无默认|联系结果|
|next_action|TEXT||可空 / 无默认|后续安排|
|reached_patient|BOOLEAN||非空 / 无默认|本次真实联系到患者|

### appointment_revision　预约原版

不可变完整列快照；业务修改、原版和审计共同提交。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|appointment_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|appointment_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> appointment.appointment_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|patient_id|ID|FK|非空 / 无默认|患者 -> patient.patient_id|
|clinic_id|ID|FK|非空 / 无默认|预约诊所 -> clinic.clinic_id|
|doctor_id|ID|FK|非空 / 无默认|预约医生 -> employee.employee_id|
|scheduled_at|INSTANT||非空 / 无默认|预约日期时间|
|cancelled_at|INSTANT||可空 / 无默认|当前取消事实|
|confirmation_note|TEXT||可空 / 无默认|确认及后续安排|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|

组合唯一：appointment_id, version_no；NULL策略：NON_NULL_VALUES。

组合唯一：appointment_revision_id, appointment_id；NULL策略：NON_NULL_VALUES。

### visit　实际就诊

无预约允许；一预约最多一次有效到院；不加患者日期唯一；四个实际时间由前台按事实登记。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|visit_id|ID|PK|非空 / 无默认|稳定技术标识|
|patient_id|ID|FK|非空 / 无默认|患者 -> patient.patient_id|
|clinic_id|ID|FK|非空 / 无默认|实际诊所 -> clinic.clinic_id|
|appointment_id|ID|FK UQ|可空 / 无默认|本次预约 -> appointment.appointment_id|
|registrar_id|ID|FK|非空 / 无默认|登记人员 -> employee.employee_id|
|doctor_id|ID|FK|非空 / 无默认|接诊医生 -> employee.employee_id|
|arrived_at|INSTANT||非空 / 无默认|实际到院|
|started_at|INSTANT||可空 / 无默认|接诊开始|
|ended_at|INSTANT||可空 / 无默认|本次接诊结束|
|left_at|INSTANT||可空 / 无默认|实际离开|
|row_version|INT64||非空 / 1|并发更新读取基准|
|appointment_revision_id|ID|FK|可空 / 无默认|到院采用预约原版 -> appointment_revision.appointment_revision_id|

CF01：(appointment_revision_id, appointment_id) -> appointment_revision (appointment_revision_id, appointment_id)；MATCH SIMPLE须配行级条件。

### visit_nurse　就诊配合护士

完整有效就诊至少一名护士，由同事务核验；不改为仅一名。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|visit_id|ID|PK FK|非空 / 无默认|就诊 -> visit.visit_id|
|nurse_id|ID|PK FK|非空 / 无默认|配合护士 -> employee.employee_id|

### visit_revision　就诊原版

不可变完整列快照；业务修改、原版和审计共同提交。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|visit_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|visit_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> visit.visit_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|patient_id|ID|FK|非空 / 无默认|患者 -> patient.patient_id|
|clinic_id|ID|FK|非空 / 无默认|实际诊所 -> clinic.clinic_id|
|appointment_id|ID|FK|可空 / 无默认|本次预约 -> appointment.appointment_id|
|registrar_id|ID|FK|非空 / 无默认|登记人员 -> employee.employee_id|
|doctor_id|ID|FK|非空 / 无默认|接诊医生 -> employee.employee_id|
|arrived_at|INSTANT||非空 / 无默认|实际到院|
|started_at|INSTANT||可空 / 无默认|接诊开始|
|ended_at|INSTANT||可空 / 无默认|本次接诊结束|
|left_at|INSTANT||可空 / 无默认|实际离开|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|
|appointment_revision_id|ID|FK|可空 / 无默认|到院采用预约原版 -> appointment_revision.appointment_revision_id|

组合唯一：visit_id, version_no；NULL策略：NON_NULL_VALUES。

组合唯一：visit_revision_id, visit_id；NULL策略：NON_NULL_VALUES。

CF02：(appointment_revision_id, appointment_id) -> appointment_revision (appointment_revision_id, appointment_id)；MATCH SIMPLE须配行级条件。

### visit_revision_nurse　就诊原版护士集合

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|visit_revision_id|ID|PK FK|非空 / 无默认|就诊原版 -> visit_revision.visit_revision_id|
|nurse_id|ID|PK FK|非空 / 无默认|当时护士 -> employee.employee_id|

## 临床影像与义齿加工

### clinical_record　病历

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|record_id|ID|PK|非空 / 无默认|稳定技术标识|
|visit_id|ID|FK UQ|非空 / 无默认|原就诊 -> visit.visit_id|
|clinical_at|INSTANT||非空 / 无默认|诊疗时间|
|body|TEXT||非空 / 无默认|病历正文|
|pending_note|TEXT||可空 / 无默认|医生明确的待补说明|
|row_version|INT64||非空 / 1|并发更新读取基准|

### clinical_record_writer　病历书写医生

至少一名，写入和历史与病历共同保存；不授权前台代写。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|record_id|ID|PK FK|非空 / 无默认|病历 -> clinical_record.record_id|
|doctor_id|ID|PK FK|非空 / 无默认|书写医生 -> employee.employee_id|

### clinical_record_revision　病历原版

不可变完整列快照；业务修改、原版和审计共同提交。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|record_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|record_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> clinical_record.record_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|visit_id|ID|FK|非空 / 无默认|原就诊 -> visit.visit_id|
|clinical_at|INSTANT||非空 / 无默认|诊疗时间|
|body|TEXT||非空 / 无默认|病历正文|
|pending_note|TEXT||可空 / 无默认|医生明确的待补说明|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|

组合唯一：record_id, version_no；NULL策略：NON_NULL_VALUES。

### record_revision_writer　病历原版书写医生

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|record_revision_id|ID|PK FK|非空 / 无默认|病历原版 -> clinical_record_revision.record_revision_id|
|doctor_id|ID|PK FK|非空 / 无默认|当时医生 -> employee.employee_id|

### treatment　实际治疗

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|treatment_id|ID|PK|非空 / 无默认|稳定技术标识|
|visit_id|ID|FK|非空 / 无默认|就诊 -> visit.visit_id|
|item_id|ID|FK|非空 / 无默认|实施项目 -> treatment_item.item_id|
|confirming_doctor_id|ID|FK|非空 / 无默认|确认医生 -> employee.employee_id|
|performed_at|INSTANT||非空 / 无默认|实际实施时间|
|row_version|INT64||非空 / 1|并发更新读取基准|

### treatment_tooth　治疗适用牙位

牙位多值展开，不强迫每牙位另建一条治疗。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|treatment_id|ID|PK FK|非空 / 无默认|治疗 -> treatment.treatment_id|
|tooth_code|STRING(40)|PK|非空 / 无默认|一项适用牙位|

### treatment_revision　实际治疗原版

采用时固定本版，后续更正追加另版。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|treatment_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|treatment_id|ID|FK|非空 / 无默认|稳定治疗 -> treatment.treatment_id|
|version_no|INT64||非空 / 无默认|治疗原版序号|
|visit_id|ID|FK|非空 / 无默认|就诊 -> visit.visit_id|
|item_id|ID|FK|非空 / 无默认|实施项目 -> treatment_item.item_id|
|confirming_doctor_id|ID|FK|非空 / 无默认|确认医生 -> employee.employee_id|
|performed_at|INSTANT||非空 / 无默认|实际实施时间|
|operation_id|ID|FK|非空 / 无默认|本次保存操作 -> business_operation.operation_id|

组合唯一：treatment_id, version_no；NULL策略：NON_NULL_VALUES。

组合唯一：treatment_revision_id, treatment_id；NULL策略：NON_NULL_VALUES。

### treatment_revision_tooth　治疗原版牙位

按当时集合完整复制；不从当前牙位重构。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|treatment_revision_id|ID|PK FK|非空 / 无默认|治疗原版 -> treatment_revision.treatment_revision_id|
|tooth_code|STRING(40)|PK|非空 / 无默认|当时牙位|

### clinical_image　诊疗影像

患者经原就诊推导，不另存可冲突患者外键。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|image_id|ID|PK|非空 / 无默认|稳定技术标识|
|visit_id|ID|FK|非空 / 无默认|归档就诊 -> visit.visit_id|
|file_id|ID|FK|非空 / 无默认|受控文件 -> file_asset.file_id|
|archived_by|ID|FK|非空 / 无默认|初次归档人员 -> employee.employee_id|
|image_type|TEXT||非空 / 无默认|影像类别|
|formed_at|INSTANT||非空 / 无默认|影像形成时间|
|description|TEXT||可空 / 无默认|说明|
|row_version|INT64||非空 / 1|并发更新读取基准|

### clinical_image_revision　诊疗影像原版

不可变影像原版保留原归档关联及说明；同一影像身份更正不创建替代影像。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|image_revision_id|ID|PK|非空 / 无默认|影像原版标识|
|image_id|ID|FK|非空 / 无默认|稳定影像 -> clinical_image.image_id|
|version_no|INT64||非空 / 无默认|原版序号|
|visit_id|ID|FK|非空 / 无默认|当时归档就诊 -> visit.visit_id|
|file_id|ID|FK|非空 / 无默认|原受控文件 -> file_asset.file_id|
|archived_by|ID|FK|非空 / 无默认|初次归档人员 -> employee.employee_id|
|image_type|TEXT||非空 / 无默认|当时影像类别|
|formed_at|INSTANT||非空 / 无默认|实际形成时间|
|description|TEXT||可空 / 无默认|当时说明|
|operation_id|ID|FK|非空 / 无默认|本次保存操作 -> business_operation.operation_id|

组合唯一：image_id, version_no；NULL策略：NON_NULL_VALUES。

### file_asset　受控文件元数据

文件存在性、权限及结果不明分别核对；元数据不冒充文件已可读取。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|file_id|ID|PK|非空 / 无默认|稳定技术标识|
|storage_key|TEXT||非空 / 无默认|非公开存储定位|
|media_type|TEXT||非空 / 无默认|媒体类型|
|byte_size|INT64||非空 / 无默认|文件字节数|
|content_digest|TEXT||非空 / 无默认|完整性摘要|
|availability_note|TEXT||可空 / 无默认|归档/失败/待核实说明|
|created_by|ID|FK|非空 / 无默认|归档人员 -> employee.employee_id|
|created_at|INSTANT||非空 / 无默认|归档操作时刻|

### lab_order　义齿加工订单

加工方不自动等同物资供应商；不由接收推装戴。 当前要求版本取该订单已成功保存的最高version_no，要求提交须按订单row_version串行核验；不维护第二个可能失配的当前版本号。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|lab_order_id|ID|PK|非空 / 无默认|稳定技术标识|
|treatment_id|ID|FK|非空 / 无默认|治疗依据 -> treatment.treatment_id|
|request_doctor_id|ID|FK|非空 / 无默认|要求医生 -> employee.employee_id|
|lab_party|TEXT||非空 / 无默认|实际加工方|
|progress_pending_note|TEXT||可空 / 无默认|真实进度及未解问题|
|updated_by|ID|FK|非空 / 无默认|修订人员 -> employee.employee_id|
|updated_at|INSTANT||非空 / 无默认|修订时刻|
|row_version|INT64||非空 / 1|并发更新读取基准|
|current_received_handover_id|ID|FK|可空 / 无默认|当前接收依据 -> lab_handover.handover_id|
|current_review_id|ID|FK|可空 / 无默认|当前有效临床核对 -> lab_review.review_id|
|has_open_usability_issue|BOOLEAN||非空 / False|当前有登记未解可用性问题|

CF104-01：(current_received_handover_id, lab_order_id) -> lab_handover (handover_id, lab_order_id)；MATCH SIMPLE须配行级条件。

CF104-02：(current_review_id, current_received_handover_id) -> lab_review (review_id, received_handover_id)；MATCH SIMPLE须配行级条件。

### lab_requirement_version　加工要求原版

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|requirement_id|ID|PK|非空 / 无默认|稳定技术标识|
|lab_order_id|ID|FK|非空 / 无默认|加工单 -> lab_order.lab_order_id|
|version_no|INT64||非空 / 无默认|要求版本|
|requirement_text|TEXT||非空 / 无默认|医生加工要求|
|expected_return_at|INSTANT||可空 / 无默认|预计返回|
|doctor_id|ID|FK|非空 / 无默认|本版要求医生 -> employee.employee_id|
|recorded_at|INSTANT||非空 / 无默认|本版保存时刻|

组合唯一：lab_order_id, version_no；NULL策略：NON_NULL_VALUES。

组合唯一：requirement_id, lab_order_id；NULL策略：NON_NULL_VALUES。

### lab_handover　加工实际交接

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|handover_id|ID|PK|非空 / 无默认|稳定技术标识|
|lab_order_id|ID|FK|非空 / 无默认|加工单 -> lab_order.lab_order_id|
|requirement_id|ID|FK|非空 / 无默认|交接采用要求 -> lab_requirement_version.requirement_id|
|employee_id|ID|FK|非空 / 无默认|真实交接人员 -> employee.employee_id|
|direction|TEXT||非空 / 无默认|送出/实际接收|
|occurred_at|INSTANT||非空 / 无默认|实际交接时刻|
|handover_content|TEXT||非空 / 无默认|交接数量内容及相符情况|
|matches_requirement|BOOLEAN||可空 / 无默认|实际接收已核实相符|

组合唯一：handover_id, requirement_id；NULL策略：NON_NULL_VALUES。

组合唯一：handover_id, lab_order_id；NULL策略：NON_NULL_VALUES。

CF14：(requirement_id, lab_order_id) -> lab_requirement_version (requirement_id, lab_order_id)；MATCH SIMPLE须配行级条件。

### lab_review　加工临床核对

要求、接收及问题均相容才可用；旧要求改变不沿用不相容旧核对。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|review_id|ID|PK|非空 / 无默认|稳定技术标识|
|requirement_id|ID|FK|非空 / 无默认|核对原要求 -> lab_requirement_version.requirement_id|
|received_handover_id|ID|FK|非空 / 无默认|真实接收依据 -> lab_handover.handover_id|
|doctor_id|ID|FK|非空 / 无默认|核对医生 -> employee.employee_id|
|conclusion|TEXT||非空 / 无默认|可用/待核实及问题结论|
|reviewed_at|INSTANT||非空 / 无默认|核对时刻|
|is_usable|BOOLEAN||非空 / 无默认|医生明确核对可用|

组合唯一：review_id, received_handover_id；NULL策略：NON_NULL_VALUES。

CF15：(received_handover_id, requirement_id) -> lab_handover (handover_id, requirement_id)；MATCH SIMPLE须配行级条件。

## 价格单据与实际收款

### treatment_item　治疗项目

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|item_id|ID|PK|非空 / 无默认|稳定技术标识|
|name|TEXT||非空 / 无默认|名称|
|charge_unit|TEXT||非空 / 无默认|计费单位|
|activation_arrangement|TEXT||非空 / 无默认|启停安排|
|row_version|INT64||非空 / 1|并发更新读取基准|

### item_price_version　项目价格版本

适用诊所集合非空，生效区间冲突须按项目/诊所重验。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|price_version_id|ID|PK|非空 / 无默认|稳定技术标识|
|item_id|ID|FK|非空 / 无默认|项目 -> treatment_item.item_id|
|amount|DECIMAL(18,4)||非空 / 无默认|金额|
|effective_from|INSTANT||非空 / 无默认|有效起始|
|effective_to|INSTANT||可空 / 无默认|有效终止|
|version_no|INT64||非空 / 无默认|价格版本|

组合唯一：item_id, version_no；NULL策略：NON_NULL_VALUES。

### item_price_clinic　价格适用诊所

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|price_version_id|ID|PK FK|非空 / 无默认|价格版 -> item_price_version.price_version_id|
|clinic_id|ID|PK FK|非空 / 无默认|诊所 -> clinic.clinic_id|

### treatment_bill　治疗账单

合计由行计算；与收款共同有效，护士医生开费，前台仅获授权时协助。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|bill_id|ID|PK|非空 / 无默认|稳定技术标识|
|visit_id|ID|FK UQ|非空 / 无默认|原就诊 -> visit.visit_id|
|creator_id|ID|FK|非空 / 无默认|首次开单人 -> employee.employee_id|
|opened_at|INSTANT||非空 / 无默认|开单时刻|
|row_version|INT64||非空 / 1|并发更新读取基准|

### bill_staff　账单相关医护

至少一位；保留真实参与，不从头衔猜全部业绩归属。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|bill_id|ID|PK FK|非空 / 无默认|账单 -> treatment_bill.bill_id|
|employee_id|ID|PK FK|非空 / 无默认|相关医护 -> employee.employee_id|

### treatment_bill_line　治疗账单项

小计=数量×采用单价，舍入及金额核对随业务规则；治疗至多对应一条有效项。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|bill_line_id|ID|PK|非空 / 无默认|稳定技术标识|
|bill_id|ID|FK|非空 / 无默认|所属账单 -> treatment_bill.bill_id|
|treatment_id|ID|FK UQ|非空 / 无默认|已确认治疗 -> treatment.treatment_id|
|price_version_id|ID|FK|非空 / 无默认|采用原价版 -> item_price_version.price_version_id|
|quantity|DECIMAL(18,4)||非空 / 无默认|计费数量|
|adopted_unit_price|DECIMAL(18,4)||非空 / 无默认|实际采用单价|

### bill_revision　治疗账单原版

不可变完整列快照；业务修改、原版和审计共同提交。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|bill_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|bill_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> treatment_bill.bill_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|visit_id|ID|FK|非空 / 无默认|原就诊 -> visit.visit_id|
|creator_id|ID|FK|非空 / 无默认|首次开单人 -> employee.employee_id|
|opened_at|INSTANT||非空 / 无默认|开单时刻|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|
|visit_revision_id|ID|FK|非空 / 无默认|采用就诊人员原版 -> visit_revision.visit_revision_id|

组合唯一：bill_id, version_no；NULL策略：NON_NULL_VALUES。

组合唯一：bill_revision_id, bill_id；NULL策略：NON_NULL_VALUES。

CF19：(visit_revision_id, visit_id) -> visit_revision (visit_revision_id, visit_id)；MATCH SIMPLE须配行级条件。

### bill_revision_staff　账单原版相关医护

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|bill_revision_id|ID|PK FK|非空 / 无默认|账单原版 -> bill_revision.bill_revision_id|
|employee_id|ID|PK FK|非空 / 无默认|当时相关医护 -> employee.employee_id|

### bill_revision_line　账单原版明细

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|revision_line_id|ID|PK|非空 / 无默认|稳定技术标识|
|bill_revision_id|ID|FK|非空 / 无默认|账单原版 -> bill_revision.bill_revision_id|
|bill_line_id|ID|FK|非空 / 无默认|稳定原行 -> treatment_bill_line.bill_line_id|
|treatment_id|ID|FK|非空 / 无默认|当时计费治疗 -> treatment.treatment_id|
|price_version_id|ID|FK|非空 / 无默认|当时价格版 -> item_price_version.price_version_id|
|quantity|DECIMAL(18,4)||非空 / 无默认|原数量|
|adopted_unit_price|DECIMAL(18,4)||非空 / 无默认|原采用单价|
|treatment_revision_id|ID|FK|非空 / 无默认|采用实际治疗原版 -> treatment_revision.treatment_revision_id|
|item_name|TEXT||非空 / 无默认|当时治疗项目名|
|charge_unit|TEXT||非空 / 无默认|当时计费单位|

组合唯一：bill_revision_id, bill_line_id；NULL策略：NON_NULL_VALUES。

CF03：(treatment_revision_id, treatment_id) -> treatment_revision (treatment_revision_id, treatment_id)；MATCH SIMPLE须配行级条件。

### product_sale　商品销售

付款由收款事实关联，交付由交付项表达；合计按销售行计算。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|sale_id|ID|PK|非空 / 无默认|稳定技术标识|
|patient_id|ID|FK|非空 / 无默认|购买患者 -> patient.patient_id|
|clinic_id|ID|FK|非空 / 无默认|销售诊所 -> clinic.clinic_id|
|creator_id|ID|FK|非空 / 无默认|首次开单前台 -> employee.employee_id|
|opened_at|INSTANT||非空 / 无默认|开单时刻|
|row_version|INT64||非空 / 1|并发更新读取基准|

### product_sale_line　商品销售项

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|sale_line_id|ID|PK|非空 / 无默认|稳定技术标识|
|sale_id|ID|FK|非空 / 无默认|原销售 -> product_sale.sale_id|
|material_id|ID|FK|非空 / 无默认|可售物资 -> material.material_id|
|quantity|DECIMAL(18,4)||非空 / 无默认|销售数量|
|adopted_unit_price|DECIMAL(18,4)||非空 / 无默认|采用单价|

### product_delivery_line　商品交付分配项

整次交付各原行合计核对；多库存来源分配不等于分批交付。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|delivery_line_id|ID|PK|非空 / 无默认|稳定技术标识|
|sale_line_id|ID|FK|非空 / 无默认|原销售行 -> product_sale_line.sale_line_id|
|stock_id|ID|FK|非空 / 无默认|实际库存来源 -> stock_balance.stock_id|
|delivered_quantity|DECIMAL(18,4)||非空 / 无默认|实际交付数量|
|delivered_at|INSTANT||非空 / 无默认|实际交付时刻|

组合唯一：sale_line_id, stock_id；NULL策略：NON_NULL_VALUES。

### sale_revision　商品销售原版

不可变完整列快照；业务修改、原版和审计共同提交。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|sale_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|sale_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> product_sale.sale_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|patient_id|ID|FK|非空 / 无默认|购买患者 -> patient.patient_id|
|clinic_id|ID|FK|非空 / 无默认|销售诊所 -> clinic.clinic_id|
|creator_id|ID|FK|非空 / 无默认|首次开单前台 -> employee.employee_id|
|opened_at|INSTANT||非空 / 无默认|开单时刻|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|

组合唯一：sale_id, version_no；NULL策略：NON_NULL_VALUES。

组合唯一：sale_revision_id, sale_id；NULL策略：NON_NULL_VALUES。

### sale_revision_line　商品销售原版明细

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|sale_revision_line_id|ID|PK|非空 / 无默认|稳定技术标识|
|sale_revision_id|ID|FK|非空 / 无默认|销售原版 -> sale_revision.sale_revision_id|
|sale_line_id|ID|FK|非空 / 无默认|稳定原行 -> product_sale_line.sale_line_id|
|material_id|ID|FK|非空 / 无默认|当时商品 -> material.material_id|
|classification|TEXT||非空 / 无默认|当时商品分类|
|unit|TEXT||非空 / 无默认|当时计量单位|
|quantity|DECIMAL(18,4)||非空 / 无默认|原数量|
|adopted_unit_price|DECIMAL(18,4)||非空 / 无默认|原采用单价|

组合唯一：sale_revision_id, sale_line_id；NULL策略：NON_NULL_VALUES。

### receipt　统一收款

CHECK恰好一个原单外键非空；每原单至多一笔有效全额实收，不增加欠费或退费。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|receipt_id|ID|PK|非空 / 无默认|稳定技术标识|
|bill_id|ID|FK UQ|可空 / 无默认|治疗原单 -> treatment_bill.bill_id|
|sale_id|ID|FK UQ|可空 / 无默认|商品原单 -> product_sale.sale_id|
|collector_id|ID|FK|非空 / 无默认|收款登记人员 -> employee.employee_id|
|amount|DECIMAL(18,2)||非空 / 无默认|实收金额|
|payment_method|TEXT||非空 / 无默认|付款方式|
|received_at|INSTANT||非空 / 无默认|实际收款时间|
|row_version|INT64||非空 / 1|并发更新读取基准|

### receipt_revision　原实收版本

不可变完整列快照；业务修改、原版和审计共同提交。 两种采用原版恰选其一，并与bill_id/sale_id同源；金额、原项目/商品分类及归属依据不回读当前可变行。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|receipt_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|receipt_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> receipt.receipt_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|bill_id|ID|FK|可空 / 无默认|治疗原单 -> treatment_bill.bill_id|
|sale_id|ID|FK|可空 / 无默认|商品原单 -> product_sale.sale_id|
|collector_id|ID|FK|非空 / 无默认|收款登记人员 -> employee.employee_id|
|amount|DECIMAL(18,2)||非空 / 无默认|实收金额|
|payment_method|TEXT||非空 / 无默认|付款方式|
|received_at|INSTANT||非空 / 无默认|实际收款时间|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|
|bill_revision_id|ID|FK|可空 / 无默认|采用治疗单原版 -> bill_revision.bill_revision_id|
|sale_revision_id|ID|FK|可空 / 无默认|采用销售单原版 -> sale_revision.sale_revision_id|

组合唯一：receipt_id, version_no；NULL策略：NON_NULL_VALUES。

组合唯一：receipt_revision_id, receipt_id；NULL策略：NON_NULL_VALUES。

CF17：(bill_revision_id, bill_id) -> bill_revision (bill_revision_id, bill_id)；MATCH SIMPLE须配行级条件。

CF18：(sale_revision_id, sale_id) -> sale_revision (sale_revision_id, sale_id)；MATCH SIMPLE须配行级条件。

## 供应商物资与库存

### supplier　供应商

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|supplier_id|ID|PK|非空 / 无默认|稳定技术标识|
|name|TEXT||非空 / 无默认|名称|
|contact_info|TEXT||可空 / 无默认|联系信息|
|cooperation_info|TEXT||可空 / 无默认|合作资料|
|activation_arrangement|TEXT||非空 / 无默认|合作启停安排|
|pending_note|TEXT||可空 / 无默认|待补事项|
|updated_by|ID|FK|非空 / 无默认|修改人员 -> employee.employee_id|
|updated_at|INSTANT||非空 / 无默认|修改时刻|
|row_version|INT64||非空 / 1|并发更新读取基准|

### supplier_file　供应商资质合同

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|supplier_file_id|ID|PK|非空 / 无默认|稳定技术标识|
|supplier_id|ID|FK|非空 / 无默认|供应商 -> supplier.supplier_id|
|file_id|ID|FK|非空 / 无默认|受控附件 -> file_asset.file_id|
|file_purpose|TEXT||非空 / 无默认|资质/合同及说明|

### material　物资目录

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|material_id|ID|PK|非空 / 无默认|稳定技术标识|
|name|TEXT||非空 / 无默认|名称|
|classification|TEXT||非空 / 无默认|分类|
|unit|TEXT||非空 / 无默认|计量单位|
|specification|TEXT||可空 / 无默认|规格|
|activation_arrangement|TEXT||非空 / 无默认|启停安排|
|updated_by|ID|FK|非空 / 无默认|目录修改人 -> employee.employee_id|
|updated_at|INSTANT||非空 / 无默认|修改时刻|
|row_version|INT64||非空 / 1|并发更新读取基准|

### stock_balance　诊所物资库存

按原C的诊所、物资及适用批次效期范围唯一；空批次/效期只表示该字段尚未记录，不猜真实批次。已知不同效期不能强行合并；禁止负库存。 已被变动引用的范围身份不可就地换写；真实错填通过原用例更正并保留旧范围及调整依据，不新增跨店调拨业务。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|stock_id|ID|PK|非空 / 无默认|稳定技术标识|
|clinic_id|ID|FK|非空 / 无默认|诊所 -> clinic.clinic_id|
|material_id|ID|FK|非空 / 无默认|物资 -> material.material_id|
|batch_reference|TEXT||可空 / 无默认|适用批次|
|expires_on|DATE||可空 / 无默认|适用有效期|
|unit|TEXT||非空 / 无默认|单位|
|quantity|DECIMAL(18,4)||非空 / 无默认|结存数量|
|row_version|INT64||非空 / 1|并发更新读取基准|

组合唯一：clinic_id, material_id, batch_reference, expires_on；NULL策略：NULLS_EQUAL。

### stock_receipt　实际入库

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|stock_receipt_id|ID|PK|非空 / 无默认|稳定技术标识|
|stock_id|ID|FK|非空 / 无默认|接收库存 -> stock_balance.stock_id|
|supplier_id|ID|FK|非空 / 无默认|实际到货来源 -> supplier.supplier_id|
|registrar_id|ID|FK|非空 / 无默认|接收登记库管 -> employee.employee_id|
|quantity|DECIMAL(18,4)||非空 / 无默认|实际接收数量|
|unit|TEXT||非空 / 无默认|单位|
|received_at|INSTANT||非空 / 无默认|接收时间|
|unit_price|DECIMAL(18,4)||可空 / 无默认|价格资料|
|batch_expiry_note|TEXT||可空 / 无默认|原批次效期资料|
|pending_note|TEXT||可空 / 无默认|待核实事项|
|row_version|INT64||非空 / 1|当前补价并发版本|

### material_issue　材料领用出库

领用人不自动等于最终牙医成本归属；价格未明不能当0。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|issue_id|ID|PK|非空 / 无默认|稳定技术标识|
|stock_id|ID|FK|非空 / 无默认|实发库存 -> stock_balance.stock_id|
|recipient_id|ID|FK|非空 / 无默认|领用人员 -> employee.employee_id|
|registrar_id|ID|FK|非空 / 无默认|出库登记库管 -> employee.employee_id|
|quantity|DECIMAL(18,4)||非空 / 无默认|数量|
|unit|TEXT||非空 / 无默认|单位|
|issued_at|INSTANT||非空 / 无默认|实际领用时间|
|cost_unit_price|DECIMAL(18,4)||可空 / 无默认|核实的原成本单价|
|pending_note|TEXT||可空 / 无默认|待核实事项|
|row_version|INT64||非空 / 1|并发更新读取基准|

### issue_revision　原领用版本

不可变完整列快照；业务修改、原版和审计共同提交。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|issue_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|issue_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> material_issue.issue_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|stock_id|ID|FK|非空 / 无默认|实发库存 -> stock_balance.stock_id|
|recipient_id|ID|FK|非空 / 无默认|领用人员 -> employee.employee_id|
|registrar_id|ID|FK|非空 / 无默认|出库登记库管 -> employee.employee_id|
|quantity|DECIMAL(18,4)||非空 / 无默认|数量|
|unit|TEXT||非空 / 无默认|单位|
|issued_at|INSTANT||非空 / 无默认|实际领用时间|
|cost_unit_price|DECIMAL(18,4)||可空 / 无默认|核实的原成本单价|
|pending_note|TEXT||可空 / 无默认|待核实事项|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|

组合唯一：issue_id, version_no；NULL策略：NON_NULL_VALUES。

组合唯一：issue_revision_id, issue_id；NULL策略：NON_NULL_VALUES。

### stocktake　盘点

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|stocktake_id|ID|PK|非空 / 无默认|稳定技术标识|
|clinic_id|ID|FK|非空 / 无默认|盘点诊所 -> clinic.clinic_id|
|initiator_id|ID|FK|非空 / 无默认|发起库管 -> employee.employee_id|
|scope_note|TEXT||非空 / 无默认|明确盘点范围|
|baseline_at|INSTANT||非空 / 无默认|基准时点|
|row_version|INT64||非空 / 1|盘点聚合并发版本|
|processed_at|INSTANT||可空 / 无默认|当前有效核实处理时刻|

### stocktake_line　盘点项

对齐差异按基准/期间净变动/实盘计算，不拿旧实盘覆盖当前结存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|stocktake_line_id|ID|PK|非空 / 无默认|稳定技术标识|
|stocktake_id|ID|FK|非空 / 无默认|原盘点 -> stocktake.stocktake_id|
|stock_id|ID|FK|非空 / 无默认|原库存 -> stock_balance.stock_id|
|unit|TEXT||非空 / 无默认|单位|
|baseline_quantity|DECIMAL(18,4)||非空 / 无默认|账面数量快照|
|counted_at|INSTANT||可空 / 无默认|真实清点时点|
|counted_quantity|DECIMAL(18,4)||可空 / 无默认|实盘数量|
|period_net_movement|DECIMAL(18,4)||可空 / 无默认|基准至清点的已核对变动|
|reason_pending_note|TEXT||可空 / 无默认|核实原因及待处理事项|
|actual_adjustment|DECIMAL(18,4)||可空 / 无默认|实际调整数量|
|baseline_stock_version|INT64||非空 / 无默认|基准已包含的库存版本|

组合唯一：stocktake_id, stock_id；NULL策略：NON_NULL_VALUES。

### stock_movement　库存变动来源

一次操作、同一真实来源和库存仅一条净变动；各来源可空唯一按非空值生效。更正按本次真实差量追加，不能改旧变动或无基准重复应用。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|movement_id|ID|PK|非空 / 无默认|稳定技术标识|
|stock_id|ID|FK|非空 / 无默认|库存 -> stock_balance.stock_id|
|occurred_at|INSTANT||非空 / 无默认|实际变动时刻|
|quantity_delta|DECIMAL(18,4)||非空 / 无默认|带方向数量变化|
|receipt_id|ID|FK|可空 / 无默认|入库来源 -> stock_receipt.stock_receipt_id|
|issue_revision_id|ID|FK|可空 / 无默认|本次领用原版 -> issue_revision.issue_revision_id|
|delivery_line_id|ID|FK|可空 / 无默认|交付来源 -> product_delivery_line.delivery_line_id|
|stocktake_line_id|ID|FK|可空 / 无默认|盘点调整来源 -> stocktake_line.stocktake_line_id|
|operation_id|ID|FK|非空 / 无默认|本次实际变动操作 -> business_operation.operation_id|
|stock_version_before|INT64||非空 / 无默认|本次库存写前版本|
|stock_version_after|INT64||非空 / 无默认|本次库存写后版本|

组合唯一：operation_id, receipt_id, stock_id；NULL策略：NON_NULL_VALUES。

组合唯一：operation_id, issue_revision_id, stock_id；NULL策略：NON_NULL_VALUES。

组合唯一：operation_id, delivery_line_id, stock_id；NULL策略：NON_NULL_VALUES。

组合唯一：operation_id, stocktake_line_id, stock_id；NULL策略：NON_NULL_VALUES。

## 随访方案联系与邀约

### followup_plan　随访方案稳定身份

停用只影响新选择；已保存版本和旧患者任务不改写。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|plan_id|ID|PK|非空 / 无默认|稳定技术标识|
|enabled|BOOLEAN||非空 / 无默认|当前允许新安排|
|row_version|INT64||非空 / 1|并发更新读取基准|

### followup_plan_version　随访方案版本

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|plan_version_id|ID|PK|非空 / 无默认|稳定技术标识|
|plan_id|ID|FK|非空 / 无默认|同一方案稳定身份 -> followup_plan.plan_id|
|item_id|ID|FK|非空 / 无默认|适用治疗项目 -> treatment_item.item_id|
|version_no|INT64||非空 / 无默认|方案版本|
|configured_by|ID|FK|非空 / 无默认|本版配置人员 -> employee.employee_id|
|configured_at|INSTANT||非空 / 无默认|本版配置时刻|
|effective_from|INSTANT||非空 / 无默认|适用起点|
|effective_to|INSTANT||可空 / 无默认|适用终点|

组合唯一：plan_id, version_no；NULL策略：NON_NULL_VALUES。

### followup_plan_clinic　方案适用诊所

每版明确非空范围，不默认为全部诊所。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|plan_version_id|ID|PK FK|非空 / 无默认|方案版 -> followup_plan_version.plan_version_id|
|clinic_id|ID|PK FK|非空 / 无默认|适用诊所 -> clinic.clinic_id|

### followup_plan_node　方案联系节点

不把访谈中的某次间隔写成全局医学规则。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|node_id|ID|PK|非空 / 无默认|稳定技术标识|
|plan_version_id|ID|FK|非空 / 无默认|方案版 -> followup_plan_version.plan_version_id|
|time_arrangement|TEXT||非空 / 无默认|配置的随访时间安排|
|contact_content|TEXT||非空 / 无默认|联系内容|
|clinical_purpose|TEXT||非空 / 无默认|医生提供的临床目的|

组合唯一：node_id, plan_version_id；NULL策略：NON_NULL_VALUES。

### followup_task　治疗随访安排

有方案要固定版/节点且相符；无方案需具体医生要求。患者经治疗/就诊推导。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|followup_id|ID|PK|非空 / 无默认|稳定技术标识|
|treatment_id|ID|FK|非空 / 无默认|实际治疗 -> treatment.treatment_id|
|plan_version_id|ID|FK|可空 / 无默认|采用方案版 -> followup_plan_version.plan_version_id|
|node_id|ID|FK|可空 / 无默认|采用节点 -> followup_plan_node.node_id|
|doctor_instruction|TEXT||可空 / 无默认|医生具体要求|
|instruction_doctor_id|ID|FK|可空 / 无默认|要求医生 -> employee.employee_id|
|planned_at|INSTANT||非空 / 无默认|计划时间|
|planned_content|TEXT||非空 / 无默认|联系内容|
|responsible_id|ID|FK|非空 / 无默认|当前负责人员 -> employee.employee_id|
|next_action|TEXT||可空 / 无默认|后续安排|
|updated_by|ID|FK|非空 / 无默认|修订人员 -> employee.employee_id|
|updated_at|INSTANT||非空 / 无默认|修订时刻|
|row_version|INT64||非空 / 1|并发更新读取基准|

CF16：(node_id, plan_version_id) -> followup_plan_node (node_id, plan_version_id)；MATCH SIMPLE须配行级条件。

### followup_contact　随访真实联系

未接通也追加，不能抹掉旧成功联系事实。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|followup_contact_id|ID|PK|非空 / 无默认|稳定技术标识|
|followup_id|ID|FK|非空 / 无默认|随访 -> followup_task.followup_id|
|employee_id|ID|FK|非空 / 无默认|真实联系人员 -> employee.employee_id|
|contacted_at|INSTANT||非空 / 无默认|实际尝试时间|
|channel|TEXT||非空 / 无默认|渠道|
|result_feedback|TEXT||非空 / 无默认|联系结果及患者反馈|
|next_action|TEXT||可空 / 无默认|后续安排|
|reached_patient|BOOLEAN||非空 / 无默认|本次真实联系到患者|

### followup_issue　随访待处理问题

转交不解决，所有未解问题处理后才可清除待处理。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|followup_issue_id|ID|PK|非空 / 无默认|稳定技术标识|
|followup_id|ID|FK|非空 / 无默认|随访 -> followup_task.followup_id|
|problem|TEXT||非空 / 无默认|需医生处理问题|
|doctor_id|ID|FK|可空 / 无默认|接手医生 -> employee.employee_id|
|progress_conclusion|TEXT||可空 / 无默认|真实跟进及处理结论|
|resolved_at|INSTANT||可空 / 无默认|按真实结论解决时刻|

### recall_attempt　长期未诊邀约首次尝试

筛选不建对象；首次实际尝试完成保存才建。意向不是预约、到院或当前仍需邀约。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|recall_id|ID|PK|非空 / 无默认|稳定技术标识|
|patient_id|ID|FK|非空 / 无默认|患者 -> patient.patient_id|
|screening_condition|TEXT||非空 / 无默认|原时间筛选条件|
|screened_at|INSTANT||非空 / 无默认|筛选时点|
|last_actual_visit_at|INSTANT||可空 / 无默认|原最近实际就诊|
|first_employee_id|ID|FK|非空 / 无默认|首次真实联系人员 -> employee.employee_id|
|first_contacted_at|INSTANT||非空 / 无默认|首次实际尝试时间|
|first_channel|TEXT||非空 / 无默认|首次渠道|
|first_result|TEXT||非空 / 无默认|首次联系结果|
|patient_intention|TEXT||可空 / 无默认|当前已知真实意向|
|next_action|TEXT||可空 / 无默认|后续安排|
|updated_by|ID|FK|非空 / 无默认|修订人员 -> employee.employee_id|
|updated_at|INSTANT||非空 / 无默认|修订时刻|
|row_version|INT64||非空 / 1|并发更新读取基准|
|first_reached_patient|BOOLEAN||非空 / 无默认|首次真实联系到患者|

### recall_clinic　邀约原筛选诊所

范围至少一所，不由联系人员当前任职替换。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|recall_id|ID|PK FK|非空 / 无默认|邀约 -> recall_attempt.recall_id|
|clinic_id|ID|PK FK|非空 / 无默认|原筛选诊所 -> clinic.clinic_id|

### recall_contact　邀约后续联系

首次事实在主表，后续追加；未接通不清空已有意向。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|recall_contact_id|ID|PK|非空 / 无默认|稳定技术标识|
|recall_id|ID|FK|非空 / 无默认|原邀约 -> recall_attempt.recall_id|
|employee_id|ID|FK|非空 / 无默认|实际联系人员 -> employee.employee_id|
|contacted_at|INSTANT||非空 / 无默认|联系时间|
|channel|TEXT||非空 / 无默认|渠道|
|result_intention|TEXT||非空 / 无默认|联系结果及本次意向|
|next_action|TEXT||可空 / 无默认|后续安排|
|reached_patient|BOOLEAN||非空 / 无默认|本次真实联系到患者|
|stated_intention|TEXT||可空 / 无默认|本次明确意向|

## 季度费用与原来源

### operating_expense　运营费用当前资料

费用登记不是支付，不推牙医归属。凭据编号及来源说明按UC23核验；未知明确待补，疑似重复先核实，更正另留原版。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|expense_id|ID|PK|非空 / 无默认|稳定技术标识|
|clinic_id|ID|FK|非空 / 无默认|费用诊所 -> clinic.clinic_id|
|creator_id|ID|FK|非空 / 无默认|首次登记财务 -> employee.employee_id|
|category|TEXT||非空 / 无默认|类别|
|amount|DECIMAL(18,2)||非空 / 无默认|金额|
|occurred_on|DATE||非空 / 无默认|发生日期|
|pending_note|TEXT||可空 / 无默认|待补说明|
|row_version|INT64||非空 / 1|并发更新读取基准|
|voucher_reference|TEXT||可空 / 无默认|凭据编号或可追查的来源定位|
|voucher_note|TEXT||可空 / 无默认|凭据来源说明|

### expense_revision　原费用版本

不可变完整原版，固定当时凭据编号、来源说明及费用事实；与业务修改和审计共同提交。旧季度采用原版不回读后来更正。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|expense_revision_id|ID|PK|非空 / 无默认|稳定技术标识|
|expense_id|ID|FK|非空 / 无默认|所属稳定业务对象 -> operating_expense.expense_id|
|version_no|INT64||非空 / 无默认|该对象历史版本|
|clinic_id|ID|FK|非空 / 无默认|费用诊所 -> clinic.clinic_id|
|creator_id|ID|FK|非空 / 无默认|首次登记财务 -> employee.employee_id|
|category|TEXT||非空 / 无默认|类别|
|amount|DECIMAL(18,2)||非空 / 无默认|金额|
|occurred_on|DATE||非空 / 无默认|发生日期|
|pending_note|TEXT||可空 / 无默认|待补说明|
|operation_id|ID|FK|非空 / 无默认|形成此版的原操作 -> business_operation.operation_id|
|voucher_reference|TEXT||可空 / 无默认|凭据编号或可追查的来源定位|
|voucher_note|TEXT||可空 / 无默认|凭据来源说明|

组合唯一：expense_id, version_no；NULL策略：NON_NULL_VALUES。

组合唯一：expense_revision_id, expense_id；NULL策略：NON_NULL_VALUES。

### data_issue　资料检查问题

原对象整体缺失不造假源对象；通知不是解决，合理空项不补成有值。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|issue_id|ID|PK|非空 / 无默认|稳定技术标识|
|clinic_id|ID|FK|非空 / 无默认|检查诊所 -> clinic.clinic_id|
|period_note|TEXT||可空 / 无默认|检查期间|
|source_locator|TEXT||非空 / 无默认|原来源或缺失定位|
|category|TEXT||非空 / 无默认|问题类别|
|severity|TEXT||非空 / 无默认|关键程度|
|responsible_role|TEXT||非空 / 无默认|负责岗位|
|handling_note|TEXT||可空 / 无默认|处理事项|
|notification_note|TEXT||可空 / 无默认|真实通知情况|
|recheck_conclusion|TEXT||可空 / 无默认|复查结论|
|reasonable_blank|TEXT||可空 / 无默认|合理空项解释|
|row_version|INT64||非空 / 1|并发更新读取基准|

### issue_action　资料问题处理历史

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|issue_action_id|ID|PK|非空 / 无默认|稳定技术标识|
|issue_id|ID|FK|非空 / 无默认|问题 -> data_issue.issue_id|
|employee_id|ID|FK|非空 / 无默认|实际处理人 -> employee.employee_id|
|occurred_at|INSTANT||非空 / 无默认|处理时刻|
|action_conclusion|TEXT||非空 / 无默认|动作及核实结论|

### quarter_run　季度核算上下文

原范围非空且不缩减；调整另版不重置首次完成时刻。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|quarter_id|ID|PK|非空 / 无默认|稳定技术标识|
|quarter_label|TEXT||非空 / 无默认|业务季度|
|business_timezone|TEXT||非空 / 无默认|业务时区|
|quarter_end_at|INSTANT||非空 / 无默认|原季度结束时刻|
|first_full_confirmed_at|INSTANT||可空 / 无默认|首次全范围正式确认|
|row_version|INT64||非空 / 1|并发更新读取基准|

### quarter_scope　季度原纳入诊所

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|quarter_id|ID|PK FK|非空 / 无默认|核算上下文 -> quarter_run.quarter_id|
|clinic_id|ID|PK FK|非空 / 无默认|原诊所 -> clinic.clinic_id|

### quarter_doctor_scope　季度原牙医诊所范围

原牙医/诊所组合固定，不能通过少分项绕过完整核算。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|quarter_id|ID|PK FK|非空 / 无默认|核算上下文 -> quarter_run.quarter_id|
|clinic_id|ID|PK FK|非空 / 无默认|原诊所 -> clinic.clinic_id|
|doctor_id|ID|PK FK|非空 / 无默认|原牙医 -> employee.employee_id|

CF07：(quarter_id, clinic_id) -> quarter_scope (quarter_id, clinic_id)；MATCH SIMPLE须配行级条件。

### quarter_problem　季度范围内问题

涵盖尚未提交诊所的缺漏问题，不只检查已提交资料内的问题；原范围与问题诊所/期间须相容。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|quarter_id|ID|PK FK|非空 / 无默认|核算上下文 -> quarter_run.quarter_id|
|issue_id|ID|PK FK|非空 / 无默认|待检查问题 -> data_issue.issue_id|

### quarter_submission　诊所季度资料版本

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|submission_id|ID|PK|非空 / 无默认|稳定技术标识|
|quarter_id|ID|FK|非空 / 无默认|核算上下文 -> quarter_run.quarter_id|
|clinic_id|ID|FK|非空 / 无默认|提交诊所 -> clinic.clinic_id|
|version_no|INT64||非空 / 无默认|提交版本|
|submitted_by|ID|FK|非空 / 无默认|提交人员 -> employee.employee_id|
|submitted_at|INSTANT||非空 / 无默认|提交时刻|
|unresolved_note|TEXT||可空 / 无默认|当时未解决事项|

组合唯一：quarter_id, clinic_id, version_no；NULL策略：NON_NULL_VALUES。

组合唯一：submission_id, quarter_id, clinic_id；NULL策略：NON_NULL_VALUES。

CF08：(quarter_id, clinic_id) -> quarter_scope (quarter_id, clinic_id)；MATCH SIMPLE须配行级条件。

### submission_problem　提交保留问题

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|submission_id|ID|PK FK|非空 / 无默认|提交版 -> quarter_submission.submission_id|
|issue_id|ID|PK FK|非空 / 无默认|问题 -> data_issue.issue_id|
|adopted_conclusion|TEXT||非空 / 无默认|提交当时结论|

### submission_receipt　提交原实收依据

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|submission_id|ID|PK FK|非空 / 无默认|提交版 -> quarter_submission.submission_id|
|receipt_revision_id|ID|PK FK|非空 / 无默认|原收款版 -> receipt_revision.receipt_revision_id|
|receipt_id|ID|FK|非空 / 无默认|采用稳定来源 -> receipt.receipt_id|

组合唯一：submission_id, receipt_id；NULL策略：NON_NULL_VALUES。

CF04：(receipt_revision_id, receipt_id) -> receipt_revision (receipt_revision_id, receipt_id)；MATCH SIMPLE须配行级条件。

### submission_issue　提交原材料依据

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|submission_id|ID|PK FK|非空 / 无默认|提交版 -> quarter_submission.submission_id|
|issue_revision_id|ID|PK FK|非空 / 无默认|原领用版 -> issue_revision.issue_revision_id|
|issue_id|ID|FK|非空 / 无默认|采用稳定来源 -> material_issue.issue_id|

组合唯一：submission_id, issue_id；NULL策略：NON_NULL_VALUES。

CF05：(issue_revision_id, issue_id) -> issue_revision (issue_revision_id, issue_id)；MATCH SIMPLE须配行级条件。

### submission_expense　提交原费用依据

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|submission_id|ID|PK FK|非空 / 无默认|提交版 -> quarter_submission.submission_id|
|expense_revision_id|ID|PK FK|非空 / 无默认|原费用版 -> expense_revision.expense_revision_id|
|expense_id|ID|FK|非空 / 无默认|采用稳定来源 -> operating_expense.expense_id|

组合唯一：submission_id, expense_id；NULL策略：NON_NULL_VALUES。

CF06：(expense_revision_id, expense_id) -> expense_revision (expense_revision_id, expense_id)；MATCH SIMPLE须配行级条件。

### quarter_result_version　季度整批结果版本

一版完整整批，不是每牙医一份审批；人员和时间共同有/共同无。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|result_id|ID|PK|非空 / 无默认|稳定技术标识|
|quarter_id|ID|FK|非空 / 无默认|原核算范围 -> quarter_run.quarter_id|
|policy_version_id|ID|FK|非空 / 无默认|采用口径 -> calculation_policy_version.policy_version_id|
|version_no|INT64||非空 / 无默认|整批结果版本|
|confirmed_by|ID|FK|可空 / 无默认|正式确认人员 -> employee.employee_id|
|confirmed_at|INSTANT||可空 / 无默认|本版正式确认时刻|

组合唯一：quarter_id, version_no；NULL策略：NON_NULL_VALUES。

组合唯一：result_id, quarter_id；NULL策略：NON_NULL_VALUES。

### quarter_result_line　牙医诊所结果分项

费用合计由分配项汇总，经营贡献按原口径派生；同员工跨店再合计。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|result_line_id|ID|PK|非空 / 无默认|稳定技术标识|
|result_id|ID|FK|非空 / 无默认|整批结果版 -> quarter_result_version.result_id|
|doctor_id|ID|FK|非空 / 无默认|一位牙医 -> employee.employee_id|
|clinic_id|ID|FK|非空 / 无默认|一家诊所 -> clinic.clinic_id|
|received_income|DECIMAL(18,2)||非空 / 无默认|已核实实收收入|
|material_cost|DECIMAL(18,2)||非空 / 无默认|已核实材料成本|
|quarter_id|ID|FK|非空 / 无默认|原核算上下文 -> quarter_run.quarter_id|

组合唯一：result_id, doctor_id, clinic_id；NULL策略：NON_NULL_VALUES。

CF11：(result_id, quarter_id) -> quarter_result_version (result_id, quarter_id)；MATCH SIMPLE须配行级条件。

CF12：(quarter_id, clinic_id, doctor_id) -> quarter_doctor_scope (quarter_id, clinic_id, doctor_id)；MATCH SIMPLE须配行级条件。

CF13：(result_id, clinic_id) -> result_submission (result_id, clinic_id)；MATCH SIMPLE须配行级条件。

### expense_allocation_line　费用分配项

按每份原费用版本核对可分配总额，不猜比例或把待分项作零。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|allocation_id|ID|PK|非空 / 无默认|稳定技术标识|
|result_line_id|ID|FK|非空 / 无默认|原业绩分项 -> quarter_result_line.result_line_id|
|expense_revision_id|ID|FK|非空 / 无默认|采用原费用版本 -> expense_revision.expense_revision_id|
|adopted_amount|DECIMAL(18,2)||非空 / 无默认|核对分配金额|
|basis|TEXT||非空 / 无默认|核实分配依据|

组合唯一：result_line_id, expense_revision_id；NULL策略：NON_NULL_VALUES。

### result_submission　整批采用提交版

同版同诊所只一份采用提交，核验同季度同诊所且覆盖原范围。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|result_id|ID|PK FK|非空 / 无默认|结果版 -> quarter_result_version.result_id|
|clinic_id|ID|PK FK|非空 / 无默认|原诊所 -> clinic.clinic_id|
|submission_id|ID|FK|非空 / 无默认|该诊所采用提交版 -> quarter_submission.submission_id|
|quarter_id|ID|FK|非空 / 无默认|同一核算上下文 -> quarter_run.quarter_id|

CF09：(result_id, quarter_id) -> quarter_result_version (result_id, quarter_id)；MATCH SIMPLE须配行级条件。

CF10：(submission_id, quarter_id, clinic_id) -> quarter_submission (submission_id, quarter_id, clinic_id)；MATCH SIMPLE须配行级条件。

### calculation_policy_version　核算口径原版

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|policy_version_id|ID|PK|非空 / 无默认|稳定技术标识|
|version_no|INT64||非空 / 无默认|口径版本|
|business_timezone|TEXT||非空 / 无默认|业务时区|
|income_rule|TEXT||非空 / 无默认|收入归集口径|
|cost_rule|TEXT||非空 / 无默认|成本归集口径|
|expense_rule|TEXT||非空 / 无默认|费用分配规则|

### result_review　整批复核结论历史

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|review_id|ID|PK|非空 / 无默认|稳定技术标识|
|result_id|ID|FK|非空 / 无默认|原结果版 -> quarter_result_version.result_id|
|employee_id|ID|FK|非空 / 无默认|真实复核人员 -> employee.employee_id|
|conclusion|TEXT||非空 / 无默认|退回/核对/正式确认及意见|
|reviewed_at|INSTANT||非空 / 无默认|实际复核时刻|

### result_income_source　牙医实收来源核对

逐原交易去重并核对合计，不能把同一笔全额复制给多个牙医分项。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|income_source_id|ID|PK|非空 / 无默认|稳定技术标识|
|result_line_id|ID|FK|非空 / 无默认|业绩分项 -> quarter_result_line.result_line_id|
|receipt_revision_id|ID|FK|非空 / 无默认|采用原收款版 -> receipt_revision.receipt_revision_id|
|adopted_amount|DECIMAL(18,2)||非空 / 无默认|核对归集金额|
|basis|TEXT||非空 / 无默认|原归属核实依据|

组合唯一：result_line_id, receipt_revision_id；NULL策略：NON_NULL_VALUES。

### result_material_source　材料成本来源核对

采用已核实数量、成本价和归属；不声称逐牙治疗精确耗材。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|material_source_id|ID|PK|非空 / 无默认|稳定技术标识|
|result_line_id|ID|FK|非空 / 无默认|业绩分项 -> quarter_result_line.result_line_id|
|issue_revision_id|ID|FK|非空 / 无默认|采用原领用版 -> issue_revision.issue_revision_id|
|adopted_cost|DECIMAL(18,2)||非空 / 无默认|核对归集成本|
|basis|TEXT||非空 / 无默认|核实归集依据|

组合唯一：result_line_id, issue_revision_id；NULL策略：NON_NULL_VALUES。

### result_unassigned_sale　未归属商品实收来源

保留诊所来源，不猜牙医、不当零、不重复归集已分项金额。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|unassigned_id|ID|PK|非空 / 无默认|稳定技术标识|
|result_id|ID|FK|非空 / 无默认|结果版 -> quarter_result_version.result_id|
|clinic_id|ID|FK|非空 / 无默认|原诊所 -> clinic.clinic_id|
|receipt_revision_id|ID|FK|非空 / 无默认|原商品收款版 -> receipt_revision.receipt_revision_id|
|unassigned_amount|DECIMAL(18,2)||非空 / 无默认|仍未归属牙医金额|

组合唯一：result_id, receipt_revision_id；NULL策略：NON_NULL_VALUES。

## 经营分析与操作历史

### analysis_run　经营分析查询原版

保存本次原查询条件、固定来源清单及原结果的单个聚合；允许未知分项，不把失败冒充完整结果。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|analysis_id|ID|PK|非空 / 无默认|稳定技术标识|
|employee_id|ID|FK|非空 / 无默认|实际查询人员 -> employee.employee_id|
|analysis_type|TEXT||非空 / 无默认|分析类别与对象|
|period_from|INSTANT||非空 / 无默认|期间起点|
|period_to|INSTANT||非空 / 无默认|期间终点|
|business_timezone|TEXT||非空 / 无默认|业务时区|
|data_as_of|INSTANT||非空 / 无默认|固定数据时点|
|statistical_rule|TEXT||非空 / 无默认|统计口径|
|completeness_note|TEXT||非空 / 无默认|完整程度及未知待核实项|
|queried_at|INSTANT||非空 / 无默认|实际查询时刻|
|source_version_manifest|DOCUMENT||非空 / 无默认|原来源版本清单|
|result_snapshot|DOCUMENT||非空 / 无默认|数量金额构成及未知项原结果|

### analysis_scope　分析原诊所范围

范围非空，明细与导出分别授权。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|analysis_id|ID|PK FK|非空 / 无默认|分析 -> analysis_run.analysis_id|
|clinic_id|ID|PK FK|非空 / 无默认|原诊所 -> clinic.clinic_id|

### analysis_staff_scope　分析人员及维度

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|analysis_staff_scope_id|ID|PK|非空 / 无默认|稳定技术标识|
|analysis_id|ID|FK|非空 / 无默认|分析 -> analysis_run.analysis_id|
|employee_id|ID|FK|可空 / 无默认|选定人员 -> employee.employee_id|
|dimension_definition|TEXT||非空 / 无默认|原维度与条件|

### business_operation　业务操作历史

追加不可改；不记口令；多态定位不是受数据库FK约束的源关系。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|operation_id|ID|PK|非空 / 无默认|稳定技术标识|
|actor_id|ID|FK|非空 / 无默认|实际操作人员 -> employee.employee_id|
|analysis_id|ID|FK|可空 / 无默认|对应经营分析 -> analysis_run.analysis_id|
|occurred_at|INSTANT||非空 / 无默认|操作保存时刻|
|action_code|TEXT||非空 / 无默认|类别及动作|
|subject_kind|TEXT||非空 / 无默认|受控对象种类|
|subject_key|TEXT||非空 / 无默认|对象定位符(非FK)|
|before_content|DOCUMENT||可空 / 无默认|变更前值及原版|
|after_content|DOCUMENT||可空 / 无默认|变更后值及本版|
|reason|TEXT||可空 / 无默认|原因|
|access_scope|DOCUMENT||可空 / 无默认|实际供阅及导出范围|

### operation_clinic　操作实际诊所范围

按所属聚合与实际事实共同保存。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|operation_id|ID|PK FK|非空 / 无默认|操作 -> business_operation.operation_id|
|clinic_id|ID|PK FK|非空 / 无默认|实际范围 -> clinic.clinic_id|

### command_dedup　成功命令去重

与业务/历史同事务成功；失败无成功行；旧键重试不覆盖后来更正。

|列|类型|PK/FK/独立唯一|可空/默认|含义及目标|
|---|---|---|---|---|
|request_key|STRING(64)|PK|非空 / 无默认|逻辑提交键|
|actor_id|ID|FK|非空 / 无默认|原提交人员 -> employee.employee_id|
|command_code|TEXT||非空 / 无默认|受控命令种类|
|payload_fingerprint|TEXT||非空 / 无默认|非凭据载荷指纹|
|operation_id|ID|FK UQ|非空 / 无默认|成功原操作 -> business_operation.operation_id|
|result_kind|TEXT||非空 / 无默认|受控结果种类|
|result_key|TEXT||非空 / 无默认|原结果定位(非FK)|

## 行级约束候选

- CK01 receipt (bill_id, sale_id)：每笔收款恰选一个原单据。 [exactly_one]

- CK02 receipt_revision (bill_id, sale_id)：收款原版恰选一种稳定原单。 [exactly_one]

- CK03 receipt_revision (bill_id, bill_revision_id)：治疗原单与治疗单原版成组存在。 [all_or_none]

- CK04 receipt_revision (sale_id, sale_revision_id)：商品原单与商品单原版成组存在。 [all_or_none]

- CK05 stock_movement (receipt_id, issue_revision_id, delivery_line_id, stocktake_line_id)：每条库存变动恰有一种真实来源。 [exactly_one]

- CK06 visit (appointment_id, appointment_revision_id)：无预约到院允许；有预约则固定采用原版。 [all_or_none]

- CK07 visit_revision (appointment_id, appointment_revision_id)：就诊原版保留同样的成组条件。 [all_or_none]

- CK08 followup_task (plan_version_id, node_id)：有方案时节点与版本同时存在；无方案时两者同时空。 [all_or_none]

- CK09 followup_task (plan_version_id, doctor_instruction, instruction_doctor_id)：无方案时有非空医生要求及要求医生。 [doctor_if_no_plan]

- CK10 quarter_result_version (confirmed_by, confirmed_at)：确认人员与真实确认时刻成组保存。 [all_or_none]

- CK11 visit (arrived_at, started_at, ended_at, left_at)：仅比较已知到院、开始、结束、离开事实，允许未接诊先离开。 [known_order]

- CK12 visit_revision (arrived_at, started_at, ended_at, left_at)：原版已知事实同样按真实时间相容。 [known_order]

- CK13 doctor_schedule (starts_at, ends_at)：结束必须晚于开始。 [end_after_start]

- CK14 analysis_run (period_from, period_to)：结束必须晚于开始。 [end_after_start]

- CK15 practice_assignment (valid_from, valid_to)：已知终点不得早于起点；时间区间终点不含，执业日期起止均含。 [optional_end]

- CK16 item_price_version (effective_from, effective_to)：已知终点不得早于起点；时间区间终点不含，执业日期起止均含。 [optional_end]

- CK17 access_grant (effective_from, effective_to)：已知终点不得早于起点；时间区间终点不含，执业日期起止均含。 [optional_end]

- CK18 followup_plan_version (effective_from, effective_to)：已知终点不得早于起点；时间区间终点不含，执业日期起止均含。 [optional_end]

- CK19 clinic_availability_plan (effective_from, effective_to)：已知终点不得早于起点；时间区间终点不含，执业日期起止均含。 [optional_end]

- CK20 stock_balance (quantity)：已知数量/金额非负；可空成本价仍表示未核实，不补0。 [nonnegative]

- CK21 item_price_version (amount)：已知数量/金额非负；可空成本价仍表示未核实，不补0。 [nonnegative]

- CK22 receipt (amount)：已知数量/金额非负；可空成本价仍表示未核实，不补0。 [nonnegative]

- CK23 receipt_revision (amount)：已知数量/金额非负；可空成本价仍表示未核实，不补0。 [nonnegative]

- CK24 operating_expense (amount)：已知数量/金额非负；可空成本价仍表示未核实，不补0。 [nonnegative]

- CK25 expense_revision (amount)：已知数量/金额非负；可空成本价仍表示未核实，不补0。 [nonnegative]

- CK26 treatment_bill_line (adopted_unit_price)：已知数量/金额非负；可空成本价仍表示未核实，不补0。 [nonnegative]

- CK27 product_sale_line (adopted_unit_price)：已知数量/金额非负；可空成本价仍表示未核实，不补0。 [nonnegative]

- CK28 material_issue (cost_unit_price)：已知数量/金额非负；可空成本价仍表示未核实，不补0。 [nonnegative]

- CK29 stock_receipt (unit_price)：已知数量/金额非负；可空成本价仍表示未核实，不补0。 [nonnegative]

- CK30 file_asset (byte_size)：已知数量/金额非负；可空成本价仍表示未核实，不补0。 [nonnegative]

- CK31 treatment_bill_line (quantity)：实际业务行数量必须大于0。 [positive]

- CK32 product_sale_line (quantity)：实际业务行数量必须大于0。 [positive]

- CK33 product_delivery_line (delivered_quantity)：实际业务行数量必须大于0。 [positive]

- CK34 material_issue (quantity)：实际业务行数量必须大于0。 [positive]

- CK35 stock_receipt (quantity)：实际业务行数量必须大于0。 [positive]

- CK36 employee (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK37 clinic (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK38 practice_assignment (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK39 qualification_version (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK40 staff_account (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK41 security_role (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK42 access_grant (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK43 patient (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK44 doctor_schedule (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK45 appointment (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK46 visit (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK47 clinical_record (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK48 treatment (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK49 clinical_image (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK50 lab_order (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK51 lab_requirement_version (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK52 treatment_item (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK53 item_price_version (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK54 treatment_bill (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK55 product_sale (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK56 receipt (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK57 supplier (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK58 material (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK59 stock_balance (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK60 material_issue (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK61 followup_plan_version (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK62 followup_task (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK63 recall_attempt (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK64 operating_expense (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK65 quarter_run (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK66 quarter_submission (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK67 calculation_policy_version (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK68 quarter_result_version (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK69 data_issue (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK70 patient_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK71 employee_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK72 clinic_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK73 practice_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK74 schedule_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK75 appointment_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK76 visit_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK77 clinical_record_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK78 bill_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK79 sale_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK80 receipt_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK81 issue_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK82 expense_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK83 followup_plan (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK84 qualification (row_version)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK85 role_version (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK86 treatment_revision (version_no)：技术版本号为正数，不能据此代替权限或实际业务状态。 [positive]

- CK87 lab_handover (direction)：交接方向取固定技术代码，保留实际交接内容。 [in_set]

- CK88 lab_order (current_review_id, current_received_handover_id)：有当前核对指针必须有当前接收指针；初次建单两者可空。 [requires]

- CK89 lab_handover (direction, matches_requirement)：送出不填接收相符结论；接收NULL为未核实，不能当TRUE。 [receive_only]

- CK90 recall_contact (reached_patient, stated_intention)：未触及患者不能登记本次明确患者意向；NULL不清空原意向。 [contact_intention]

- CK91 followup_issue (resolved_at, doctor_id, progress_conclusion)：解除专业待处理须真实医生及具体处理依据；字段非空只是后备，不代替真实核验。 [resolution_basis]

- CK92 stock_receipt (row_version)：当前补价版本为正；原字段不能据此自动补造。 [positive_version]

- CK93 stocktake (row_version)：盘点所有子项变更共同推进同一根版本。 [positive_version]

- CK94 stocktake_line (baseline_stock_version)：非负基准库存版本；必须来自实际一致性读取，不能据当前量猜旧值。 [baseline_version]

- CK95 stock_movement (stock_version_before, stock_version_after)：非负写前版，写后版等于写前版加1；同库存同次总写可含多来源变动，不加一版本一行错误唯一。 [version_step]

- CK96 patient (allergy_knowledge)：NULL或unknown表示尚未了解；none_reported表示患者表示无已知过敏；reported表示已报告具体过敏。不由空备注推导。 [nullable_enum]

- CK97 patient_revision (allergy_knowledge)：NULL或unknown表示尚未了解；none_reported表示患者表示无已知过敏；reported表示已报告具体过敏。不由空备注推导。 [nullable_enum]

- CK98 patient_allergy (allergen)：过敏对象去首尾空白后非空；说明可未知，不猜过敏程度。 [nonblank]

- CK99 patient_revision_allergy (allergen)：过敏对象去首尾空白后非空；说明可未知，不猜过敏程度。 [nonblank]

## 跨表及事务责任

### DC01 最少集合

完整就诊至少一位配合护士，病历至少一位书写医生；价格、随访方案、季度、邀约和分析范围满足原要求非空。

承担：FK只能约束已存在的行；保存服务核验整个聚合并共同提交。；用例：UC01-04/06/09/14/24/28-31

### DC02 真实岗位

前台据医护反馈登记到院、开始、结束、离开，不能作临床确认；病历和实际治疗仍由医生确认。

承担：服务端本人授权＋字段写入范围＋原值/原因/历史共同保存。；用例：UC04/06

### DC03 排班执业

同医生跨店时段、同店执业期间、有效业务启停及已知预约影响重验。

承担：按医生/诊所稳定身份控制冲突；区间冲突不可用简单唯一代替。；用例：UC02/03/34/36

### DC04 单据全额实收

单据行、采用原价、金额、实收和同源原版相符；账单已付不得以普通编辑破坏已收事实。

承担：读取并锁定/条件核验原版，单据/实收/原版/历史/成功键同事务。；用例：UC10/11

### DC05 不可变采用

修订产生新原版，旧行与集合不改；账单采用治疗原版与稳定治疗同源、就诊一致；收款原版与单据版同源。

承担：组合FK兜底部分身份；临床归属与价目适用由领域核对。；用例：UC06/10/11/24-27

### DC06 单据明细

账单至少一行；商品销售至少一行；小计用原数量和采用单价，整单合计为行小计之和。

承担：金额使用十进制定点，统一币种与舍入口径；不以浮点或当前价回算。；用例：UC10/12

### DC07 金额口径

拟议行小计按数量×单价精确乘积四舍五入到2位，再汇总；不新增汇率、多币种或折扣功能。

承担：逐行2位舍入为拟议实现口径，实施前确认；币种沿组织统一配置，示例数不是现场实测。；用例：UC09-12/25/31

### DC08 库存变动

入库、领用、销售交付、盘点调整与变动/结存同成败；每次更正按已应用旧事实计算新净变化。已被引用的库存范围身份不就地换写，真实错填留旧范围与调整依据。

承担：聚合row_version＋本次实际操作＋成功键；锁定涉及库存，防负数和无依据重复应用。不新增跨店调拨业务。；用例：UC12/16-18

### DC09 盘点对齐

基准到实盘间已发生变动先对齐；只调整当时核实净差并保留实际变动历史。

承担：同次事务重核当前结存及期间变动；更正仍需真实原值/时点/原因，不回写旧变动。；用例：UC18

### DC10 整次交付

每销售行的库存分配数量合计等于原销售行数量，物资/单位/诊所相符，交付时刻属于同次实际交付。

承担：全部分配、库存、变动与销售历史共同有效；付款和交付分别表达。；用例：UC12

### DC11 季度源采用

每提交每笔稳定实收/领用/费用只采用一个原版，原来源诊所与业务期间相符。

承担：组合唯一/FK＋核算口径和诊所范围核验；桥接行存在不证明资料全齐。；用例：UC24/25

### DC12 季度完整范围

原诊所和牙医诊所组合固定；每诊所明确采用一份提交版，分项集合恰好覆盖原范围。

承担：组合FK只能保证成员合法；还要集合相等检查，不能用合法子集冒充全范围。；用例：UC25/26

### DC13 合计不重复

逐稳定来源核对分项收入、材料成本和费用分配总额；同一来源不能换一个版本重复归集。

承担：按采用提交清单检查版本与根身份；不能将同笔全额复制到多个分项。；用例：UC25/26

### DC14 未知与未归属

材料成本待核实不当0；商品仍未归属牙医的实收保留诊所来源。

承担：未知阻止不应完成的确认；未归属余额与已归集部分一起核对，不猜分配。；用例：UC22/25/26

### DC15 首次全范围完成

原范围、来源版本、关键问题、人员同意和完整快照均满足才固定首次时刻。

承担：同事务保存确认结果和首次标记；调整另版，不能重置首次时刻。；用例：UC26

### DC16 资料问题

检查含尚未提交诊所；通知和转交不是解决，合理空项解释不伪补字段。

承担：当前问题/复查结论/真实处理历史和季度原问题集合共同核对。；用例：UC22/24-26

### DC17 加工可用

只对当前相符要求及实际接收作医生临床核对；未解问题不判可用，接收不等于装戴。

承担：组合FK＋接收方向/当前要求/问题相容；不得由预计时间推实际返回。；用例：UC08

### DC18 方案及联系

方案当前启停、原版适用时间、患者原引用分别保存；未联系到患者不记成功，也不抹旧成功。

承担：方案稳定身份＋版本/节点＋真实尝试；不把配置时间当医学规则。；用例：UC13/14

### DC19 邀约意向

首次真实尝试保存才形成邀约；后续未接通不清空已有意向，愿来不等于预约或到院。

承担：筛选只读，保存重验期间新就诊；真实联系仍留存，不伪称当前仍需邀约。；用例：UC15

### DC20 有效授权

账号、功能、诊所、对象、字段和导出分别核验；停用账号限制后续请求；角色定义采用原版。

承担：服务端加载及保存时重验；UC33修改角色功能时，同次受控生成受影响账号的新许可版，不能只改模板让许可名实不符；失败不留半完成，旧定义保留。；用例：UC32/33/35

### DC21 受控定位与附件

审计subject_key/result_key、资料缺失定位、影响安排说明均非FK；附件元数据存在不等于实际可读。

承担：受控种类白名单及来源/存在性核验；文件访问重新授权，日志不泄露凭据。；用例：UC05/07/08/22/34/35/37

### DC22 其他启停事实

项目、物资、供应商、账号、执业等启停安排沿原类属性保存；不能凭当前姓名/备注或账号启停推临床在岗。

承担：启停不采用统一字符串规则；按各用例的结构化状态及当前可用条件判定。；用例：UC09/19/20/32/34/36

### DC23 成功重试与失败

去重键绑定本人、命令、载荷和已成功原操作；失败无成功行，结果不明先核实。

承担：业务事实、原版、历史、库存及成功键同事务；冲突不以盲重试覆盖后来更正。；用例：全部写用例

### DC24 历史及结果载荷

规范业务关联不使用DOCUMENT替代；审计载荷与经营分析来源/原结果只存受控结构，不开放任意脚本。

承担：采用不可变schema版本与白名单；210属性映射核对字段存在，不等于软件运行正确性证明。；用例：UC28-31/35

### DC25 建档来源与逐项过敏

建档诊所记录首次实际建档来源；新建时必填且须在本人许可内，不由首次就诊推导。普通修订保留原值；确属原登记错误时，按UC01当前字段权限核实原因并保留原版。历史不明可留空，不猜补；诊所后续停用不抹去原事实。 过敏内容按项保存过敏对象和说明，并与了解情况区分；空值不等于无过敏。未提交或无权的子集合不清空；明确变更须整体核对，已报告具体过敏时至少一项。旧备注原文保留，不自动拆分或据备注推断无过敏。

承担：患者领域核对受许可提交；根、当前集合、不可变原版集合、审计和成功键共同提交；不以FK单独证明集合语义。；用例：UC01

## 候选访问索引

|编号|表与列序|目的|用例|
|---|---|---|---|
|IX01|appointment (clinic_id, scheduled_at)|前台按诊所与日期检索预约|UC03|
|IX02|doctor_schedule (doctor_id, starts_at, ends_at)|核对同一医生跨店时段|UC02/03|
|IX03|visit (patient_id, arrived_at)|患者实际就诊历史与长期未诊筛选|UC05/15|
|IX04|visit (clinic_id, arrived_at)|诊所实际到院期间及工作量|UC04/28/29|
|IX05|receipt (received_at)|按实收发生期取治疗/商品交易，不强绑同日就诊|UC24/28/31|
|IX06|stock_balance (clinic_id, expires_on)|诊所库存效期预警|UC21|
|IX07|stock_movement (stock_id, occurred_at)|盘点期间实际净变动及来源核对|UC18|
|IX08|followup_task (responsible_id, planned_at)|按负责人员加载到期待联系安排|UC13|
|IX09|clinical_image (visit_id, formed_at)|按实际就诊加载影像目录|UC05/07|
|IX10|data_issue (clinic_id, severity)|检查诊所资料问题；不能单靠关键程度判断已解决|UC22|
|IX11|business_operation (actor_id, occurred_at)|按真实人员和期间查操作历史|UC35|
|IX12|followup_contact (followup_id, contacted_at)|按随访取真实联系历史，不按最新一行推全部状态|UC13|

候选索引不是已验证执行计划；PK/UQ的物理索引、NULL唯一语法、区间冲突保护及隔离等级待产品选型。

