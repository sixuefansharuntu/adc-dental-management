# C到D逐项追溯

属性列存在性与关联路径连通已检查，不宣称全部业务含义自动等价。

|实体|主表|展开表|
|---|---|---|
|患者|patient|patient_tag、patient_channel、patient_revision、patient_revision_tag、patient_revision_channel、patient_allergy、patient_revision_allergy|
|预约|appointment|appointment_contact、appointment_revision|
|诊所|clinic|clinic_availability_plan、clinic_revision|
|员工|employee|employee_skill、employee_revision、employee_revision_skill|
|排班|doctor_schedule|schedule_revision|
|就诊|visit|visit_nurse、visit_revision、visit_revision_nurse|
|病历|clinical_record|clinical_record_writer、clinical_record_revision、record_revision_writer|
|治疗|treatment|treatment_tooth、treatment_revision、treatment_revision_tooth|
|诊疗影像|clinical_image|clinical_image_revision|
|访问授权|access_grant|grant_role、grant_clinic、grant_field|
|业务操作|business_operation|operation_clinic|
|治疗项目|treatment_item||
|项目价格|item_price_version|item_price_clinic|
|治疗账单|treatment_bill|bill_staff、bill_revision、bill_revision_staff|
|账单项|treatment_bill_line|bill_revision_line|
|收款|receipt|receipt_revision|
|商品销售|product_sale|sale_revision|
|物资|material||
|库存|stock_balance||
|材料领用|material_issue|issue_revision|
|运营费用|operating_expense|expense_revision|
|季度核算|quarter_run|quarter_scope、quarter_doctor_scope、quarter_problem|
|季度资料|quarter_submission|submission_receipt、submission_issue、submission_expense、submission_problem|
|核算口径|calculation_policy_version||
|季度业绩|quarter_result_version|result_submission、result_review|
|资料问题|data_issue|issue_action|
|供应商|supplier|supplier_file|
|入库|stock_receipt||
|盘点|stocktake||
|义齿加工|lab_order|lab_requirement_version、lab_handover、lab_review|
|随访方案|followup_plan|followup_plan_version、followup_plan_clinic、followup_plan_node|
|随访|followup_task|followup_contact、followup_issue|
|邀约|recall_attempt|recall_clinic、recall_contact|
|员工账号|staff_account||
|角色|security_role|role_function、role_version|
|执业关系|practice_assignment|practice_revision|
|资格证书|qualification|qualification_version、qualification_file|
|经营分析|analysis_run|analysis_scope、analysis_staff_scope|
|商品销售项|product_sale_line|sale_revision_line|
|商品交付项|product_delivery_line||
|盘点项|stocktake_line||
|季度业绩项|quarter_result_line||
|费用分配项|expense_allocation_line||

## 210项属性

|实体|原属性|方式|实际列|说明|
|---|---|---|---|---|
|患者|姓名|保存/引用|patient.name||
|患者|出生日期|保存/引用|patient.birth_date||
|患者|电话号码|保存/引用|patient.phone||
|患者|联系地址|保存/引用|patient.contact_address||
|患者|账单地址|保存/引用|patient.billing_address||
|患者|电子邮箱（可选）|保存/引用|patient.email||
|患者|来源|保存/引用|patient.source_note；patient.introducer_note||
|患者|过敏了解情况|保存/引用|patient.allergy_knowledge||
|患者|过敏信息|保存/引用|patient_allergy.allergen；patient_allergy.description；patient_revision_allergy.allergen；patient_revision_allergy.description；patient.allergy_note|过敏内容按项保存过敏对象和说明，并与了解情况区分；空值不等于无过敏。未提交或无权的子集合不清空；明确变更须整体核对，已报告具体过敏时至少一项。旧备注原文保留，不自动拆分或据备注推断无过敏。|
|患者|相关标签|保存/引用|patient_tag.tag_text||
|患者|联系偏好|保存/引用|patient.contact_preference||
|患者|沟通渠道关联情况|保存/引用|patient_channel.channel_name；patient_channel.association_note||
|预约|预约日期时间|保存/引用|appointment.scheduled_at||
|预约|联系时间|保存/引用|appointment_contact.contacted_at||
|预约|联系结果|保存/引用|appointment_contact.reached_patient；appointment_contact.result_note||
|预约|后续安排|保存/引用|appointment.confirmation_note；appointment_contact.next_action||
|诊所|名称|保存/引用|clinic.name||
|诊所|地址|保存/引用|clinic.address||
|诊所|联系方式|保存/引用|clinic.contact_info||
|诊所|主管|保存/引用|clinic.manager_id||
|诊所|面积及单位|保存/引用|clinic.area_value；clinic.area_unit||
|诊所|业务启停安排|保存/引用|clinic_availability_plan.business_enabled；clinic_availability_plan.effective_from；clinic_availability_plan.effective_to||
|诊所|创建修改人员及时间|保存/引用|clinic.created_by；clinic.created_at；clinic.updated_by；clinic.updated_at||
|员工|姓名|保存/引用|employee.name||
|员工|联系方式|保存/引用|employee.contact_info||
|员工|个人资料|保存/引用|employee.personal_profile||
|员工|专业技能|保存/引用|employee_skill.skill_name||
|员工|任职安排|保存/引用|employee.employment_arrangement||
|员工|专业资料修改人员及时间|保存/引用|employee.professional_editor_id；employee.professional_edited_at||
|排班|日期|派生|doctor_schedule.starts_at|starts_at按业务时区转成日期，不以UTC日期替代当地业务日。|
|排班|时段起止时间|保存/引用|doctor_schedule.starts_at；doctor_schedule.ends_at||
|排班|可接诊安排|保存/引用|doctor_schedule.can_receive||
|排班|休息外出等变更原因|保存/引用|doctor_schedule.change_reason||
|就诊|实际到院时间|保存/引用|visit.arrived_at||
|就诊|接诊开始时间|保存/引用|visit.started_at||
|就诊|本次接诊结束时间|保存/引用|visit.ended_at||
|就诊|实际离开时间|保存/引用|visit.left_at||
|病历|诊疗时间|保存/引用|clinical_record.clinical_at||
|病历|正文|保存/引用|clinical_record.body||
|病历|待补说明|保存/引用|clinical_record.pending_note||
|治疗|实施时间|保存/引用|treatment.performed_at||
|治疗|适用牙位|保存/引用|treatment_tooth.tooth_code||
|诊疗影像|影像类别|保存/引用|clinical_image.image_type||
|诊疗影像|形成时间|保存/引用|clinical_image.formed_at||
|诊疗影像|说明|保存/引用|clinical_image.description||
|访问授权|配置角色及允许功能|保存/引用|grant_role.role_version_id；role_function.function_code|角色功能沿grant_role→role_version→role_function取本许可采用版本；对象范围不得仅靠任职或文本标签放权。|
|访问授权|诊所及数据范围|保存/引用|grant_clinic.clinic_id；access_grant.object_scope|角色功能沿grant_role→role_version→role_function取本许可采用版本；对象范围不得仅靠任职或文本标签放权。|
|访问授权|字段查看维护及导出范围|保存/引用|grant_field.field_code；grant_field.action_code；grant_field.resource_code|角色功能沿grant_role→role_version→role_function取本许可采用版本；对象范围不得仅靠任职或文本标签放权。|
|访问授权|生效安排与版本|保存/引用|access_grant.effective_from；access_grant.effective_to；access_grant.version_no|角色功能沿grant_role→role_version→role_function取本许可采用版本；对象范围不得仅靠任职或文本标签放权。|
|访问授权|配置人员及时间|保存/引用|access_grant.configured_by；access_grant.configured_at|角色功能沿grant_role→role_version→role_function取本许可采用版本；对象范围不得仅靠任职或文本标签放权。|
|业务操作|业务类别及动作|保存/引用|business_operation.action_code||
|业务操作|实际操作人员及时间|保存/引用|business_operation.actor_id；business_operation.occurred_at||
|业务操作|变更前后内容|保存/引用|business_operation.before_content；business_operation.after_content||
|业务操作|原因及版本|保存/引用|business_operation.reason；business_operation.before_content；business_operation.after_content||
|业务操作|实际查询供阅及导出范围|保存/引用|business_operation.access_scope；operation_clinic.clinic_id||
|治疗项目|名称|保存/引用|treatment_item.name||
|治疗项目|计费单位|保存/引用|treatment_item.charge_unit||
|治疗项目|启停安排|保存/引用|treatment_item.activation_arrangement||
|项目价格|金额|保存/引用|item_price_version.amount||
|项目价格|有效起始时间|保存/引用|item_price_version.effective_from||
|项目价格|有效终止时间|保存/引用|item_price_version.effective_to||
|项目价格|版本|保存/引用|item_price_version.version_no||
|治疗账单|开单时间|保存/引用|treatment_bill.opened_at||
|治疗账单|/合计|派生|treatment_bill_line.quantity；treatment_bill_line.adopted_unit_price|按原行数量×采用单价及统一舍入口径计算；合计为各行小计之和，不用当前价重算。|
|账单项|计费数量|保存/引用|treatment_bill_line.quantity||
|账单项|实际采用单价|保存/引用|treatment_bill_line.adopted_unit_price||
|账单项|/小计|派生|treatment_bill_line.quantity；treatment_bill_line.adopted_unit_price|按原行数量×采用单价及统一舍入口径计算；合计为各行小计之和，不用当前价重算。|
|收款|实收金额|保存/引用|receipt.amount||
|收款|付款方式|保存/引用|receipt.payment_method||
|收款|收款时间|保存/引用|receipt.received_at||
|商品销售|/合计|派生|product_sale_line.quantity；product_sale_line.adopted_unit_price|按原行数量×采用单价及统一舍入口径计算；合计为各行小计之和，不用当前价重算。|
|商品销售|开单时间|保存/引用|product_sale.opened_at||
|商品销售|付款进展|派生|receipt.sale_id；receipt.amount；receipt.received_at|由同源有效全额实收推导，未付与交付独立，不新存可冲突的已付标志。|
|物资|名称|保存/引用|material.name||
|物资|分类|保存/引用|material.classification||
|物资|计量单位|保存/引用|material.unit||
|物资|规格|保存/引用|material.specification||
|物资|启停安排|保存/引用|material.activation_arrangement||
|物资|目录修改人员及时间|保存/引用|material.updated_by；material.updated_at||
|库存|结存数量|保存/引用|stock_balance.quantity||
|库存|单位|保存/引用|stock_balance.unit||
|库存|适用批次及有效期|保存/引用|stock_balance.batch_reference；stock_balance.expires_on||
|材料领用|数量|保存/引用|material_issue.quantity||
|材料领用|单位|保存/引用|material_issue.unit||
|材料领用|领用时间|保存/引用|material_issue.issued_at||
|材料领用|成本单价|保存/引用|material_issue.cost_unit_price||
|材料领用|待核实事项|保存/引用|material_issue.pending_note||
|运营费用|类别|保存/引用|operating_expense.category||
|运营费用|金额|保存/引用|operating_expense.amount||
|运营费用|发生日期|保存/引用|operating_expense.occurred_on||
|运营费用|待补说明|保存/引用|operating_expense.pending_note||
|季度核算|季度|保存/引用|quarter_run.quarter_label||
|季度核算|纳入范围|保存/引用|quarter_scope.clinic_id；quarter_doctor_scope.doctor_id||
|季度核算|问题清单|保存/引用|quarter_problem.issue_id||
|季度核算|首次全范围完成时刻|保存/引用|quarter_run.first_full_confirmed_at||
|季度资料|提交版本|保存/引用|quarter_submission.version_no||
|季度资料|来源版本引用|保存/引用|submission_receipt.receipt_revision_id；submission_issue.issue_revision_id；submission_expense.expense_revision_id||
|季度资料|未解决事项|保存/引用|quarter_submission.unresolved_note；submission_problem.adopted_conclusion||
|季度资料|提交人|保存/引用|quarter_submission.submitted_by||
|季度资料|提交时间|保存/引用|quarter_submission.submitted_at||
|核算口径|版本|保存/引用|calculation_policy_version.version_no||
|核算口径|业务时区|保存/引用|calculation_policy_version.business_timezone||
|核算口径|收入归集口径|保存/引用|calculation_policy_version.income_rule||
|核算口径|成本归集口径|保存/引用|calculation_policy_version.cost_rule||
|核算口径|费用分配规则|保存/引用|calculation_policy_version.expense_rule||
|季度业绩|结果版本|保存/引用|quarter_result_version.version_no||
|季度业绩|牙医诊所范围|保存/引用|quarter_result_line.doctor_id；quarter_result_line.clinic_id||
|季度业绩|复核意见|保存/引用|result_review.conclusion||
|季度业绩|确认人|保存/引用|quarter_result_version.confirmed_by||
|季度业绩|确认时间|保存/引用|quarter_result_version.confirmed_at||
|季度业绩|/牙医实收合计|派生|quarter_result_line.received_income|按固定原结果、所选牙医/诊所或原分配项汇总，不静默改旧结果。|
|季度业绩|/牙医材料成本合计|派生|quarter_result_line.material_cost|按固定原结果、所选牙医/诊所或原分配项汇总，不静默改旧结果。|
|季度业绩|/牙医费用合计|派生|expense_allocation_line.adopted_amount|按固定原结果、所选牙医/诊所或原分配项汇总，不静默改旧结果。|
|季度业绩|/牙医经营贡献合计|派生|quarter_result_line.received_income；quarter_result_line.material_cost；expense_allocation_line.adopted_amount|按采用口径以已核实实收减材料及分配费用派生；未知不当0。|
|资料问题|问题类别|保存/引用|data_issue.category||
|资料问题|关键程度|保存/引用|data_issue.severity||
|资料问题|负责岗位|保存/引用|data_issue.responsible_role||
|资料问题|处理事项|保存/引用|data_issue.handling_note；issue_action.action_conclusion||
|资料问题|通知情况|保存/引用|data_issue.notification_note||
|资料问题|复查结论|保存/引用|data_issue.recheck_conclusion||
|资料问题|合理空项解释|保存/引用|data_issue.reasonable_blank||
|供应商|名称|保存/引用|supplier.name||
|供应商|联系信息|保存/引用|supplier.contact_info||
|供应商|合作资料|保存/引用|supplier.cooperation_info||
|供应商|资质及合同附件|保存/引用|supplier_file.file_id；supplier_file.file_purpose||
|供应商|合作启停安排|保存/引用|supplier.activation_arrangement||
|供应商|待补事项|保存/引用|supplier.pending_note||
|供应商|修改人员及时间|保存/引用|supplier.updated_by；supplier.updated_at||
|入库|实际接收数量|保存/引用|stock_receipt.quantity||
|入库|单位|保存/引用|stock_receipt.unit||
|入库|接收时间|保存/引用|stock_receipt.received_at||
|入库|适用批次及效期|保存/引用|stock_receipt.batch_expiry_note||
|入库|价格资料|保存/引用|stock_receipt.unit_price||
|入库|待核实事项|保存/引用|stock_receipt.pending_note||
|盘点|范围|保存/引用|stocktake.scope_note；stocktake_line.stock_id||
|盘点|基准时点|保存/引用|stocktake.baseline_at||
|义齿加工|加工方|保存/引用|lab_order.lab_party||
|义齿加工|加工要求|保存/引用|lab_requirement_version.requirement_text||
|义齿加工|送出时间|保存/引用|lab_handover.occurred_at；lab_handover.direction|分别筛选direction=SEND/RECEIVE的真实交接；要求与接收必须相容。|
|义齿加工|接收时间|保存/引用|lab_handover.occurred_at；lab_handover.direction|分别筛选direction=SEND/RECEIVE的真实交接；要求与接收必须相容。|
|义齿加工|交接内容及人员|保存/引用|lab_handover.handover_content；lab_handover.employee_id||
|义齿加工|预计返回安排|保存/引用|lab_requirement_version.expected_return_at||
|义齿加工|实际进度及待处理问题|保存/引用|lab_order.progress_pending_note||
|义齿加工|医生核对结果|保存/引用|lab_review.conclusion；lab_review.doctor_id；lab_review.reviewed_at||
|义齿加工|修订人员及时间|保存/引用|lab_order.updated_by；lab_order.updated_at||
|随访方案|随访时间安排|保存/引用|followup_plan_node.time_arrangement||
|随访方案|联系内容及临床目的|保存/引用|followup_plan_node.contact_content；followup_plan_node.clinical_purpose||
|随访方案|启用与生效安排|保存/引用|followup_plan.enabled；followup_plan_version.effective_from；followup_plan_version.effective_to||
|随访方案|版本|保存/引用|followup_plan_version.version_no||
|随访方案|配置人员及时间|保存/引用|followup_plan_version.configured_by；followup_plan_version.configured_at||
|随访|引用方案版本或医生具体要求|保存/引用|followup_task.plan_version_id；followup_task.node_id；followup_task.doctor_instruction；followup_task.instruction_doctor_id||
|随访|计划时间及联系内容|保存/引用|followup_task.planned_at；followup_task.planned_content||
|随访|负责人员|保存/引用|followup_task.responsible_id||
|随访|实际联系时间及渠道|保存/引用|followup_contact.contacted_at；followup_contact.channel||
|随访|联系结果与患者反馈|保存/引用|followup_contact.reached_patient；followup_contact.result_feedback||
|随访|后续安排|保存/引用|followup_task.next_action；followup_contact.next_action||
|随访|需医生处理的问题及跟进进展|保存/引用|followup_issue.problem；followup_issue.progress_conclusion；followup_issue.resolved_at||
|随访|修订人员及时间|保存/引用|followup_task.updated_by；followup_task.updated_at||
|邀约|筛选诊所范围及时间条件|保存/引用|recall_clinic.clinic_id；recall_attempt.screening_condition||
|邀约|筛选时点及最近实际就诊时间|保存/引用|recall_attempt.screened_at；recall_attempt.last_actual_visit_at||
|邀约|实际联系人员时间及渠道|保存/引用|recall_attempt.first_employee_id；recall_attempt.first_contacted_at；recall_attempt.first_channel；recall_contact.employee_id；recall_contact.contacted_at；recall_contact.channel||
|邀约|联系结果与患者意向|保存/引用|recall_attempt.first_result；recall_attempt.patient_intention；recall_contact.result_intention||
|邀约|后续安排|保存/引用|recall_attempt.next_action；recall_contact.next_action||
|邀约|修订人员及时间|保存/引用|recall_attempt.updated_by；recall_attempt.updated_at||
|员工账号|登录名|保存/引用|staff_account.login_name||
|员工账号|所属范围|保存/引用|staff_account.account_scope||
|员工账号|启停安排|保存/引用|staff_account.activation_arrangement||
|员工账号|开通及停用时间|保存/引用|staff_account.opened_at；staff_account.disabled_at||
|员工账号|维护人员及时间|保存/引用|staff_account.maintained_by；staff_account.maintained_at||
|角色|名称|保存/引用|security_role.name；role_version.name||
|角色|职责及允许功能|保存/引用|security_role.responsibility；role_version.responsibility；role_function.function_code||
|执业关系|有效起止日期|保存/引用|practice_assignment.valid_from；practice_assignment.valid_to||
|执业关系|执业启停安排|保存/引用|practice_assignment.practice_arrangement||
|执业关系|关系版本|保存/引用|practice_revision.version_no||
|执业关系|影响安排引用|保存/引用|practice_assignment.affected_arrangements||
|执业关系|修改人员及时间|保存/引用|practice_assignment.updated_by；practice_assignment.updated_at||
|资格证书|名称及证书编号|保存/引用|qualification_version.certificate_name；qualification_version.certificate_number||
|资格证书|来源及有效信息|保存/引用|qualification_version.source_validity||
|资格证书|附件及待补说明|保存/引用|qualification_file.file_id；qualification_version.pending_note||
|资格证书|人工核对结论|保存/引用|qualification_version.review_conclusion||
|资格证书|证书版本及修改记录|保存/引用|qualification_version.version_no；qualification_version.updated_by；qualification_version.updated_at||
|经营分析|分析类别与统计对象|保存/引用|analysis_run.analysis_type||
|经营分析|期间及业务时区|保存/引用|analysis_run.period_from；analysis_run.period_to；analysis_run.business_timezone||
|经营分析|诊所人员及维度范围|保存/引用|analysis_scope.clinic_id；analysis_staff_scope.employee_id；analysis_staff_scope.dimension_definition||
|经营分析|数据时点及来源版本引用|保存/引用|analysis_run.data_as_of；analysis_run.source_version_manifest||
|经营分析|统计口径及完整程度|保存/引用|analysis_run.statistical_rule；analysis_run.completeness_note||
|经营分析|/分项数量金额与构成|派生|analysis_run.result_snapshot|按固定原结果、所选牙医/诊所或原分配项汇总，不静默改旧结果。|
|经营分析|未知与待核实项|保存/引用|analysis_run.completeness_note；analysis_run.result_snapshot||
|经营分析|查询人员及时间|保存/引用|analysis_run.employee_id；analysis_run.queried_at||
|商品销售项|数量|保存/引用|product_sale_line.quantity||
|商品销售项|采用单价|保存/引用|product_sale_line.adopted_unit_price||
|商品销售项|/小计|派生|product_sale_line.quantity；product_sale_line.adopted_unit_price|按原行数量×采用单价及统一舍入口径计算；合计为各行小计之和，不用当前价重算。|
|商品交付项|实际交付数量|保存/引用|product_delivery_line.delivered_quantity||
|商品交付项|交付时间|保存/引用|product_delivery_line.delivered_at||
|盘点项|单位|保存/引用|stocktake_line.unit||
|盘点项|账面数量快照|保存/引用|stocktake_line.baseline_quantity||
|盘点项|清点时点|保存/引用|stocktake_line.counted_at||
|盘点项|实盘数量|保存/引用|stocktake_line.counted_quantity||
|盘点项|/对齐差异|派生|stocktake_line.counted_quantity；stocktake_line.baseline_quantity；stocktake_line.period_net_movement|实盘－（原基准＋对齐期间净变动），不是实盘直接覆盖当前结存。|
|盘点项|核实原因及待处理事项|保存/引用|stocktake_line.reason_pending_note||
|盘点项|实际调整数量|保存/引用|stocktake_line.actual_adjustment||
|季度业绩项|实收收入|保存/引用|quarter_result_line.received_income||
|季度业绩项|材料成本|保存/引用|quarter_result_line.material_cost||
|季度业绩项|/分配运营费用|派生|expense_allocation_line.adopted_amount|按固定原结果、所选牙医/诊所或原分配项汇总，不静默改旧结果。|
|季度业绩项|/经营贡献|派生|quarter_result_line.received_income；quarter_result_line.material_cost；expense_allocation_line.adopted_amount|按采用口径以已核实实收减材料及分配费用派生；未知不当0。|
|费用分配项|采用原费用版本|保存/引用|expense_allocation_line.expense_revision_id||
|费用分配项|核对分配金额|保存/引用|expense_allocation_line.adopted_amount||
|费用分配项|分配依据|保存/引用|expense_allocation_line.basis||
|运营费用|凭据编号|保存/引用|operating_expense.voucher_reference；expense_revision.voucher_reference|当前与采用的不可变原版分别保存。|
|运营费用|凭据来源说明|保存/引用|operating_expense.voucher_note；expense_revision.voucher_note|当前与采用的不可变原版分别保存。|

## 99项关联

|编号|两端与原基数|FK路径|约束|
|---|---|---|---|
|patient-visit|患者 1 - 就诊 0..*|visit.patient_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|visit-note|就诊 1 - 病历 0..1|clinical_record.visit_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|clinic-visit|诊所 1 - 就诊 0..*|visit.clinic_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|visit-treatment|就诊 1 - 治疗 0..*|treatment.visit_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|visit-bill|就诊 1 - 治疗账单 0..1|treatment_bill.visit_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|catalogue-treatment|治疗项目 1 - 治疗 0..*|treatment.item_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|catalogue-price|治疗项目 1 - 项目价格 0..*|item_price_version.item_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|price-clinic|项目价格 0..* - 诊所 1..*|item_price_clinic.price_version_id；item_price_clinic.clinic_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|bill-item|治疗账单 1 - 账单项 1..*|treatment_bill_line.bill_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|treatment-item|治疗 1 - 账单项 0..1|treatment_bill_line.treatment_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|registrar|员工 1 - 就诊 0..*|visit.registrar_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|doctor|员工 1 - 就诊 0..*|visit.doctor_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|nurse|员工 1..* - 就诊 0..*|visit_nurse.visit_id；visit_nurse.nurse_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|writer|员工 1..* - 病历 0..*|clinical_record_writer.record_id；clinical_record_writer.doctor_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|confirm-doctor|员工 1 - 治疗 0..*|treatment.confirming_doctor_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|bill-creator|员工 1 - 治疗账单 0..*|treatment_bill.creator_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|bill-staff|员工 1..* - 治疗账单 0..*|bill_staff.bill_id；bill_staff.employee_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|collector|员工 1 - 收款 0..*|receipt.collector_id|沿38号；人员角色沿37号原语义，非全部维护人员上限。|
|N01|患者 1 - 预约 0..*|appointment.patient_id|建立或改约前有效患者；不因同名或电话相同合并。|
|N02|诊所 1 - 预约 0..*|appointment.clinic_id||
|N03|员工 1 - 预约 0..*|appointment.doctor_id|限定医生职责；护士不是本模型中的预约排班对象。|
|N04|预约 0..1 - 就诊 0..1|visit.appointment_id|无预约到院可不关联；同次预约至多一条有效到院，改约不增造到院。|
|N05|员工 1 - 排班 0..*|doctor_schedule.doctor_id|每条时段属于一位医生；不等于医生此刻必须空闲。|
|N06|诊所 1 - 排班 0..*|doctor_schedule.clinic_id|跨店接诊时段不得冲突；保存真实休息不自动改约。|
|N07|员工 1 - 执业关系 0..*|practice_assignment.employee_id|同一员工跨店身份不拆分，保留期间与关系历史。|
|N08|诊所 1 - 执业关系 0..*|practice_assignment.clinic_id|执业关系不替代排班、不授予数据访问权。|
|N09|就诊 1 - 诊疗影像 0..*|clinical_image.visit_id|当前有效归档属于一条就诊；更正保留原关联历史。|
|N10|患者 1 - 诊疗影像 0..*|clinical_image.visit_id；visit.patient_id|由归档就诊的患者推导；不是另存一个可独立冲突的患者。|
|N11|员工 1 - 诊疗影像 0..*|clinical_image.archived_by|影像人员或按分工的护士；后续修订操作另留历史。|
|N12|治疗 1 - 义齿加工 0..*|lab_order.treatment_id|已存在的实际治疗可为加工准备；不伪造先装戴。|
|N13|患者 1 - 义齿加工 0..*|lab_order.treatment_id；treatment.visit_id；visit.patient_id|由对应治疗的就诊患者推导。|
|N14|员工 1 - 义齿加工 0..*|lab_order.request_doctor_id|当前要求的负责医生；原要求及修订保留。|
|N15|员工 0..* - 义齿加工 0..*|lab_handover.lab_order_id；lab_handover.employee_id|未交接时可为空；累计真实送出、接收人员，不表示已装戴。|
|bill-receipt|治疗账单 0..1 - 收款 0..1|receipt.bill_id|全部有效收款恰选治疗账单或商品销售之一；每原单最多一笔有效全额收款。不再并列治疗子集的1端版本。|
|N17|商品销售 0..1 - 收款 0..1|receipt.sale_id|与N16异或；两条关联合计每笔收款恰好一个原单据。|
|N18|患者 1 - 商品销售 0..*|product_sale.patient_id|不因购商品而创建治疗或就诊。|
|N19|诊所 1 - 商品销售 0..*|product_sale.clinic_id||
|N20|员工 1 - 商品销售 0..*|product_sale.creator_id|后续维护及交付人员通过实际操作历史追踪。|
|N23|治疗 1 - 随访 0..*|followup_task.treatment_id|一个明确治疗节点形成安排；同一治疗可有多个节点。|
|N24|随访方案 0..1 - 随访 0..*|followup_task.plan_version_id；followup_plan_version.plan_id|方案可空仅因有医生具体要求；有方案必须固定具体版本和节点。|
|N25|患者 1 - 随访 0..*|followup_task.treatment_id；treatment.visit_id；visit.patient_id|由治疗就诊患者推导，不允许联系另一个患者。|
|N26|员工 1 - 随访 0..*|followup_task.responsible_id|一项安排有明确当前责任人；实际联系历史可由不同获授权人员完成。|
|N27|员工 0..* - 随访 0..*|followup_contact.followup_id；followup_contact.employee_id|未联系时为空；未接通也保留真实尝试，不记完成。|
|N28|治疗项目 1 - 随访方案 0..*|followup_plan_version.plan_id；followup_plan_version.item_id|一个方案针对选定项目，可有多个时间节点；不同项目不无依据套同一要求。|
|N29|诊所 1..* - 随访方案 0..*|followup_plan_clinic.plan_version_id；followup_plan_version.plan_id；followup_plan_clinic.clinic_id|配置须明确非空诊所范围，不默认全连锁。|
|N30|员工 1 - 随访方案 0..*|followup_plan_version.plan_id；followup_plan_version.configured_by|限定获授权诊所管理人员；医生提供临床要求不等于亲自配置。|
|N31|患者 1 - 邀约 0..*|recall_attempt.patient_id|邀约在首次实际联系时形成，不因筛选候选自动创建。|
|N32|诊所 1..* - 邀约 0..*|recall_clinic.recall_id；recall_clinic.clinic_id|固定原筛选范围和时点；不推成预约或到院。|
|N33|员工 1..* - 邀约 0..*|recall_attempt.first_employee_id；recall_contact.recall_id；recall_contact.employee_id|已形成邀约有真实联系尝试，后续可由多位获授权人员跟进。|
|N34|物资 1 - 库存 0..*|stock_balance.material_id|库存按诊所、物资及适用批次效期范围定位，不加新库存批次类。|
|N35|诊所 1 - 库存 0..*|stock_balance.clinic_id||
|N36|库存 1 - 入库 0..*|stock_receipt.stock_id|一项入库对应原提交中明确的物资批次范围；多项接收逐项形成，不把凭据整体当单项。|
|N37|库存 1 - 材料领用 0..*|material_issue.stock_id|一项实际领用扣减原明确范围；不当逐治疗精确消耗。|
|N38|供应商 1 - 入库 0..*|stock_receipt.supplier_id|沿实际供应商；不把义齿加工方自动并为物资供应商。|
|N39|员工 1 - 入库 0..*|stock_receipt.registrar_id||
|N40|员工 1 - 材料领用 0..*|material_issue.recipient_id|当前领用事项明确领用人员；成本归属可待核实，不能以领用人直接推全部牙医成本。|
|N41|员工 1 - 材料领用 0..*|material_issue.registrar_id||
|N43|诊所 1 - 盘点 0..*|stocktake.clinic_id|本轮一项盘点在单一诊所内，可含多物资批次；不假定一个时点清点完全部物资。|
|N44|员工 1 - 盘点 0..*|stocktake.initiator_id|后续实盘处理人员按真实操作留痕；不等于只有该员工可以办理。|
|N45|诊所 1 - 运营费用 0..*|operating_expense.clinic_id|原费用不因分摊重复生成；登记不等于支付。|
|N46|员工 1 - 运营费用 0..*|operating_expense.creator_id||
|N47|季度核算 0..* - 诊所 1..*|quarter_scope.quarter_id；quarter_scope.clinic_id|原明确范围非空，不能缩范围绕过未解决问题。|
|N48|季度核算 1 - 季度资料 0..*|quarter_submission.quarter_id|未提交时可无版本；同所可重提多版，旧版不覆盖。|
|N49|季度核算 1 - 季度业绩 0..*|quarter_result_version.quarter_id|一个结果版本属于一个季度核算上下文；另版不改已确认原快照。|
|N50|诊所 1 - 季度资料 0..*|quarter_submission.clinic_id|一份提交版本针对一个诊所，其范围必须属于原核算范围。|
|N51|员工 1 - 季度资料 0..*|quarter_submission.submitted_by|限定该诊所当前有提交权限的负责人，不是任意前台。|
|N52|季度资料 0..* - 收款 0..*|submission_receipt.submission_id；submission_receipt.receipt_revision_id；receipt_revision.receipt_id|引用实际来源及采用版本；同一交易可在多次提交版本中出现，但同一结果只去重计一次。|
|N53|季度资料 0..* - 材料领用 0..*|submission_issue.submission_id；submission_issue.issue_revision_id；issue_revision.issue_id|未核实价格或归属不作零；旧提交不被当前补正替换。|
|N54|季度资料 0..* - 运营费用 0..*|submission_expense.submission_id；submission_expense.expense_revision_id；expense_revision.expense_id|无费用时允许空；原金额及分配依据仍须核对。|
|N55|季度业绩 0..* - 季度资料 1..*|result_submission.result_id；result_submission.submission_id|结果须覆盖原范围，每所明确采用一版；不可把两版同所收入相加。|
|N56|核算口径 1 - 季度业绩 0..*|quarter_result_version.policy_version_id|同版结果固定一套口径版本，不使用后来配置替换原依据。|
|N57|员工 1..* - 季度业绩 0..*|quarter_result_line.result_id；quarter_result_line.doctor_id|结果版本包含明确非空牙医范围及分项，不把跨店同一牙医拆身份；不是只能一个全公司合计。；由本版逐牙医诊所业绩项推导，不另存一组矛盾金额。|
|N58|诊所 1..* - 季度业绩 0..*|quarter_result_line.result_id；quarter_result_line.clinic_id|与原核算范围一致，分项仍保留各诊所依据。；由本版逐牙医诊所业绩项推导，不另存一组矛盾金额。|
|N59|员工 0..1 - 季度业绩 0..*|quarter_result_version.confirmed_by|未确认时为空；完整全范围核对和明确同意后才留确认人员时间，退回不造确认。|
|N60|诊所 1 - 资料问题 0..*|data_issue.clinic_id|问题可定位诊所、期间、类别和原来源；原记录整体缺失时不补造源对象。|
|N61|季度资料 0..* - 资料问题 0..*|submission_problem.submission_id；submission_problem.issue_id|日常问题可未进入提交；同一问题可被不同提交版本保留，通知不是解决。|
|N62|员工 1 - 经营分析 0..*|analysis_run.employee_id|角色与汇总、明细及导出权限分别判断。|
|N63|诊所 1..* - 经营分析 0..*|analysis_scope.analysis_id；analysis_scope.clinic_id|固定本次明确范围，不把查询人员当前任职代替原范围。|
|N64|经营分析 0..1 - 业务操作 1..*|business_operation.analysis_id|每份已完整保存分析至少有实际查询留痕，可再追加明细导出；其他非经营分析操作的分析端可空。|
|N65|员工 1 - 员工账号 0..1|staff_account.employee_id|本轮同一员工沿既有账号维护，停用保留原身份，不将账号转给他人。|
|N66|员工账号 1 - 访问授权 0..*|access_grant.account_id|账号开通可尚无许可；配置留版本，不能以有账号当有业务权限。|
|N67|角色 0..* - 访问授权 0..*|grant_role.grant_id；grant_role.role_version_id；role_version.role_id|收回全部业务权限可形成空许可版本；角色名称不代替功能、诊所和字段规则。|
|N68|诊所 0..* - 访问授权 0..*|grant_clinic.grant_id；grant_clinic.clinic_id|零诊所权限不等于全连锁；全局管理员功能与临床数据范围仍分开。|
|N69|员工 1 - 业务操作 0..*|business_operation.actor_id|沿真实身份；离职和停用不删除旧操作。|
|N70|诊所 0..* - 业务操作 0..*|operation_clinic.operation_id；operation_clinic.clinic_id|账号维护等操作可无具体诊所；缺采集明确未记录，不补猜旧值。|
|N71|员工 1 - 资格证书 0..*|qualification.employee_id|证书逐项版本，缺附件不冒充已核实认证；同一牙医沿员工身份。|
|N72|员工 0..1 - 诊所 0..*|clinic.manager_id|主管为已有员工引用；未明确可空，不因主管头衔自动授业务权限。|
|S89-01|商品销售 1 - 商品销售项 1..*|product_sale_line.sale_id|一份销售至少一行，一行专属一份销售，历史版本不作重复销售。|
|S89-02|物资 1 - 商品销售项 0..*|product_sale_line.material_id|一行明确一种可售物资，数量和采用单价在本行。|
|S89-03|商品销售项 1 - 商品交付项 0..*|product_delivery_line.sale_line_id|未交付时为空；本轮整次完整交付的分配合计等于原行数量，不新增分批业务。|
|S89-04|库存 1 - 商品交付项 0..*|product_delivery_line.stock_id|每项明确一个原库存范围与实际数量；多个批次分配不是多次扣同一数量。|
|I89-01|盘点 1 - 盘点项 1..*|stocktake_line.stocktake_id|每项保留一个库存对象的账面基准、单位、实盘及时点。|
|I89-02|库存 1 - 盘点项 0..*|stocktake_line.stock_id|同次盘点同库存范围至多一项；期间变动核对后只调净差异。|
|Q89-01|季度业绩 1 - 季度业绩项 1..*|quarter_result_line.result_id|季度业绩为整批结果版本；同版同牙医同诊所恰有一个已核实分项。|
|Q89-02|员工 1 - 季度业绩项 0..*|quarter_result_line.doctor_id|每项一位真实牙医，跨店沿同一员工，按各所分项再合计。|
|Q89-03|诊所 1 - 季度业绩项 0..*|quarter_result_line.clinic_id|每项一所诊所；未明确牙医商品收入保留诊所原版来源，不塞入牙医项。|
|Q89-04|季度业绩项 1 - 费用分配项 0..*|expense_allocation_line.result_line_id|每份分配属于一个原结果分项，保存核对金额，不猜比例。|
|Q89-05|运营费用 1 - 费用分配项 0..*|expense_allocation_line.expense_revision_id；expense_revision.expense_id|同一结果内按来源版本核对待分配额；旧结果引用不被费用更正替换。|
|N116-01|诊所 0..1 - 患者 0..*|patient.created_clinic_id|建档诊所记录首次实际建档来源；新建时必填且须在本人许可内，不由首次就诊推导。普通修订保留原值；确属原登记错误时，按UC01当前字段权限核实原因并保留原版。历史不明可留空，不猜补；诊所后续停用不抹去原事实。|
