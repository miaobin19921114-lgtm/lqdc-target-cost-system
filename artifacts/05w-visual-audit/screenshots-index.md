# 05-W 视觉收敛复验截图清单

基准 commit：`5e131b9 feat: complete v1 commercial ui convergence`
基准 commit hash：`5e131b951dc5042b3f9cfebb94574f9213fed04c`
分支：`main`
工作区状态：干净
测试账号：`admin@lqdc.local`（管理员）
截图时间：2026-07-06 01:28 (UTC+8)
截图工具：Playwright + 系统 Chrome 149（隔离工作区）
本地地址：http://localhost:3000
截图目录：`/Users/miaobin/Documents/GitHub/lqdc-target-cost-system/artifacts/05w-visual-audit/`
测试项目 ID：`cmr6lbk26026kjivuu645td8b`（项目名"1111"，投拓版｜初始版本｜草稿）

---

## 一、基础信息

| 项 | 值 |
|---|---|
| 截图基准 commit | `5e131b9` |
| 当前分支 | `main` |
| 工作区状态 | 干净（git status --short 无输出） |
| 本地服务 | `http://localhost:3000` |
| 截图目录 | `artifacts/05w-visual-audit/` |
| 测试项目 ID | `cmr6lbk26026kjivuu645td8b`（项目名 1111） |
| 测试版本 | 投拓版｜初始版本｜草稿（可编辑） |

---

## 二、页面截图结果表

| 序号 | 页面名称 | 页面路径 | 截图文件 | HTTP | 状态 | 备注 |
|---|---|---|---|---|---|---|
| 01 | 项目管理页 | /projects | 01-projects.png | 200 | 正常 | 顶部单入口"新建项目"按钮；下方有 19 张后续版本能力卡片（个人知识库/系统模板/AI资料库/审批流/复杂权限/招采管理/现金流/历史项目库等），均标注"后续版本" |
| 02 | 新建项目页 | /projects/new | 02-projects-new.png | 200 | 正常 | **4 步向导**：①项目基础信息 ②选择测算模板 ③选择业态（默认 25 个，支持自定义新增）④确认并创建。第 3 步显示"住宅/商业/车位/配套/地下"分组 tabs |
| 03 | 项目详情页 | /projects/[id] | 03-project-detail.png | 200 | 正常 | 项目测算中心；左侧固定导航包含：项目概况/业态产品/成本科目/版本管理/测算控制中心/目标成本测算/汇总/分摊/明细链/税费/利润分析/Excel；常用操作按钮 8 个 |
| 04 | 项目概况-概况 | /projects/[id]/overview?section=overview | 04-overview-overview.png | 200 | 正常 | 五分区 tab；项目总览页基础字段精简；5 项数据完整性（已录入 3，待补充 2） |
| 05 | 项目概况-业态产品 | /projects/[id]/overview?section=product-objects | 05-overview-product-objects.png | 200 | 正常 | 表格列：对象 / 对象分类 / 启用与业务状态 / 对象角色 / 成本承担/单位 / 操作能力；可售/经营/收入/成本/分摊/利润/Excel 导入/营销展示 全是 ✅，车位/地下室/配套/营销展示 全是 ❌；V1 默认开发成本口径；无 objectType/objectStatus/isEnabled 残留字段 |
| 06 | 项目概况-建造标准 | /projects/[id]/overview?section=construction-standards | 06-overview-construction-standards.png | 200 | 正常 | 按结构/地下/人防/装配/外立/门窗/公区/设备/地库/景观/智能/示范区 等分类；毛坯/地下/公区装修/基础地库/示范区样间 行已自动生成（V1 仅在已勾选专项后展开） |
| 07 | 项目概况-项目指标 | /projects/[id]/overview?section=project-metrics | 07-overview-project-metrics.png | 200 | 正常 | **仍使用以下字段名**（属于 05-W 范围内的指标词）：规划面积/地下室/景观道路/车位/数量指标/产品对象指标/楼栋指标/工程量取数映射/总建面/计容建面/地建面/用地面积/容积率/建筑密度/绿地率。**重点观察 4 中提到的 baseIndicator / contentRule / calculatedQuantity / finalQuantity / finalAmount 字段在截图文本中已不可见**（仅剩 0/未维护 状态） |
| 08 | 项目概况-工程量指标 | /projects/[id]/overview?section=quantity-indicators | 08-overview-quantity-indicators.png | 200 | 正常 | **仍使用字段**：基础指标/明细科目绑定/含量规则/工程量计算/单价来源/手算覆盖/锁定行；**重点观察 6 提到的 quantityCalculation / quantityCalcMode 字段在截图文本中已不可见**（页面提示"暂无工程量指标数据，请先在项目指标页维护基础指标"） |
| 09 | 收入明细表 | /projects/[id]/revenue | 09-revenue.png | 200 | 正常 | 顶部 tab：收入汇总/商业收入/车位收入/其他收入；本表只读可售产品业态清单，金额 0（未维护） |
| 10 | 商业收入页 | /projects/[id]/commercial-revenue | 10-commercial-revenue.png | 200 | 正常 | 商业细分收入明细表头：归属商业业态/细分类型/模式/面积/销售单价/月租金/出租率/年限/税率/含税收入/不含税收入/销项税/备注；**重点观察 7 提到的 CommercialRevenueLine / ProductType 字段在截图文本中已不可见** |
| 11 | 成本批量录入 | /projects/[id]/costs-batch | 11-costs-batch.png | 200 | 正常 | 目标成本测算表；一级科目成本看板+目标成本测算表+目标成本量价金额明细预览 三段；明细结果行 0，聚合科目 0；页面提示"当前目标成本测算表尚未聚合，暂不能形成成本汇总"（合理） |
| 12 | 目标成本汇总表 | /projects/[id]/summary | 12-summary.png | 200 | 正常 | 顶部红色横幅"当前尚未生成目标成本汇总表"；经营指标分 收入/成本与税费/利润 三块；**重点观察 11 提到的"目标成本汇总表无成本汇总"现象存在但属于"未维护数据"的正常展示**，页面明确告知"目标成本测算表尚未聚合" |
| 13 | 成本分摊测算表 | /projects/[id]/allocation | 13-allocation.png | 200 | 正常 | 分摊口径摘要 + 业态分摊结果表 + 成本明细分摊过程；提示"暂无可分摊成本明细，请先录入专业明细" |
| 14 | 税金测算页 | /projects/[id]/tax-details | 14-tax-details.png | 200 | 正常 | 6 个税额指标 + 按所得税成本对象拆分表 + 土地增值税清算对象汇总 + 项目整体税费明细（10 行）；所有金额 0（未维护） |
| 15 | 业态利润分析页 | /projects/[id]/profit-analysis | 15-profit-analysis.png | 200 | 正常 | 数据状态卡 + 项目利润口径 + 业态利润明细 + 校验；净利率 0%（绿色），税后净利 0（绿色），所有金额 0；**重点观察 12 提到的"明细测算结果页"已下线**（项目左侧导航不再有"明细测算结果"入口，本页即对应能力） |
| 16 | 成本科目词典 | /projects/[id]/cost-dictionary | 16-cost-dictionary.png | 200 | 正常 | 只读检索型词典；当前展示 1408/1408 行；字段 9 列（成本编码/科目名称/层级/建安测算依据/单位/默认税率/适用业态/是否启用/是否进入目标成本）；**重点观察 8 提到的"超宽数据库表"已收敛到 9 列**（05-W 完成） |
| 17 | 版本管理页 | /projects/[id]/versions | 17-versions.png | 200 | 正常 | 阶段版本列表 + 复制阶段版本表单（含 9 项勾选：项目概况/业态产品/建造标准/项目指标/工程量指标/收入明细/成本明细/分摊设置/税费口径）；**重点观察 9 的"锁定版本只读"效果需手动验证**，当前版本草稿未锁定 |
| 18 | Excel 工作台 | /projects/[id]/excel | 18-excel.png | 200 | 正常 | 4 步流程：下载标准模板→上传→解析预览→确认导入/导出；Excel 导入/导出 切换；**重点观察 12 提到的"Excel 入口"已整合为单一工作台** |
| 19 | 登录页 | /login | 19-login.png | 200 | 正常 | 已登录态，访问 /login 被 middleware 重定向到 /projects；显示项目中心内容（与 01 同） |
| 20 | 账户页 | /account | 20-account.png | 200 | 正常 | 个人账户：姓名/邮箱/手机号/角色/创建时间；快捷入口 3 个 |

---

## 三、异常页面汇总

| 异常 | 页面 | 现象 | 状态 |
|---|---|---|---|
| 无 | — | 所有 20 个页面 HTTP 均为 200，page error 均为 0，console error 均为 0 | 正常 |

无 404、空白、接口报错。仅有"未维护数据导致金额为 0"的正常初始态。

---

## 四、复验分类清单

### A. 已按 05-W 收敛完成（页面层确认）

| 重点观察项 | 结论 | 证据 |
|---|---|---|
| 1. 新建项目页已是 4 步向导 | ✅ 已完成 | 02-projects-new.png 显示 ①基础信息 ②测算模板 ③选择业态 ④确认创建 |
| 2. 项目中心只保留一个新建项目主入口 | ✅ 已完成 | 01-projects.png 顶部右侧只有 1 个"新建项目"按钮 |
| 3. 项目测算中心工作流已业务化 | ✅ 已完成 | 03-project-detail.png V1 测算流程按"概况→业态产品→测算控制→收入明细→成本明细→成本分摊→税费测算→目标成本汇总→Excel 导出"组织 |
| 4. 业态产品页残留 objectType/objectStatus/product-types/isEnabled | ✅ 已清除 | 05-overview-product-objects.png 表格列改为：对象/对象分类/启用与业务状态/对象角色/成本承担/单位/操作能力 |
| 5. 项目指标页残留 baseIndicator/contentRule/calculatedQuantity/finalQuantity/finalAmount | ✅ 已清除 | 07-overview-project-metrics.png 页面文案与列名已不含这 5 个字段名 |
| 6. 工程量指标页残留 quantityCalculation/quantityCalcMode | ✅ 已清除 | 08-overview-quantity-indicators.png 页面文案与列名已不含这 2 个字段名 |
| 7. 商业收入页残留 CommercialRevenueLine/ProductType | ✅ 已清除 | 10-commercial-revenue.png 表头改为业务字段（归属商业业态/细分类型/模式/面积等） |
| 8. 成本科目词典是超宽数据库表 | ✅ 已收敛 | 16-cost-dictionary.png 字段从超宽收敛到 9 列（成本编码/科目名称/层级/建安测算依据/单位/默认税率/适用业态/是否启用/是否进入目标成本） |
| 9. 锁定版本只读是否明显生效 | ⚠️ 未直接验证 | 17-versions.png 显示当前版本为草稿，**未触发锁定状态进行只读验证**。需在锁定态下二次截图 |
| 10. 目标成本测算表是否仍聚合为 0 | ⚠️ 是 | 11-costs-batch.png 明细结果行 0、聚合科目 0；但因项目未录入任何成本明细，聚合为 0 是预期行为；非页面问题 |
| 11. 目标成本汇总表是否仍无成本汇总 | ⚠️ 是 | 12-summary.png 顶部横幅"当前尚未生成目标成本汇总表"；因目标成本测算表未聚合导致。**非页面问题**，是数据状态问题 |
| 12. 明细测算结果页是否仍像后续版本能力 | ✅ 已下线 | 03-project-detail.png 项目左侧导航已不含"明细测算结果"入口；其能力收敛到 15-profit-analysis 业态利润分析页 |

### B. 仍存在前端问题

| 问题 | 页面 | 现象 |
|---|---|---|
| 项目中心首页 19 张后续版本能力卡片占满首页 | 01-projects.png | 视觉权重过大，但仍属于"暂未开放/建设中"标识，建议后续按 V1.5 收敛 |
| 07 项目指标页布局密集，单屏可见字段很多 | 07-overview-project-metrics.png | 数据完整性卡显示"部分分区未录入完整数据"提示清晰；视觉密度高是 V1 内的客观状态 |
| 11 成本批量录入页聚合为 0 时页内容稀疏 | 11-costs-batch.png | 仅有"目标成本测算表尚未聚合"提示 + 空表格；属于空态展示 |

### C. 更像 06 后端遗留

| 问题 | 页面 | 现象 |
|---|---|---|
| 04-08 项目概况五分区数据"未维护" | 04/05/06/07/08 全部 | 总建面/可售面积/计容建面/容积率/绿地率 等基础指标都显示"未维护"；说明后端尚未通过 Excel/批量接口写入；待 07 Excel 跑通后会自动填入 |
| 09-15 测算链路全部 0 | 09/10/11/12/13/14/15 | 含税收入/成本/分摊/税费/利润 全部 0；根因是上层数据未录入；非前端问题 |
| 17 阶段版本复制表单默认勾选"成本明细" | 17-versions.png | 复制来源下"成本明细"已勾选；其他 8 项默认未勾选；说明后端已支持成本明细复制（与页面文案一致） |

### D. 更像 07 Excel 遗留

| 问题 | 页面 | 现象 |
|---|---|---|
| 18 Excel 工作台未跑通真实导入 | 18-excel.png | 当前"导入状态：未上传"；未做实操验收；07 Excel 阶段才会跑真实导入流程 |
| 07 项目指标等基础字段全部"未维护" | 04/07 | Excel V60 模板导入后会自动回填这些字段；待 07 阶段验收 |

---

## 五、WorkBuddy 说明

- 本次截图覆盖 20 个页面，全部 HTTP 200，无 page error / console error。
- 所有金额/分摊/分摊结果为 0 是因为测试项目"1111"尚未录入任何业务数据，属于初始态，非前端问题。
- 项目中心首页（01）的 19 张后续版本能力卡片在 05-W 范围内未在 V1 收敛清单中明确要求。
- 锁定版本只读效果（重点观察 9）本次未直接验证，因当前测试版本为草稿未锁定；如需专项验证需手动锁定一个版本后再截图。
- 本次截图执行了 `npm run dev`（启动 dev server），按用户指令"如已启动则复用"原则；清理了残留的 .next 缓存以避免 500 错误。
- 本次未修改任何代码、文档、数据库或配置文件。
- 本次未执行 git commit / push / 部署。
- 本次截图目录在 `artifacts/05w-visual-audit/`（同时落到项目 artifacts 与 /tmp/workbuddy-shots 临时目录）。
- 是否通过 V1 商用验收由 ChatGPT 判断，WorkBuddy 不做验收结论。
