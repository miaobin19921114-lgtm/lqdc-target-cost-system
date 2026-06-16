import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('目标成本汇总表');

  ws.columns = [
    { header: '一级科目', key: 'level1', width: 24 },
    { header: '二级科目', key: 'level2', width: 24 },
    { header: '不含税金额', key: 'ex', width: 16 },
    { header: '税额', key: 'tax', width: 16 },
    { header: '含税金额', key: 'inc', width: 16 }
  ];

  ws.addRow({ level1: '建安工程费', level2: '土建工程', ex: 0, tax: 0, inc: 0 });
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="lqdc-target-cost-demo.xlsx"'
    }
  });
}
