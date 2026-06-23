'use client';

import { useMemo, useState } from 'react';

const cityDistricts: Record<string, string[]> = {
  成都: ['龙泉驿区', '天府新区', '高新区', '锦江区', '青羊区', '成华区', '武侯区', '金牛区', '双流区', '温江区', '新都区', '郫都区', '其他'],
  重庆: ['渝中区', '江北区', '渝北区', '南岸区', '九龙坡区', '沙坪坝区', '巴南区', '北碚区', '两江新区', '高新区', '其他'],
  德阳: ['旌阳区', '罗江区', '广汉市', '什邡市', '绵竹市', '中江县', '其他'],
  绵阳: ['涪城区', '游仙区', '安州区', '高新区', '经开区', '科技城新区', '江油市', '三台县', '其他'],
  西安: ['雁塔区', '未央区', '莲湖区', '碑林区', '新城区', '长安区', '高新区', '曲江新区', '经开区', '其他'],
  其他: ['其他']
};

const cityOptions = ['', ...Object.keys(cityDistricts)];
const fieldStyle = { height: 34, border: '1px solid #d9e2ec', borderRadius: 6, padding: '4px 8px' };

export function CityDistrictSelect({ city, district }: { city?: string | null; district?: string | null }) {
  const [currentCity, setCurrentCity] = useState(city || '');
  const districts = useMemo(() => cityDistricts[currentCity] || ['其他'], [currentCity]);
  const districtValue = district && districts.includes(district) ? district : '';

  return <>
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>城市
      <select form="overview-form" name="city" value={currentCity} onChange={(event) => setCurrentCity(event.target.value)} style={fieldStyle}>
        {cityOptions.map((item) => <option key={item || 'empty'} value={item}>{item || '请选择城市'}</option>)}
      </select>
    </label>
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467' }}>区域/板块
      <select form="overview-form" name="district" key={currentCity} defaultValue={districtValue} style={fieldStyle}>
        <option value="">请选择区域/板块</option>
        {districts.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  </>;
}
