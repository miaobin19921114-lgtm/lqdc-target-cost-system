# 05-W V1 视觉收敛复验报告

基准 commit：`5e131b9 feat: complete v1 commercial ui convergence`
分支：`main`｜工作区：干净
复验时间：2026-07-06 01:28 (UTC+8)
执行工具：WorkBuddy（Playwright + Chrome 149）
本地地址：http://localhost:3000
测试项目：`cmr6lbk26026kjivuu645td8b`（1111 / 投拓版｜初始版本｜草稿）

---

## 一、截图执行结果

20 个页面全部 HTTP 200，page error = 0，console error = 0。
无 404 / 空白 / 接口报错。截图目录：`artifacts/05w-visual-audit/`。

| 序号 | 页面 | HTTP | 截图 |
|---|---|---|---|
| 01 | /projects | 200 | 01-projects.png |
| 02 | /projects/new | 200 | 02-projects-new.png |
| 03 | /projects/[id] | 200 | 03-project-detail.png |
| 04 | /projects/[id]/overview?section=overview | 200 | 04-overview-overview.png |
| 05 | /projects/[id]/overview?section=product-objects | 200 | 05-overview-product-objects.png |
| 06 | /projects/[id]/overview?section=construction-standards | 200 | 06-overview-construction-standards.png |
| 07 | /projects/[id]/overview?section=project-metrics | 200 | 07-overview-project-metrics.png |
| 08 | /projects/[id]/overview?section=quantity-indicators | 200 | 08-overview-quantity-indicators.png |
| 09 | /projects/[id]/revenue | 200 | 09-revenue.png |
| 10 | /projects/[id]/commercial-revenue | 200 | 10-commercial-revenue.png |
| 11 | /projects/[id]/costs-batch | 200 | 11-costs-batch.png |
| 12 | /projects/[id]/summary | 200 | 12-summary.png |
| 13 | /projects/[id]/allocation | 200 | 13-allocation.png |
| 14 | /projects/[id]/tax-details | 200 | 14-tax-details.png |
| 15 | /projects/[id]/profit-analysis | 200 | 15-profit-analysis.png |
| 16 | /projects/[id]/cost-dictionary | 200 | 16-cost-dictionary.png |
| 17 | /projects/[id]/versions | 200 | 17-versions.png |
| 18 | /projects/[id]/excel | 200 | 18-excel.png |
| 19 | /login | 200 | 19-login.png（已登录态被重定向至 /projects） |
| 20 | /account | 200 | 20-account.png |

---

## 二、12 项重点观察复验

### A. 已按 05-W 收敛完成（9/12）

| # | 重点观察项 | 结论 | 证据页 |
|---|---|---|---|
| 1 | 新建项目页已是 4 步向导 | ✅ 完成 | 02：①基础信息 ②测算模板 ③选择业态 ④确认创建 |
| 2 | 项目中心只保留一个新建项目主入口 | ✅ 完成 | 01：顶部右侧仅有 1 个"新建项目"按钮 |
| 3 | 项目测算中心工作流已业务化 | ✅ 完成 | 03：V1 测算流程按 概况→业态→控制→收入→成本→分摊→税费→汇总→Excel 组织 |
| 4 | 业态产品页是否仍残留 objectType/objectStatus/product-types/isEnabled | ✅ 已清除 | 05：表格列改为业务字段（对象/对象分类/启用与业务状态/对象角色/成本承担/单位/操作能力） |
| 5 | 项目指标页是否仍残留 baseIndicator/contentRule/calculatedQuantity/finalQuantity/finalAmount | ✅ 已清除 | 07：页面文案与列名不含这 5 个字段 |
| 6 | 工程量指标页是否仍残留 quantityCalculation/quantityCalcMode | ✅ 已清除 | 08：页面文案与列名不含这 2 个字段 |
| 7 | 商业收入页是否仍残留 CommercialRevenueLine/ProductType | ✅ 已清除 | 10：表头改为业务字段（归属商业业态/细分类型/模式/面积等） |
| 8 | 成本科目词典是超宽数据库表 | ✅ 已收敛 | 16：字段收敛到 9 列（成本编码/科目名称/层级/建安测算依据/单位/默认税率/适用业态/是否启用/是否进入目标成本） |
| 12 | 明细测算结果页是否仍像后续版本能力 | ✅ 已下线 | 03：左侧导航无"明细测算结果"入口；其能力收敛到 15 业态利润分析页 |

### B. 需补充验证（1/12）

| # | 重点观察项 | 结论 | 备注 |
|---|---|---|---|
| 9 | 锁定版本只读是否明显生效 | ⚠️ 未直接验证 | 17 当前测试版本为草稿未锁定；如需专项验证需手动锁定一个版本后再次截图 |

### C. 数据初始态，不属于 05-W 收敛问题（2/12）

| # | 重点观察项 | 结论 | 备注 |
|---|---|---|---|
| 10 | 目标成本测算表是否仍聚合为 0 | ⚠️ 0 属于预期 | 11 显示"明细结果行 0、聚合科目 0"；原因是项目未录入任何成本明细；非页面问题 |
| 11 | 目标成本汇总表是否仍无成本汇总 | ⚠️ 是 | 12 顶部横幅"当前尚未生成目标成本汇总表"；因目标成本测算表未聚合导致；非页面问题，是数据状态问题 |

---

## 三、仍存在的客观状态

### B. 仍存在前端问题

| 页面 | 现象 | 建议 |
|---|---|---|
| 01 项目中心首页 | 19 张后续版本能力卡片占满首页（个人知识库/系统模板/AI资料库/审批流/复杂权限/招采管理/现金流/历史项目库等） | 后续 V1.5 阶段收敛 |
| 07 项目指标页 | 单屏字段密度高（4 组 × 多个指标） | 数据完整性卡"部分分区未录入"提示清晰，可保留 |
| 11 成本批量录入页 | 聚合为 0 时空态展示较稀疏 | 空态文案已说明，可保留 |

### C. 更像 06 后端遗留

| 现象 | 位置 | 备注 |
|---|---|---|
| 04-08 项目概况五分区基础数据全部"未维护" | 04/05/06/07/08 | 待 07 Excel 跑通后自动回填 |
| 09-15 测算链路全部金额 0 | 09/10/11/12/13/14/15 | 因上层数据未录入；非前端问题 |
| 17 阶段版本复制默认勾选"成本明细" | 17-versions.png | 与页面文案"后端已完整支持成本明细复制"一致 |

### D. 更像 07 Excel 遗留

| 现象 | 位置 | 备注 |
|---|---|---|
| 18 Excel 工作台未跑通真实导入 | 18-excel.png | 当前"导入状态：未上传"；07 Excel 阶段才会跑真实导入 |
| 04/07 项目指标等基础字段全部"未维护" | 04/07 | Excel V60 模板导入后会自动回填 |

---

## 四、WorkBuddy 客观记录（不做验收判断）

1. **执行前环境**：分支 main、commit 5e131b9、工作区干净、dev server 未运行；WorkBuddy 启动了 dev server 并清理 .next 缓存以避免 500 错误。
2. **登录**：使用 admin@lqdc.local 登录成功，重定向至 /projects。
3. **截图执行**：20 页全部 HTTP 200、page error = 0、console error = 0。
4. **客观现象**：金额/分摊/分摊结果为 0 是数据初始态；非前端问题。
5. **重点观察 9 锁定只读**：本次未直接验证，需要二次截图。
6. **后续建议**：待 07 Excel 导入跑通后，所有"未维护"字段会自动回填；待锁定态版本时再专项验证"锁定只读"效果。
7. **是否通过 V1 商用验收**：由 ChatGPT 决定，WorkBuddy 不做验收判断。

---

## 五、WorkBuddy 未做事项

- 未修改任何代码、文档、数据库、Prisma schema
- 未执行 git commit / push / 部署
- 未自动安装依赖
- 未自行修复任何页面/接口
- 未自行决定产品逻辑
- 未自行决定是否进入下一节点
