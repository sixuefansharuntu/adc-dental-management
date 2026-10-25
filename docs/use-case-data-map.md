# 32个用例、完整分析交互与主要数据表

依据完整166需求、C154及166统一数据模型。表集合按交互涉及实体及存储归属汇总，包含内部保存协作的候选表，不把它解释成每条路径均读写所有列。完整写入责任、授权及字段边界以规约和D设计为准。

| 编号 | 用例 | 直接执行者 | 分析交互图 | 主要归属表 |
| --- | --- | --- | --- | --- |
| UC01 | 查询医生与可预约时段 | 患者、访客。 | C2-01 | booking_service_version、doctor_schedule、employee、employee_revision、employee_revision_skill、employee_skill、schedule_revision |
| UC02 | 管理本人预约 | 已完成本人身份验证的患者。 | C2-02、C2-03、C2-04 | access_grant、appointment、appointment_contact、appointment_revision、clinic、clinic_availability_plan、clinic_booking_rule_version、clinic_revision、grant_clinic、grant_field、grant_role、patient_booking_subject |
| UC03 | 维护患者档案 | 前台；医生、护士按职责和字段权限补充核对健康信息及相关标签。一次操作不要求三者同时参与。 | C2-05 | access_grant、grant_clinic、grant_field、grant_role、patient、patient_allergy、patient_booking_subject、patient_channel、patient_revision、patient_revision_allergy、patient_revision_channel、patient_revision_tag、patient_tag |
| UC04 | 维护医生排班 | 获授权的前台或诊所管理人员。 | C2-06 | access_grant、booking_service_version、doctor_schedule、grant_clinic、grant_field、grant_role、patient_booking_subject、schedule_revision |
| UC05 | 管理就诊预约 | 前台。 | C2-07、C2-08、C2-09、C2-10 | access_grant、appointment、appointment_contact、appointment_revision、grant_clinic、grant_field、grant_role、patient_booking_subject、visit、visit_nurse、visit_revision、visit_revision_nurse |
| UC06 | 登记实际就诊与安排接诊 | 前台。 | C2-11、C2-12 | access_grant、booking_service_version、doctor_schedule、grant_clinic、grant_field、grant_role、patient、patient_allergy、patient_booking_subject、patient_channel、patient_revision、patient_revision_allergy、patient_revision_channel、patient_revision_tag、patient_tag、schedule_revision、visit、visit_nurse、visit_revision、visit_revision_nurse |
| UC07 | 查看诊疗资料 | 医生；护士按权限查看工作所需资料。 | C2-13、C2-14、C2-15 | access_grant、business_operation、clinical_image、clinical_image_revision、clinical_record、clinical_record_revision、clinical_record_writer、grant_clinic、grant_field、grant_role、operation_clinic、patient_booking_subject、record_revision_writer、treatment、treatment_revision、treatment_revision_tooth、treatment_tooth |
| UC08 | 记录诊疗与治疗项目 | 医生。 | C2-16 | access_grant、grant_clinic、grant_field、grant_role、patient_booking_subject、treatment_item、visit、visit_nurse、visit_revision、visit_revision_nurse |
| UC09 | 维护诊疗影像 | 影像人员、护士，按实际分工操作。 | C2-17、C2-18 | access_grant、clinical_image、clinical_image_revision、grant_clinic、grant_field、grant_role、patient_booking_subject |
| UC10 | 管理义齿加工订单 | 医生、护士，按职责分工。 | C2-19、C2-20 | lab_handover、lab_order、lab_requirement_version、lab_review |
| UC11 | 维护治疗项目及收费价格 | 诊所管理人员、获授权的前台。 | C2-21 | access_grant、grant_clinic、grant_field、grant_role、patient_booking_subject、treatment_item |
| UC12 | 核对并生成治疗账单 | 医生、护士；前台必要时协助。 | C2-22、C2-23、C2-24 | access_grant、bill_revision、bill_revision_staff、bill_staff、business_operation、grant_clinic、grant_field、grant_role、item_price_clinic、item_price_version、operation_clinic、patient_booking_subject、treatment、treatment_bill、treatment_revision、treatment_revision_tooth、treatment_tooth |
| UC13 | 登记收款 | 前台。 | C2-25、C2-26 | access_grant、bill_revision、bill_revision_staff、bill_staff、grant_clinic、grant_field、grant_role、patient_booking_subject、product_sale、sale_revision、treatment_bill |
| UC14 | 登记商品销售 | 前台。 | C2-27 | access_grant、grant_clinic、grant_field、grant_role、patient_booking_subject、product_sale、sale_revision、stock_balance |
| UC15 | 管理诊后随访 | 护士；获授权的前台可协助。 | C2-28、C2-29 | access_grant、followup_contact、followup_issue、followup_task、grant_clinic、grant_field、grant_role、patient_booking_subject |
| UC16 | 配置诊后随访方案 | 获授权的诊所管理人员，医生提供临床要求。 | C2-30 | access_grant、followup_plan、followup_plan_clinic、followup_plan_node、followup_plan_version、grant_clinic、grant_field、grant_role、patient_booking_subject |
| UC17 | 登记物资入库 | 库管。 | C2-31 | access_grant、grant_clinic、grant_field、grant_role、patient_booking_subject、stock_balance、stock_receipt |
| UC18 | 登记材料领用出库 | 库管。 | C2-32 | access_grant、grant_clinic、grant_field、grant_role、issue_revision、material_issue、patient_booking_subject、stock_balance |
| UC19 | 执行库存盘点 | 库管。 | C2-33 | access_grant、grant_clinic、grant_field、grant_role、patient_booking_subject、stocktake |
| UC20 | 维护物资目录 | 库管。 | C2-34 | access_grant、grant_clinic、grant_field、grant_role、material、patient_booking_subject |
| UC21 | 维护供应商资料 | 库管、诊所管理人员，按职责操作。 | C2-35 | access_grant、grant_clinic、grant_field、grant_role、patient_booking_subject、supplier、supplier_file |
| UC22 | 查询库存与效期预警 | 库管、诊所管理人员。 | C2-36 | access_grant、business_operation、grant_clinic、grant_field、grant_role、operation_clinic、patient_booking_subject、stock_balance |
| UC23 | 检查业务资料完整性 | 诊所管理人员；获授权的前台可协助。 | C2-37 | access_grant、data_issue、grant_clinic、grant_field、grant_role、issue_action、patient_booking_subject |
| UC24 | 登记运营费用 | 财务人员。 | C2-38 | access_grant、expense_revision、grant_clinic、grant_field、grant_role、operating_expense、patient_booking_subject |
| UC25 | 提交季度核算资料 | 诊所管理人员。 | C2-39 | access_grant、grant_clinic、grant_field、grant_role、patient_booking_subject、quarter_submission、submission_expense、submission_issue、submission_problem、submission_receipt |
| UC26 | 核对并计算牙医季度业绩 | 财务人员。 | C2-40、C2-41 | access_grant、grant_clinic、grant_field、grant_role、patient_booking_subject、quarter_result_version、result_review、result_submission |
| UC27 | 复核并确认季度业绩 | 总部负责人。 | C2-42、C2-43 | access_grant、grant_clinic、grant_field、grant_role、patient_booking_subject、quarter_doctor_scope、quarter_problem、quarter_result_version、quarter_run、quarter_scope、result_review、result_submission |
| UC28 | 查询季度业绩与核算依据 | 总部负责人、财务人员，按权限使用。 | C2-44、C2-45 | access_grant、business_operation、grant_clinic、grant_field、grant_role、operation_clinic、patient_booking_subject、quarter_result_version、result_review、result_submission |
| UC29 | 查询诊所经营情况 | 前台、财务人员、总部负责人，按功能和数据范围分别使用。 | C2-46 | access_grant、analysis_run、analysis_scope、analysis_staff_scope、business_operation、grant_clinic、grant_field、grant_role、operation_clinic、patient_booking_subject |
| UC30 | 管理员工账号与权限 | 系统管理员。 | C2-47、C2-48 | access_grant、grant_clinic、grant_field、grant_role、patient_booking_subject、staff_account |
| UC31 | 维护牙医资料与执业信息 | 总部负责人、获授权的诊所管理人员。 | C2-49、C2-50、C2-51 | access_grant、employee、employee_revision、employee_revision_skill、employee_skill、grant_clinic、grant_field、grant_role、patient_booking_subject、practice_assignment、practice_revision、qualification、qualification_file、qualification_version |
| UC32 | 维护诊所基础资料 | 总部负责人、获授权的诊所管理人员。 | C2-52 | access_grant、clinic、clinic_availability_plan、clinic_booking_rule_version、clinic_revision、grant_clinic、grant_field、grant_role、patient_booking_subject |
