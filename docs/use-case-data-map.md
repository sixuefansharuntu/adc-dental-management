# 37用例数据读写与主页面贯通

这是主要模块读写集合，不代替全部扩展/全部字段或授权证明。

## UC01 维护患者档案

可能执行者：前台、医生、护士

原D3：106 / OP-C14X-13；主要页面：UI107-03 / 107

主要读取：patient、patient_tag、patient_channel、patient_revision、patient_revision_tag、patient_revision_channel、clinic、patient_allergy、patient_revision_allergy

业务写入：patient、patient_tag、patient_channel、patient_revision、patient_revision_tag、patient_revision_channel、patient_allergy、patient_revision_allergy

原边界操作ID：OP-C01、OP-C02、OP-C14X-02、OP-C14X-03、OP-C14X-04、OP-C14X-05、OP-C14X-07、OP-C14X-12、OP-C14X-15、OP-C14X-17、OP-C14X-18

## UC02 维护医生排班

可能执行者：前台、诊所管理人员

原D3：104 / OP-C14X-25；主要页面：UI108-02 / 108

主要读取：doctor_schedule、schedule_revision、clinic、employee、practice_assignment、appointment、appointment_revision

业务写入：doctor_schedule、schedule_revision

原边界操作ID：OP-C14X-19、OP-C14X-21、OP-C14X-23、OP-C14X-24、OP-C14X-35、OP-C14X-36、OP-C14X-37、OP-C14X-38、OP-C14X-40

## UC03 管理就诊预约

可能执行者：前台

原D3：104 / OP-C14X-45；主要页面：UI107-02 / 107

主要读取：patient、doctor_schedule、practice_assignment、appointment、appointment_revision、appointment_contact、visit

业务写入：appointment、appointment_revision、appointment_contact

原边界操作ID：OP-C14X-41、OP-C14X-43、OP-C14X-44、OP-C14X-47、OP-C14X-56

## UC04 登记实际就诊与安排接诊

可能执行者：前台

原D3：103 / OP-C10；主要页面：UI107-01 / 107

主要读取：patient、clinic、employee、practice_assignment、doctor_schedule、appointment、appointment_revision、visit、visit_nurse

业务写入：visit、visit_nurse、visit_revision、visit_revision_nurse、business_operation、operation_clinic、command_dedup

原边界操作ID：OP-C01、OP-C02、OP-C03、OP-C04、OP-C05、OP-C06、OP-C07、OP-R93-01、OP-R93-02、OP-R93-03、OP-R93-04

## UC05 查看诊疗资料

可能执行者：医生、护士

原D3：104 / OP-C02-06；主要页面：UI108-05 / 108

主要读取：patient、visit、clinical_record、clinical_record_revision、record_revision_writer、treatment、treatment_revision、treatment_revision_tooth、clinical_image、clinical_image_revision、file_asset

业务写入：业务对象不写入；按实际访问阶段留痕

原边界操作ID：OP-C02-01、OP-C02-04、OP-C02-05、OP-C02-08、OP-C02-09、OP-C02-12、OP-C02-13、OP-C02-14、OP-C02-30、OP-C02-31

## UC06 记录诊疗与治疗项目

可能执行者：医生

原D3：104 / OP-C03-05；主要页面：UI107-04 / 107

主要读取：visit、visit_revision、clinical_record、clinical_record_revision、record_revision_writer、treatment、treatment_revision、treatment_tooth、treatment_revision_tooth、treatment_item

业务写入：visit、clinical_record、clinical_record_writer、clinical_record_revision、record_revision_writer、treatment、treatment_tooth、treatment_revision、treatment_revision_tooth

原边界操作ID：OP-C03-01、OP-C03-03、OP-C03-04、OP-C03-08、OP-C03-19、OP-C03-20、OP-C03-25

## UC07 维护诊疗影像

可能执行者：影像人员、护士

原D3：104 / OP-C04-02；主要页面：UI108-07 / 108

主要读取：visit、clinical_image、clinical_image_revision、file_asset

业务写入：clinical_image、clinical_image_revision、file_asset

原边界操作ID：OP-C04-01、OP-C04-04、OP-C04-05、OP-C04-07、OP-C04-13、OP-C04-14、OP-C04-17、OP-C04-18、OP-C04-19

## UC08 管理义齿加工订单

可能执行者：医生、护士

原D3：104 / OP-C24X-25；主要页面：UI107-08 / 107

主要读取：patient、treatment、treatment_revision、lab_order、lab_requirement_version、lab_handover、lab_review

业务写入：lab_order、lab_requirement_version、lab_handover、lab_review

原边界操作ID：OP-C24X-01、OP-C24X-03、OP-C24X-04、OP-C24X-05、OP-C24X-06、OP-C24X-10、OP-C24X-12、OP-C24X-13、OP-C24X-18、OP-C24X-21、OP-C24X-24、OP-C24X-27、OP-C24X-30、OP-C24X-32

## UC09 维护治疗项目及收费价格

可能执行者：诊所管理人员、前台

原D3：105 / OP-C17X-08；主要页面：UI108-09 / 108

主要读取：treatment_item、item_price_version、item_price_clinic、clinic、treatment_bill_line、bill_revision_line

业务写入：treatment_item、item_price_version、item_price_clinic

原边界操作ID：OP-C17X-01、OP-C17X-03、OP-C17X-04、OP-C17X-06、OP-C17X-07、OP-C17X-09、OP-C17X-18、OP-C17X-23、OP-C17X-24、OP-C17X-25

## UC10 核对并生成治疗账单

可能执行者：医生、护士、前台

原D3：103 / OP-C56-05；主要页面：UI107-05 / 107

主要读取：visit、visit_revision、treatment、treatment_revision、treatment_revision_tooth、treatment_item、item_price_version、item_price_clinic、treatment_bill、treatment_bill_line、receipt

业务写入：treatment_bill、bill_staff、treatment_bill_line、bill_revision、bill_revision_staff、bill_revision_line、business_operation、operation_clinic、command_dedup

原边界操作ID：OP-C56-01、OP-C56-03、OP-C56-04、OP-C56-06、OP-C56-17、OP-C56-18

## UC11 登记收款

可能执行者：前台

原D3：103 / OP-C56-26；主要页面：UI107-06 / 107

主要读取：treatment_bill、bill_revision、bill_revision_line、receipt、receipt_revision

业务写入：treatment_bill、receipt、receipt_revision、business_operation、operation_clinic、command_dedup

原边界操作ID：OP-C56-22、OP-C56-24、OP-C56-25、OP-C56-27、OP-C56-34

## UC12 登记商品销售

可能执行者：前台

原D3：105 / OP-C17X-44；主要页面：UI107-07 / 107

主要读取：patient、product_sale、sale_revision、product_sale_line、sale_revision_line、product_delivery_line、stock_balance、stock_movement、material、receipt

业务写入：product_sale、product_sale_line、sale_revision、sale_revision_line、product_delivery_line、stock_balance、stock_movement

原边界操作ID：OP-C17X-26、OP-C17X-27、OP-C17X-29、OP-C17X-30、OP-C17X-32、OP-C17X-40、OP-C17X-42、OP-C17X-43、OP-C17X-45、OP-C17X-50

## UC13 管理诊后随访

可能执行者：护士、前台

原D3：104 / OP-C25X-44；主要页面：UI107-09 / 107

主要读取：patient、treatment、treatment_revision、followup_plan、followup_plan_version、followup_plan_node、followup_task、followup_contact、followup_issue

业务写入：followup_task、followup_contact、followup_issue

原边界操作ID：OP-C25X-22、OP-C25X-24、OP-C25X-25、OP-C25X-26、OP-C25X-27、OP-C25X-28、OP-C25X-33、OP-C25X-35、OP-C25X-39、OP-C25X-41、OP-C25X-43、OP-C25X-46、OP-C25X-49、OP-C25X-50、OP-C25X-51

## UC14 配置诊后随访方案

可能执行者：诊所管理人员

原D3：104 / OP-C25X-19；主要页面：UI108-14 / 108

主要读取：clinic、treatment_item、followup_plan、followup_plan_version、followup_plan_node、followup_plan_clinic

业务写入：followup_plan、followup_plan_version、followup_plan_node、followup_plan_clinic

原边界操作ID：OP-C25X-01、OP-C25X-03、OP-C25X-04、OP-C25X-05、OP-C25X-06、OP-C25X-07、OP-C25X-12、OP-C25X-14、OP-C25X-18、OP-C25X-21

## UC15 管理长期未就诊邀约

可能执行者：护士、前台

原D3：104 / OP-C25X-61；主要页面：UI108-15 / 108

主要读取：patient、visit、recall_attempt、recall_clinic、recall_contact

业务写入：recall_attempt、recall_clinic、recall_contact

原边界操作ID：OP-C25X-52、OP-C25X-54、OP-C25X-55、OP-C25X-60、OP-C25X-62、OP-C25X-67、OP-C25X-69、OP-C25X-70

## UC16 登记物资入库

可能执行者：库管

原D3：105 / OP-C19X-06；主要页面：UI108-16 / 108

主要读取：clinic、material、supplier、stock_balance、stock_receipt、stock_movement

业务写入：stock_balance、stock_receipt、stock_movement

原边界操作ID：OP-C19X-01、OP-C19X-02、OP-C19X-04、OP-C19X-05、OP-C19X-07、OP-C19X-17、OP-C19X-18

## UC17 登记材料领用出库

可能执行者：库管

原D3：105 / OP-C78-05；主要页面：UI108-17 / 108

主要读取：material、employee、stock_balance、material_issue、issue_revision、stock_movement、submission_issue、result_material_source

业务写入：material_issue、issue_revision、stock_balance、stock_movement

原边界操作ID：OP-C78-01、OP-C78-03、OP-C78-04、OP-C78-06、OP-C78-15

## UC18 执行库存盘点

可能执行者：库管

原D3：105 / OP-C19X-36；主要页面：UI107-10 / 107

主要读取：stocktake、stocktake_line、stock_balance、stock_movement、material、business_operation

业务写入：stocktake、stocktake_line、stock_balance、stock_movement

原边界操作ID：OP-C19X-21、OP-C19X-23、OP-C19X-24、OP-C19X-26、OP-C19X-35、OP-C19X-37、OP-C19X-41、OP-C19X-43

## UC19 维护物资目录

可能执行者：库管

原D3：105 / OP-C22X-14；主要页面：UI108-19 / 108

主要读取：material、stock_balance、stock_receipt、material_issue、product_sale_line

业务写入：material

原边界操作ID：OP-C22X-01、OP-C22X-03、OP-C22X-04、OP-C22X-07、OP-C22X-09、OP-C22X-10、OP-C22X-11、OP-C22X-12、OP-C22X-13、OP-C22X-15

## UC20 维护供应商资料

可能执行者：库管、诊所管理人员

原D3：105 / OP-C22X-35；主要页面：UI108-20 / 108

主要读取：supplier、supplier_file、file_asset、stock_receipt

业务写入：supplier、supplier_file、file_asset

原边界操作ID：OP-C22X-22、OP-C22X-24、OP-C22X-25、OP-C22X-28、OP-C22X-30、OP-C22X-31、OP-C22X-32、OP-C22X-33、OP-C22X-34、OP-C22X-36、OP-C22X-43、OP-C22X-44、OP-C22X-45、OP-C22X-46、OP-C22X-47、OP-C22X-48、OP-C22X-49

## UC21 查询库存与效期预警

可能执行者：库管、诊所管理人员

原D3：105 / OP-C19X-46；主要页面：UI108-21 / 108

主要读取：stock_balance、material、stock_receipt、material_issue、issue_revision、product_sale、product_sale_line、product_delivery_line、stocktake、stocktake_line、stock_movement

业务写入：业务对象不写入；按实际访问阶段留痕

原边界操作ID：OP-C19X-44、OP-C19X-45、OP-C19X-47、OP-C19X-50、OP-C19X-53、OP-C19X-57、OP-C19X-59、OP-C19X-60、OP-C19X-61、OP-C19X-62、OP-C19X-63、OP-C19X-64

## UC22 检查业务资料完整性

可能执行者：诊所资料负责人、前台

原D3：105 / OP-C12X-14；主要页面：UI108-22 / 108

主要读取：data_issue、issue_action、clinic、quarter_problem、submission_problem、business_operation

业务写入：data_issue、issue_action

原边界操作ID：OP-C12X-01、OP-C12X-03、OP-C12X-09、OP-C12X-12、OP-C12X-13、OP-C12X-19、OP-C12X-23、OP-C12X-24、OP-R91-01、OP-R91-02、OP-R91-03、OP-R91-04、OP-R91-05、OP-R91-06、OP-R91-07、OP-R91-08

## UC23 登记运营费用

可能执行者：财务人员

原D3：105 / OP-C78-20；主要页面：UI108-23 / 108

主要读取：clinic、operating_expense、expense_revision、submission_expense、expense_allocation_line

业务写入：operating_expense、expense_revision

原边界操作ID：OP-C78-16、OP-C78-18、OP-C78-19、OP-C78-21、OP-C78-26、OP-C78-27、OP-C78-28、OP-C78-31、OP-C78-34

## UC24 提交季度核算资料

可能执行者：诊所资料负责人

原D3：103 / OP-C9X-05；主要页面：UI107-11 / 107

主要读取：quarter_run、quarter_scope、quarter_doctor_scope、receipt、receipt_revision、material_issue、issue_revision、operating_expense、expense_revision、data_issue、issue_action

业务写入：quarter_run、quarter_submission、submission_receipt、submission_issue、submission_expense、submission_problem、business_operation、operation_clinic、command_dedup

原边界操作ID：OP-C9X-01、OP-C9X-03、OP-C9X-04、OP-C9X-06、OP-C9X-14

## UC25 核对并计算牙医季度业绩

可能执行者：总部核算人员

原D3：105 / OP-C9X-19；主要页面：UI107-12 / 107

主要读取：quarter_run、quarter_scope、quarter_doctor_scope、quarter_submission、submission_receipt、submission_issue、submission_expense、receipt、receipt_revision、material_issue、issue_revision、operating_expense、expense_revision、calculation_policy_version、data_issue、quarter_problem、quarter_result_version、result_submission

业务写入：quarter_run、quarter_result_version、result_submission、quarter_result_line、result_income_source、result_material_source、result_unassigned_sale、expense_allocation_line、data_issue、quarter_problem

原边界操作ID：OP-C9X-15、OP-C9X-17、OP-C9X-18、OP-C9X-20、OP-C9X-30、OP-C9X-31

## UC26 复核并确认季度业绩

可能执行者：总部复核负责人

原D3：105 / OP-C9X-36；主要页面：UI107-13 / 107

主要读取：quarter_run、quarter_scope、quarter_doctor_scope、quarter_submission、result_submission、submission_receipt、submission_issue、submission_expense、receipt、receipt_revision、material_issue、issue_revision、operating_expense、expense_revision、quarter_result_version、quarter_result_line、result_income_source、result_material_source、result_unassigned_sale、expense_allocation_line、calculation_policy_version、data_issue、quarter_problem、result_review

业务写入：quarter_run、quarter_result_version、result_review、data_issue、quarter_problem

原边界操作ID：OP-C9X-32、OP-C9X-34、OP-C9X-35、OP-C9X-37、OP-C9X-43、OP-C9X-46、OP-C9X-47、OP-C9X-48、OP-C9X-51

## UC27 查询季度业绩与核算依据

可能执行者：经营管理负责人、总部核算人员、总部复核负责人

原D3：105 / OP-C12X-26；主要页面：UI108-27 / 108

主要读取：quarter_run、quarter_result_version、result_review、result_submission、quarter_result_line、result_income_source、result_material_source、result_unassigned_sale、expense_allocation_line、receipt_revision、issue_revision、expense_revision、calculation_policy_version

业务写入：业务对象不写入；按实际访问阶段留痕

原边界操作ID：OP-C12X-25、OP-C12X-27、OP-C12X-32、OP-C12X-34、OP-C12X-35、OP-C12X-38、OP-C12X-41、OP-C12X-42、OP-R91-09、OP-R91-10、OP-R91-11、OP-R91-12、OP-R91-13、OP-R91-14、OP-R91-15、OP-R91-16、OP-R91-17、OP-R91-18、OP-R91-19、OP-R91-20、OP-R91-21、OP-R91-22、OP-R91-23、OP-R91-24

## UC28 查询诊所经营日报

可能执行者：前台、财务人员、经营管理负责人

原D3：106 / OP-C34X-02；主要页面：UI107-14 / 107

主要读取：clinic、clinic_revision、visit、visit_revision、treatment_bill、bill_revision、bill_revision_line、product_sale、sale_revision、sale_revision_line、receipt、receipt_revision

业务写入：analysis_run、analysis_scope

原边界操作ID：OP-C34X-01、OP-C34X-03、OP-C34X-04、OP-C34X-13、OP-C34X-16、OP-C34X-17、OP-C34X-20、OP-C34X-64、OP-C34X-65、OP-C34X-66、OP-C34X-67、OP-C34X-68、OP-C34X-69

## UC29 查询医生护士工作量与营收

可能执行者：经营管理负责人、财务人员

原D3：106 / OP-C34X-22；主要页面：UI108-29 / 108

主要读取：clinic、employee、employee_revision、visit、visit_revision、visit_revision_nurse、treatment_bill、bill_revision、bill_revision_staff、receipt、receipt_revision、product_sale、sale_revision

业务写入：analysis_run、analysis_scope、analysis_staff_scope

原边界操作ID：OP-C34X-21、OP-C34X-23、OP-C34X-24、OP-C34X-31、OP-C34X-33、OP-C34X-34、OP-C34X-36、OP-C34X-70、OP-C34X-71、OP-C34X-72

## UC30 分析患者来源与就诊构成

可能执行者：经营管理负责人

原D3：106 / OP-C34X-38；主要页面：UI108-30 / 108

主要读取：clinic、visit、visit_revision、patient、patient_revision、patient_revision_channel、patient_revision_tag

业务写入：analysis_run、analysis_scope

原边界操作ID：OP-C34X-37、OP-C34X-39、OP-C34X-40、OP-C34X-44、OP-C34X-46、OP-C34X-47、OP-C34X-49

## UC31 分析项目收入与付款方式

可能执行者：经营管理负责人、财务人员

原D3：106 / OP-C34X-51；主要页面：UI108-31 / 108

主要读取：receipt、receipt_revision、treatment_bill、bill_revision、bill_revision_line、product_sale、sale_revision、sale_revision_line、treatment_item、material

业务写入：analysis_run、analysis_scope

原边界操作ID：OP-C34X-50、OP-C34X-52、OP-C34X-53、OP-C34X-58、OP-C34X-60、OP-C34X-61、OP-C34X-63、OP-C34X-73、OP-C34X-74、OP-C34X-75

## UC32 维护员工账号

可能执行者：系统管理员

原D3：106 / OP-C28X-19；主要页面：UI108-32 / 108

主要读取：employee、staff_account、security_role、role_version、role_function、access_grant、grant_role、grant_clinic、grant_field

业务写入：staff_account

原边界操作ID：OP-C28X-01、OP-C28X-03、OP-C28X-04、OP-C28X-05、OP-C28X-06、OP-C28X-07、OP-C28X-11、OP-C28X-13、OP-C28X-18、OP-C28X-22

## UC33 配置角色及数据访问权限

可能执行者：系统管理员

原D3：106 / OP-C28X-37；主要页面：UI107-15 / 107

主要读取：staff_account、security_role、role_version、role_function、access_grant、grant_role、grant_clinic、grant_field、clinic

业务写入：staff_account、security_role、role_version、role_function、access_grant、grant_role、grant_clinic、grant_field

原边界操作ID：OP-C28X-24、OP-C28X-26、OP-C28X-27、OP-C28X-30、OP-C28X-31、OP-C28X-33、OP-C28X-36、OP-C28X-38、OP-C28X-42

## UC34 维护跨诊所执业关系

可能执行者：经营管理负责人、诊所管理人员

原D3：106 / OP-C31X-16；主要页面：UI108-34 / 108

主要读取：employee、employee_revision、clinic、practice_assignment、practice_revision、doctor_schedule、schedule_revision、appointment、appointment_revision

业务写入：practice_assignment、practice_revision

原边界操作ID：OP-C31X-01、OP-C31X-03、OP-C31X-04、OP-C31X-05、OP-C31X-06、OP-C31X-11、OP-C31X-13、OP-C31X-15、OP-C31X-17、OP-C31X-23、OP-C31X-24、OP-C31X-25、OP-C31X-26

## UC35 查询业务操作与更正历史

可能执行者：系统管理员、业务负责人

原D3：106 / OP-C28X-45；主要页面：UI108-35 / 108

主要读取：business_operation、operation_clinic、employee、staff_account

业务写入：业务对象不写入；按实际访问阶段留痕

原边界操作ID：OP-C28X-44、OP-C28X-46、OP-C28X-47、OP-C28X-51、OP-C28X-53、OP-C28X-55、OP-C28X-57、OP-C28X-59、OP-C28X-60、OP-C28X-61

## UC36 维护诊所基础资料

可能执行者：经营管理负责人、诊所管理人员

原D3：106 / OP-C31X-40；主要页面：UI108-36 / 108

主要读取：clinic、clinic_revision、clinic_availability_plan、employee、employee_revision、practice_assignment、doctor_schedule、appointment

业务写入：clinic、clinic_revision、clinic_availability_plan

原边界操作ID：OP-C31X-27、OP-C31X-29、OP-C31X-30、OP-C31X-31、OP-C31X-32、OP-C31X-35、OP-C31X-38、OP-C31X-39、OP-C31X-41、OP-C31X-46、OP-C31X-47、OP-C31X-48、OP-C31X-49

## UC37 维护牙医资料与专业资质

可能执行者：经营管理负责人、诊所管理人员

原D3：106 / OP-C31X-64；主要页面：UI108-37 / 108

主要读取：employee、employee_revision、employee_skill、employee_revision_skill、qualification、qualification_version、qualification_file、file_asset

业务写入：employee、employee_revision、employee_skill、employee_revision_skill、qualification、qualification_version、qualification_file、file_asset

原边界操作ID：OP-C31X-50、OP-C31X-52、OP-C31X-53、OP-C31X-54、OP-C31X-55、OP-C31X-58、OP-C31X-60、OP-C31X-63、OP-C31X-65、OP-C31X-72、OP-C31X-73、OP-C31X-74、OP-C31X-75
