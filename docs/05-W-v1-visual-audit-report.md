# 05-W V1 商用收敛后全面页面截图巡检报告

## 基本信息

- 巡检时间：2026/7/5 23:24:11
- 当前真实 Git 分支：main
- 当前 commit：37b736d feat: add project recycle bin frontend
- 启动命令：`npm run build`；`npm run lint`；临时隔离目录 `/private/tmp/lqdc-visual-audit-run` 执行 `npm run build`；`npx next start -H 127.0.0.1 -p 3002`
- 登录方式：退出浏览器会话后访问 `/login`，使用默认管理员账号登录。
- 项目 ID 获取方式：先访问 `/projects`，读取第一个正常项目的“进入项目测算中心”链接。
- 项目 ID：`cmqzenszp00001g89e143xzlf`（C3状态字段验收项目）
- 版本 ID 获取方式：进入版本管理页读取当前版本摘要，并用只读数据库检查 activeVersionId。
- 版本 ID：`cmqzenszp00011g89qswjrfz7`（初始版本，状态：draft，阶段：INVESTMENT）
- 截图目录：`artifacts/v1-visual-audit/`
- 截图总数：50
- 压缩包路径：`artifacts/v1-visual-audit.zip`
- 压缩包大小：5.68 MB (5952083 bytes)
- 截图脚本：未新增仓库脚本；使用内置浏览器自动化临时执行。

## 环境说明

- Codex 界面要求选择 main；终端真实分支为 `main`，本次按终端真实分支执行。
- 3000 端口已有开发服务占用，且与构建产物存在缓存冲突；为避免影响现有服务，本次复制仓库到 `/private/tmp/lqdc-visual-audit-run`，复用依赖并启动 3002 临时服务截图。
- 未修改业务代码、数据库、Prisma schema、页面逻辑或接口。

## 页面截图索引

| 序号 | 页面名称 | 路由 | 截图文件 | 状态 | 备注 |
|---:|---|---|---|---|---|
| 1 | 登录页 | `/login` | `artifacts/v1-visual-audit/01-login-登录页.png` | 成功 | 使用退出后的登录页截图。 |
| 2 | 个人账户页 | `/account` | `artifacts/v1-visual-audit/02-account-个人账户页.png` | 成功 | - |
| 3 | 项目中心页 | `/projects` | `artifacts/v1-visual-audit/03-projects-项目中心页.png` | 成功 | - |
| 4 | 项目中心 + 回收站展开状态 | `/projects` | `artifacts/v1-visual-audit/04-projects-trash-expanded-项目中心-回收站展开状态.png` | 成功 | 自动点击“回收站”后截图。 |
| 5 | 新建项目第 1 步：项目基础信息 | `/projects/new` | `artifacts/v1-visual-audit/05-new-project-step-1-新建项目第1步-项目基础信息.png` | 成功 | 当前页面为单页四段式表单，并非逐步切换向导。 |
| 6 | 新建项目第 2 步：选择测算模板 | `/projects/new` | `artifacts/v1-visual-audit/06-new-project-step-2-新建项目第2步-选择测算模板.png` | 成功 | 同一完整页面截图。 |
| 7 | 新建项目第 3 步：选择业态 | `/projects/new` | `artifacts/v1-visual-audit/07-new-project-step-3-新建项目第3步-选择业态.png` | 成功 | 同一完整页面截图。 |
| 8 | 新建项目第 4 步：确认创建 | `/projects/new` | `artifacts/v1-visual-audit/08-new-project-step-4-新建项目第4步-确认创建.png` | 成功 | 同一完整页面截图。 |
| 9 | 项目测算中心 | `/projects/cmqzenszp00001g89e143xzlf` | `artifacts/v1-visual-audit/09-project-center-项目测算中心.png` | 成功 | - |
| 10 | 版本管理页 | `/projects/cmqzenszp00001g89e143xzlf/versions` | `artifacts/v1-visual-audit/10-versions-版本管理页.png` | 成功 | - |
| 11 | 锁定版本状态页 | `/projects/cmqzenszp00001g89e143xzlf/versions` | `artifacts/v1-visual-audit/11-locked-version-status-锁定版本状态页.png` | 成功 | 未发现已锁定或定稿版本；未切换版本以避免修改数据库。 |
| 12 | 项目总览 | `/projects/cmqzenszp00001g89e143xzlf/overview?section=overview` | `artifacts/v1-visual-audit/12-project-overview-项目总览.png` | 成功 | - |
| 13 | 业态产品与对象 | `/projects/cmqzenszp00001g89e143xzlf/overview?section=product-objects` | `artifacts/v1-visual-audit/13-product-objects-业态产品与对象.png` | 成功 | - |
| 14 | 建造标准 | `/projects/cmqzenszp00001g89e143xzlf/overview?section=construction-standards` | `artifacts/v1-visual-audit/14-construction-standards-建造标准.png` | 成功 | - |
| 15 | 项目指标 | `/projects/cmqzenszp00001g89e143xzlf/overview?section=project-metrics` | `artifacts/v1-visual-audit/15-project-metrics-项目指标.png` | 成功 | - |
| 16 | 工程量指标 | `/projects/cmqzenszp00001g89e143xzlf/overview?section=quantity-indicators` | `artifacts/v1-visual-audit/16-quantity-indicators-工程量指标.png` | 成功 | - |
| 17 | 测算控制中心 | `/projects/cmqzenszp00001g89e143xzlf/control-center` | `artifacts/v1-visual-audit/17-control-center-测算控制中心.png` | 成功 | - |
| 18 | 目标成本汇总表 | `/projects/cmqzenszp00001g89e143xzlf/summary` | `artifacts/v1-visual-audit/18-target-cost-summary-目标成本汇总表.png` | 成功 | - |
| 19 | 目标成本测算表 | `/projects/cmqzenszp00001g89e143xzlf/costs-batch` | `artifacts/v1-visual-audit/19-target-cost-measure-目标成本测算表.png` | 成功 | - |
| 20 | 明细测算结果 | `/projects/cmqzenszp00001g89e143xzlf/detail-calculation-results` | `artifacts/v1-visual-audit/20-detail-calculation-results-明细测算结果.png` | 成功 | - |
| 21 | 收入明细表 / 销售收入 | `/projects/cmqzenszp00001g89e143xzlf/revenue` | `artifacts/v1-visual-audit/21-revenue-sales-收入明细表-销售收入.png` | 成功 | - |
| 22 | 商业收入 | `/projects/cmqzenszp00001g89e143xzlf/commercial-revenue` | `artifacts/v1-visual-audit/22-commercial-revenue-商业收入.png` | 成功 | - |
| 23 | 车位收入 | `/projects/cmqzenszp00001g89e143xzlf/parking-revenue` | `artifacts/v1-visual-audit/23-parking-revenue-车位收入.png` | 成功 | - |
| 24 | 其他收入 | `/projects/cmqzenszp00001g89e143xzlf/other-revenue` | `artifacts/v1-visual-audit/24-other-revenue-其他收入.png` | 成功 | - |
| 25 | 土地费用明细表 | `/projects/cmqzenszp00001g89e143xzlf/land` | `artifacts/v1-visual-audit/25-land-cost-details-土地费用明细表.png` | 成功 | - |
| 26 | 前期费用明细表 | `/projects/cmqzenszp00001g89e143xzlf/pre-costs` | `artifacts/v1-visual-audit/26-pre-cost-details-前期费用明细表.png` | 成功 | - |
| 27 | 土建明细表 | `/projects/cmqzenszp00001g89e143xzlf/building-details` | `artifacts/v1-visual-audit/27-building-details-土建明细表.png` | 成功 | - |
| 28 | 安装明细表 | `/projects/cmqzenszp00001g89e143xzlf/installation-details` | `artifacts/v1-visual-audit/28-installation-details-安装明细表.png` | 成功 | - |
| 29 | 设备明细表 | `/projects/cmqzenszp00001g89e143xzlf/equipment-details` | `artifacts/v1-visual-audit/29-equipment-details-设备明细表.png` | 成功 | - |
| 30 | 精装修明细表 | `/projects/cmqzenszp00001g89e143xzlf/fitout-details` | `artifacts/v1-visual-audit/30-fitout-details-精装修明细表.png` | 成功 | - |
| 31 | 室外管网明细表 | `/projects/cmqzenszp00001g89e143xzlf/outdoor-pipe-details` | `artifacts/v1-visual-audit/31-outdoor-pipe-details-室外管网明细表.png` | 成功 | - |
| 32 | 景观工程明细表 | `/projects/cmqzenszp00001g89e143xzlf/landscape-details` | `artifacts/v1-visual-audit/32-landscape-details-景观工程明细表.png` | 成功 | - |
| 33 | 道路总平明细表 | `/projects/cmqzenszp00001g89e143xzlf/road-details` | `artifacts/v1-visual-audit/33-road-details-道路总平明细表.png` | 成功 | - |
| 34 | 围墙出入口明细表 | `/projects/cmqzenszp00001g89e143xzlf/wall-gate-details` | `artifacts/v1-visual-audit/34-wall-gate-details-围墙出入口明细表.png` | 成功 | - |
| 35 | 销售费用明细表 | `/projects/cmqzenszp00001g89e143xzlf/sales-expense-details` | `artifacts/v1-visual-audit/35-sales-expense-details-销售费用明细表.png` | 成功 | - |
| 36 | 管理费用明细表 | `/projects/cmqzenszp00001g89e143xzlf/admin-expense-details` | `artifacts/v1-visual-audit/36-admin-expense-details-管理费用明细表.png` | 成功 | - |
| 37 | 财务费用明细表 | `/projects/cmqzenszp00001g89e143xzlf/finance-expense-details` | `artifacts/v1-visual-audit/37-finance-expense-details-财务费用明细表.png` | 成功 | - |
| 38 | 成本分摊测算表 | `/projects/cmqzenszp00001g89e143xzlf/allocation` | `artifacts/v1-visual-audit/38-allocation-成本分摊测算表.png` | 成功 | - |
| 39 | 税金测算表 | `/projects/cmqzenszp00001g89e143xzlf/tax-details` | `artifacts/v1-visual-audit/39-tax-details-税金测算表.png` | 成功 | - |
| 40 | 土地增值税测算表 | `/projects/cmqzenszp00001g89e143xzlf/land-vat` | `artifacts/v1-visual-audit/40-land-vat-土地增值税测算表.png` | 成功 | - |
| 41 | 业态利润分析 | `/projects/cmqzenszp00001g89e143xzlf/profit-analysis` | `artifacts/v1-visual-audit/41-profit-analysis-业态利润分析.png` | 成功 | - |
| 42 | Excel 工作台导入 Tab | `/projects/cmqzenszp00001g89e143xzlf/excel` | `artifacts/v1-visual-audit/42-excel-import-Excel工作台导入Tab.png` | 成功 | - |
| 43 | Excel 工作台导出 Tab | `/projects/cmqzenszp00001g89e143xzlf/excel` | `artifacts/v1-visual-audit/43-excel-export-Excel工作台导出Tab.png` | 成功 | 自动点击“Excel 导出”Tab 后截图。 |
| 44 | 成本科目及测算词典 | `/projects/cmqzenszp00001g89e143xzlf/cost-dictionary` | `artifacts/v1-visual-audit/44-cost-dictionary-成本科目及测算词典.png` | 成功 | 词典已有 100 行以上数据，未触发页面自动初始化写入。 |
| 45 | 锁定版本下收入明细表 | `/projects/cmqzenszp00001g89e143xzlf/revenue` | `artifacts/v1-visual-audit/45-locked-revenue-锁定版本下收入明细表.png` | 成功 | 未发现已锁定或定稿版本；未切换版本以避免修改数据库。 |
| 46 | 锁定版本下土地费用明细表 | `/projects/cmqzenszp00001g89e143xzlf/land` | `artifacts/v1-visual-audit/46-locked-land-锁定版本下土地费用明细表.png` | 成功 | 未发现已锁定或定稿版本；未切换版本以避免修改数据库。 |
| 47 | 锁定版本下土建明细表 | `/projects/cmqzenszp00001g89e143xzlf/building-details` | `artifacts/v1-visual-audit/47-locked-building-锁定版本下土建明细表.png` | 成功 | 未发现已锁定或定稿版本；未切换版本以避免修改数据库。 |
| 48 | 404 / 不存在项目页 | `/projects/visual-audit-missing-project` | `artifacts/v1-visual-audit/48-not-found-project-404-不存在项目页.png` | 成功 | 已捕捉异常/状态页。 |
| 49 | 空项目状态页 | `/projects/new` | `artifacts/v1-visual-audit/49-empty-project-state-空项目状态页.png` | 成功 | 未创建新空项目以遵守不修改数据库；以新建项目空表单作为空状态参考。 |
| 50 | 未开放功能页 | `/projects/cmqzenszp00001g89e143xzlf/non-v1` | `artifacts/v1-visual-audit/50-non-v1-未开放功能页.png` | 成功 | - |

## 页面访问失败清单

无。第 48 项为预期异常页截图，状态记为成功。

## 技术字段残留初筛清单

| 序号 | 页面名称 | 路由 | 出现字段 | 截图文件 |
|---:|---|---|---|---|
| 1 | 业态产品与对象 | `/projects/cmqzenszp00001g89e143xzlf/overview?section=product-objects` | `objectType`, `objectStatus`, `product-types`, `isEnabled` | `artifacts/v1-visual-audit/13-product-objects-业态产品与对象.png` |
| 2 | 项目指标 | `/projects/cmqzenszp00001g89e143xzlf/overview?section=project-metrics` | `baseIndicator`, `contentRule`, `calculatedQuantity`, `finalQuantity`, `finalAmount` | `artifacts/v1-visual-audit/15-project-metrics-项目指标.png` |
| 3 | 工程量指标 | `/projects/cmqzenszp00001g89e143xzlf/overview?section=quantity-indicators` | `baseIndicator`, `subjectIndicatorBinding`, `contentRule`, `quantityCalculation`, `calculatedQuantity`, `finalQuantity`, `quantityCalcMode`, `finalAmount` | `artifacts/v1-visual-audit/16-quantity-indicators-工程量指标.png` |
| 4 | 目标成本测算表 | `/projects/cmqzenszp00001g89e143xzlf/costs-batch` | `finalQuantity`, `finalAmount`, `taxInclusiveAmount` | `artifacts/v1-visual-audit/19-target-cost-measure-目标成本测算表.png` |
| 5 | 商业收入 | `/projects/cmqzenszp00001g89e143xzlf/commercial-revenue` | `CommercialRevenueLine`, `ProductType` | `artifacts/v1-visual-audit/22-commercial-revenue-商业收入.png` |

技术字段残留数量：5

## 锁定版本按钮初筛清单

当前项目未发现已锁定或定稿版本；为遵守不修改数据库，本次未创建、锁定或切换版本。锁定版本下 3 张截图使用当前草稿版本页面作为占位参考，不计入疑似锁定态改写按钮。

锁定版本疑似改写按钮数量：0

## 回收站初筛结果

- 存在“移入回收站”：是
- 存在“回收站”入口：是
- 存在“恢复项目”：当前回收站无项目，未出现恢复项目按钮
- 重复“新建项目”按钮：项目中心存在顶部和列表区两个“新建项目”入口，建议人工复验是否仍符合预期
- 回收站是否默认展开：否
- 回收站空状态文案：可见，文案说明删除项目后会在此显示并可恢复

## 新建项目向导初筛结果

新建项目页未形成可逐步切换的 4 步向导。当前页面是单页四段式表单：第1步测算阶段、第2步选择模板与业态、第3步系统模板规则、第4步项目基础信息；与指定“基础信息 / 选择模板 / 选择业态 / 确认创建”顺序不完全一致。

## 页面视觉复验重点提示

- 优先复验项目中心两处“新建项目”入口是否需要收敛。
- 优先复验新建项目页四步顺序与是否应改为真正向导。
- 优先复验项目概况五分区是否仍暴露技术字段或偏后端字段名。
- 优先复验成本科目词典超宽表格的可读性和首屏信息密度。
- 锁定版本只读态需要在存在已锁定版本的数据环境中再次人工复验。

## 是否需要人工复验

需要。尤其是项目概况五分区、Excel 工作台、成本科目词典、项目中心回收站和锁定版本只读态。

## 建议优先人工查看的前 10 张截图

1. `03-projects-项目中心页.png`
2. `04-projects-trash-expanded-项目中心-回收站展开状态.png`
3. `05-new-project-step-1-新建项目第1步-项目基础信息.png`
4. `12-project-overview-项目总览.png`
5. `13-product-objects-业态产品与对象.png`
6. `15-project-metrics-项目指标.png`
7. `16-quantity-indicators-工程量指标.png`
8. `42-excel-import-Excel工作台导入Tab.png`
9. `43-excel-export-Excel工作台导出Tab.png`
10. `44-cost-dictionary-成本科目及测算词典.png`
