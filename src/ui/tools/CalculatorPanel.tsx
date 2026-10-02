import { useMemo, useState, type ReactNode } from 'react';
import type { EngineeringProject } from '../../core/model/contracts.ts';
import { calculatorApi } from '../../app/tools/calculators.ts';
import { runWcca, type WccaComponent, type WccaStats } from '../../core/tools/wcca.ts';
import { calculateTransientThermal, FOSTER_PRESETS, type FosterStage, type TransientThermalResult } from '../../core/tools/transientThermal.ts';
import { calculateVoltageMargin, type VoltageMarginResult } from '../../core/tools/voltageMargin.ts';
import { calculateCommutationRisk, calculateSafetyChain, type CommutationResult, type SafetyChainResult } from '../../core/tools/motorDrive.ts';

type Tool = 'bus' | 'miller' | 'thermal' | 'protection' | 'snubber' | 'deadtime' | 'bandwidth' | 'wcca' | 'foster' | 'voltage' | 'commutation' | 'safety';

const TOOLS: Array<[Tool, string]> = [
  ['bus', '母线泵升'],
  ['miller', '米勒风险'],
  ['thermal', '热-电级联'],
  ['protection', '保护链 / SOA'],
  ['snubber', 'Snubber'],
  ['deadtime', 'Deadtime'],
  ['bandwidth', '带宽 / 共振'],
  ['wcca', 'WCCA / RSS / CPK'],
  ['foster', 'Foster 瞬态热'],
  ['voltage', 'DC 电压裕量'],
  ['commutation', '换相 / 失步'],
  ['safety', '安全链时间预算'],
];

function q(project: EngineeringProject, key: string): number | undefined {
  const value = project.issue.quantities[key];
  return value?.status === 'ok' && Number.isFinite(value.value) ? value.value : undefined;
}

function initialNumber(value: number | undefined): number | '' {
  return value === undefined ? '' : value;
}

function requireNumber(value: number | '', label: string): number {
  if (value === '' || !Number.isFinite(value)) throw new Error(`${label} 需要有效数值`);
  return value;
}

type BusState = { vbus: number | ''; cap: number | ''; inertia: number | ''; rpm: number | ''; efficiency: number | ''; absorbed: number | '' };
type FosterState = { ambientTempC: number | ''; biasPowerW: number | ''; pulsePowerW: number | ''; pulseWidthMs: number | ''; tjMaxC: number | ''; deratingMarginC: number | ''; stages: FosterStage[] };
type VoltageState = { nominalVoltage: number | ''; regulatorTolerancePercent: number | ''; lineAndSwitchDropMv: number | ''; transientDipMv: number | ''; minAllowedVoltage: number | '' };
type CommutationState = { controlMode: 'hall_six_step' | 'sensorless_bemf' | 'foc_vector'; speedMinRpm: number | ''; speedMaxRpm: number | ''; angleOffsetDeg: number | ''; torqueFluctuationPct: number | '' };
type SafetyState = { fhtiBudgetMs: number | ''; watchdogTimeoutMs: number | ''; safeStateTransitionMs: number | ''; currentSenseDeviationPct: number | '' };

export function CalculatorPanel({ project }: { project: EngineeringProject }) {
  const [tool, setTool] = useState<Tool>('bus');
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl shadow-black/10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[.18em] text-slate-500">Engineering Toolbox</div>
          <h2 className="mt-1 text-base font-semibold">工程计算器与工具箱</h2>
          <p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-500">
            保留原版工程工具，但不把计算器结果偷偷写入正式 AnalysisResult。能从当前工程读取的字段优先带入；没有输入就保持空白，不用经验值补齐。
          </p>
        </div>
        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] text-slate-500">独立工作区 · 可追溯写回需人工确认</span><button onClick={() => setRefreshKey((value) => value + 1)} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] text-slate-400 hover:bg-slate-800">从当前工程重新带入</button>
      </div>
      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {TOOLS.map(([id, label]) => (
          <button key={id} onClick={() => setTool(id)} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] ${tool === id ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:bg-slate-800/70'}`}>{label}</button>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
        <ToolBody key={`${tool}:${refreshKey}`} tool={tool} project={project} />
      </div>
    </section>
  );
}

function NumberField({ label, unit, value, onChange, step = 'any' }: { label: string; unit?: string; value: number | ''; onChange: (value: number | '') => void; step?: number | 'any' }) {
  return (
    <label className="block">
      <span className="text-[10px] text-slate-500">{label}{unit ? ` · ${unit}` : ''}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value.trim() === '' ? '' : Number(event.target.value))}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 font-mono text-xs outline-none focus:border-blue-500/50"
      />
    </label>
  );
}

function ToolGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  return <div className={`grid gap-3 ${columns === 2 ? 'md:grid-cols-2' : columns === 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3'}`}>{children}</div>;
}

function CalculateButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="mt-4 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">计算</button>;
}

function ToolBody({ tool, project }: { tool: Tool; project: EngineeringProject }) {
  switch (tool) {
    case 'bus': return <BusTool project={project} />;
    case 'miller': return <MillerTool project={project} />;
    case 'thermal': return <ThermalTool project={project} />;
    case 'protection': return <ProtectionTool project={project} />;
    case 'snubber': return <SnubberTool />;
    case 'deadtime': return <DeadtimeTool project={project} />;
    case 'bandwidth': return <BandwidthTool />;
    case 'wcca': return <WccaTool />;
    case 'foster': return <FosterTool project={project} />;
    case 'voltage': return <VoltageTool project={project} />;
    case 'commutation': return <CommutationTool />;
    case 'safety': return <SafetyTool />;
  }
}

function BusTool({ project }: { project: EngineeringProject }) {
  const [values, setValues] = useState<BusState>({
    vbus: initialNumber(q(project, 'vbusNominalV')),
    cap: initialNumber(q(project, 'cbusUf')),
    inertia: initialNumber(q(project, 'rotorInertiaKgM2')),
    rpm: initialNumber(q(project, 'rpm')),
    efficiency: '',
    absorbed: '',
  });
  const [result, setResult] = useState<unknown>(null);
  const ready = Object.values(values).every((value) => value !== '');
  const fields: Array<[string, string, keyof BusState]> = [
    ['母线标称', 'V', 'vbus'], ['母线电容', 'µF', 'cap'], ['转子惯量', 'kg·m²', 'inertia'], ['转速', 'rpm', 'rpm'], ['再生效率', 'ratio', 'efficiency'], ['已吸收能量', 'J', 'absorbed'],
  ];
  return <><ToolGrid>{fields.map(([label, unit, key]) => <NumberField key={key} label={label} unit={unit} value={values[key]} onChange={(value) => setValues((prev) => ({ ...prev, [key]: value }))} />)}</ToolGrid><CalculateButton disabled={!ready} onClick={() => setResult(calculatorApi.bus(requireNumber(values.vbus, '母线标称'), requireNumber(values.cap, '母线电容'), requireNumber(values.inertia, '转子惯量'), requireNumber(values.rpm, '转速'), requireNumber(values.efficiency, '再生效率'), requireNumber(values.absorbed, '已吸收能量')))} />{result && <ToolResult value={result} />}</>;
}

function MillerTool({ project }: { project: EngineeringProject }) {
  const values = useMemo(() => ({
    vbus: q(project, 'vbusNominalV'), dvdt: q(project, 'dvDtVns'), cgd: q(project, 'cgdPf'), rg: q(project, 'rgOffOhm'), vth: q(project, 'vthMinV'), ls: q(project, 'sourceInductanceNh'), didt: q(project, 'diDtANs'), cgs: q(project, 'cgsPf')
  }), [project]);
  const [state, setState] = useState<Record<string, number | ''>>(() => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, initialNumber(value)])));
  const [result, setResult] = useState<unknown>(null);
  const required = ['vbus', 'dvdt', 'cgd', 'rg', 'vth'];
  const ready = required.every((key) => state[key] !== '');
  const fields: Array<[string, string, string]> = [['母线', 'V', 'vbus'], ['dv/dt', 'V/ns', 'dvdt'], ['Cgd', 'pF', 'cgd'], ['Roff', 'Ω', 'rg'], ['Vth(min)', 'V', 'vth'], ['源极电感', 'nH', 'ls'], ['di/dt', 'A/ns', 'didt'], ['Cgs', 'pF', 'cgs']];
  return <><ToolGrid columns={4}>{fields.map(([label, unit, key]) => <NumberField key={key} label={label} unit={unit} value={state[key]} onChange={(value) => setState((prev) => ({ ...prev, [key]: value }))} />)}</ToolGrid><CalculateButton disabled={!ready} onClick={() => setResult(calculatorApi.miller(requireNumber(state.vbus, '母线'), requireNumber(state.dvdt, 'dv/dt'), requireNumber(state.cgd, 'Cgd'), requireNumber(state.rg, 'Roff'), requireNumber(state.vth, 'Vth(min)'), state.ls === '' ? undefined : requireNumber(state.ls, '源极电感'), state.didt === '' ? undefined : requireNumber(state.didt, 'di/dt'), state.cgs === '' ? undefined : requireNumber(state.cgs, 'Cgs')))} />{result && <ToolResult value={result} />}</>;
}

function ThermalTool({ project }: { project: EngineeringProject }) {
  const stateKeys = ['ambientC', 'currentRmsA', 'rdsOnMilliOhm', 'rdsOnTempCoeff', 'rthJaCPerW', 'tjMaxC'] as const;
  const [state, setState] = useState<Record<typeof stateKeys[number], number | ''>>(() => Object.fromEntries(stateKeys.map((key) => [key, initialNumber(q(project, key))])) as Record<typeof stateKeys[number], number | ''>);
  const [result, setResult] = useState<unknown>(null);
  const ready = stateKeys.every((key) => state[key] !== '');
  return <><ToolGrid columns={4}>{[['环境温度', '°C', 'ambientC'], ['RMS 电流', 'A', 'currentRmsA'], ['Rds(on)@25', 'mΩ', 'rdsOnMilliOhm'], ['温度系数 α', '1/°C', 'rdsOnTempCoeff'], ['RθJA', '°C/W', 'rthJaCPerW'], ['TjMax', '°C', 'tjMaxC']].map(([label, unit, key]) => <NumberField key={key} label={label} unit={unit} value={state[key as typeof stateKeys[number]]} onChange={(value) => setState((prev) => ({ ...prev, [key]: value }))} />)}</ToolGrid><CalculateButton disabled={!ready} onClick={() => setResult(calculatorApi.thermal(state.ambientC as number, state.currentRmsA as number, state.rdsOnMilliOhm as number, state.rdsOnTempCoeff as number, state.rthJaCPerW as number, state.tjMaxC as number))} />{result && <ToolResult value={result} />}</>;
}

function ProtectionTool({ project }: { project: EngineeringProject }) {
  const keys = ['senseDelayNs', 'comparatorDelayNs', 'digitalFilterDelayNs', 'driverPropDelayNs', 'gateTurnOffDelayNs', 'currentFallDelayNs', 'soaShortCircuitTimeUs'] as const;
  const [state, setState] = useState<Record<typeof keys[number], number | ''>>(() => Object.fromEntries(keys.map((key) => [key, initialNumber(q(project, key))])) as Record<typeof keys[number], number | ''>);
  const [result, setResult] = useState<unknown>(null);
  const ready = keys.every((key) => state[key] !== '');
  return <><ToolGrid columns={4}>{[['检测', 'ns', keys[0]], ['比较器', 'ns', keys[1]], ['滤波', 'ns', keys[2]], ['Driver', 'ns', keys[3]], ['Gate off', 'ns', keys[4]], ['电流下降', 'ns', keys[5]], ['SOA', 'µs', keys[6]]].map(([label, unit, key]) => <NumberField key={key} label={String(label)} unit={String(unit)} value={state[key as typeof keys[number]]} onChange={(value) => setState((prev) => ({ ...prev, [key]: value }))} />)}</ToolGrid><CalculateButton disabled={!ready} onClick={() => setResult(calculatorApi.protection(state.senseDelayNs as number, state.comparatorDelayNs as number, state.digitalFilterDelayNs as number, state.driverPropDelayNs as number, state.gateTurnOffDelayNs as number, state.currentFallDelayNs as number, state.soaShortCircuitTimeUs as number))} />{result && <ToolResult value={result} />}</>;
}

function SnubberTool() {
  const [l, setL] = useState<number | ''>('');
  const [c, setC] = useState<number | ''>('');
  const [result, setResult] = useState<unknown>(null);
  const ready = l !== '' && c !== '';
  return <><ToolGrid columns={2}><NumberField label="寄生电感" unit="nH" value={l} onChange={setL} /><NumberField label="目标电容" unit="pF" value={c} onChange={setC} /></ToolGrid><CalculateButton disabled={!ready} onClick={() => setResult(calculatorApi.snubber(l as number, c as number))} />{result && <ToolResult value={result} />}</>;
}

function DeadtimeTool({ project }: { project: EngineeringProject }) {
  const [vbus, setVbus] = useState<number | ''>(initialNumber(q(project, 'vbusNominalV')));
  const [deadtime, setDeadtime] = useState<number | ''>('');
  const [period, setPeriod] = useState<number | ''>('');
  const [result, setResult] = useState<unknown>(null);
  const ready = vbus !== '' && deadtime !== '' && period !== '';
  return <><ToolGrid columns={3}><NumberField label="母线" unit="V" value={vbus} onChange={setVbus} /><NumberField label="Deadtime" unit="ns" value={deadtime} onChange={setDeadtime} /><NumberField label="开关周期" unit="ns" value={period} onChange={setPeriod} /></ToolGrid><CalculateButton disabled={!ready} onClick={() => setResult(calculatorApi.deadtime(vbus as number, deadtime as number, period as number))} />{result && <ToolResult value={result} />}</>;
}

function BandwidthTool() {
  const [resonance, setResonance] = useState<number | ''>('');
  const [bandwidth, setBandwidth] = useState<number | ''>('');
  const [result, setResult] = useState<unknown>(null);
  const ready = resonance !== '' && bandwidth !== '';
  return <><ToolGrid columns={2}><NumberField label="结构/LC 共振" unit="Hz" value={resonance} onChange={setResonance} /><NumberField label="控制环带宽" unit="Hz" value={bandwidth} onChange={setBandwidth} /></ToolGrid><CalculateButton disabled={!ready} onClick={() => setResult(calculatorApi.bandwidth(resonance as number, bandwidth as number))} />{result && <ToolResult value={result} />}</>;
}

function WccaTool() {
  const empty: WccaComponent = { id: `c-${Date.now()}`, name: '', nominal: Number.NaN, initTolPercent: Number.NaN, tempDriftPercent: Number.NaN, agingPercent: Number.NaN, distribution: 'gaussian' };
  const [components, setComponents] = useState<WccaComponent[]>([empty]);
  const [limit, setLimit] = useState<number | ''>('');
  const [iterations, setIterations] = useState<number | ''>('');
  const [seed, setSeed] = useState<number | ''>('');
  const [result, setResult] = useState<WccaStats | null>(null);
  const ready = limit !== '' && iterations !== '' && seed !== '' && components.every((item) => item.name.trim() && Number.isFinite(item.nominal) && Number.isFinite(item.initTolPercent) && Number.isFinite(item.tempDriftPercent) && Number.isFinite(item.agingPercent));

  const update = (id: string, patch: Partial<WccaComponent>) => setComponents((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const add = () => setComponents((items) => [...items, { ...empty, id: `c-${Date.now()}-${items.length}` }]);
  return <div className="space-y-4">
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-[10px] text-slate-500">WCCA 统计工具使用当前表格输入和固定 Seed，可重复得到相同结果。它是统计分析，不会自动成为正式 Pattern 数值。</div>
    <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="min-w-[900px] w-full text-left text-[10px]"><thead className="bg-slate-900 text-slate-500"><tr>{['误差项','Nominal','初始公差 %','温漂 %','老化 %','分布','操作'].map((h)=><th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody>{components.map((item)=><tr key={item.id} className="border-t border-slate-800"><td className="px-2 py-2"><input value={item.name} onChange={(e)=>update(item.id,{name:e.target.value})} placeholder="例如 Shunt" className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"/></td><td className="px-2 py-2"><NumberField label="" value={Number.isFinite(item.nominal) ? item.nominal : ''} onChange={(value)=>update(item.id,{nominal:value === '' ? NaN : value})}/></td><td className="px-2 py-2"><NumberField label="" value={item.initTolPercent} onChange={(value)=>update(item.id,{initTolPercent:value === '' ? NaN : value})}/></td><td className="px-2 py-2"><NumberField label="" value={item.tempDriftPercent} onChange={(value)=>update(item.id,{tempDriftPercent:value === '' ? NaN : value})}/></td><td className="px-2 py-2"><NumberField label="" value={item.agingPercent} onChange={(value)=>update(item.id,{agingPercent:value === '' ? NaN : value})}/></td><td className="px-2 py-2"><select value={item.distribution} onChange={(e)=>update(item.id,{distribution:e.target.value as WccaComponent['distribution']})} className="rounded border border-slate-700 bg-slate-950 px-2 py-2"><option value="gaussian">Gaussian 3σ</option><option value="uniform">Uniform</option></select></td><td className="px-2 py-2"><button disabled={components.length===1} onClick={()=>setComponents((items)=>items.filter((x)=>x.id!==item.id))} className="rounded border border-red-500/20 px-2 py-1 text-red-300 disabled:opacity-30">删</button></td></tr>)}</tbody></table></div>
    <div className="flex flex-wrap items-end gap-3"><NumberField label="目标误差上限" unit="%" value={limit} onChange={setLimit} /><NumberField label="抽样次数" value={iterations} onChange={setIterations} /><NumberField label="固定 Seed" value={seed} onChange={setSeed} /><button onClick={add} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">+ 误差项</button><CalculateButton disabled={!ready} onClick={()=>setResult(runWcca({components,targetErrorLimitPercent:limit as number,iterations:iterations as number,seed:seed as number}))}/></div>
    {result && <WccaResult result={result} />}
  </div>;
}

function WccaResult({ result }: { result: WccaStats }) {
  const values: Array<[string, string]> = [['Mean', `${result.meanPercent}%`], ['Sigma', `${result.sigmaPercent}%`], ['P01', `${result.percentiles.p01}%`], ['P50', `${result.percentiles.p50}%`], ['P99', `${result.percentiles.p99}%`], ['Cp', result.cp.toFixed(2)], ['Cpk', result.cpk.toFixed(2)], ['PPM', result.ppm.toLocaleString()], ['RSS', `${result.rssPercent}%`], ['Worst', `${result.extremeWorstCasePercent}%`]];
  const maxCount = Math.max(...result.histogram.map((bin)=>bin.count),1);
  return <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.3fr]"><div className="grid grid-cols-2 gap-2">{values.map(([label,value])=><MiniResult key={label} label={label} value={value} />)}</div><div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="mb-2 text-xs font-semibold">WCCA 分布</div><svg viewBox="0 0 720 260" className="w-full h-auto">{result.histogram.map((bin,index)=>{const x=index*(720/result.histogram.length); const w=Math.max(1,720/result.histogram.length-1); const h=(bin.count/maxCount)*190; return <rect key={index} x={x} y={220-h} width={w} height={h} className={bin.outOfSpec?'fill-rose-500/60':'fill-blue-400/60'} />;})}<line x1="0" x2="720" y1="220" y2="220" stroke="rgba(100,116,139,.55)"/></svg><div className="text-[10px] text-slate-600">蓝色=规格内抽样，红色=规格外；Seed 固定后可复现。</div></div></div>;
}

function FosterTool({ project }: { project: EngineeringProject }) {
  const defaultPreset = FOSTER_PRESETS[0];
  const [presetId, setPresetId] = useState(defaultPreset.id);
  const [state, setState] = useState<FosterState>({ ambientTempC: initialNumber(q(project,'ambientC')), biasPowerW: '', pulsePowerW: '', pulseWidthMs: '', tjMaxC: initialNumber(q(project,'tjMaxC')), deratingMarginC: '', stages: defaultPreset.stages });
  const [result, setResult] = useState<TransientThermalResult | null>(null);
  const ready = [state.ambientTempC,state.biasPowerW,state.pulsePowerW,state.pulseWidthMs,state.tjMaxC,state.deratingMarginC].every((value)=>value!=='') && state.stages.every((stage)=>stage.r>0&&stage.c>0);
  const choosePreset=(id:string)=>{const preset=FOSTER_PRESETS.find((item)=>item.id===id);if(!preset)return;setPresetId(id);setState((prev)=>({...prev,stages:preset.stages,tjMaxC:prev.tjMaxC===''?preset.defaultTjMaxC:prev.tjMaxC,deratingMarginC:prev.deratingMarginC===''?preset.defaultDeratingMarginC:prev.deratingMarginC}));};
  const updateStage=(index:number,patch:Partial<FosterStage>)=>setState((prev)=>({...prev,stages:prev.stages.map((stage,i)=>i===index?{...stage,...patch}:stage)}));
  const fosterFields: Array<[string, string, keyof Omit<FosterState, 'stages'>]> = [['环境','°C','ambientTempC'],['稳态功耗','W','biasPowerW'],['脉冲功耗','W','pulsePowerW'],['脉冲宽度','ms','pulseWidthMs'],['TjMax','°C','tjMaxC'],['降额裕量','°C','deratingMarginC']];
  return <div className="space-y-4"><div className="flex flex-wrap items-end gap-3"><label className="block min-w-64"><span className="text-[10px] text-slate-500">Foster 起点库（不是当前器件的 datasheet）</span><select value={presetId} onChange={(e)=>choosePreset(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">{FOSTER_PRESETS.map((preset)=><option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label><div className="max-w-2xl text-[10px] text-slate-600">{FOSTER_PRESETS.find((preset)=>preset.id===presetId)?.description}</div></div><ToolGrid columns={4}>{fosterFields.map(([label,unit,key])=><NumberField key={key} label={label} unit={unit} value={state[key]} onChange={(value)=>setState((prev)=>({...prev,[key]:value}))}/> )}</ToolGrid><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{state.stages.map((stage,index)=><div key={index} className="rounded-lg border border-slate-800 bg-slate-900 p-3"><div className="text-xs font-semibold">Stage {index+1}</div><div className="mt-2 grid grid-cols-2 gap-2"><NumberField label="R" unit="K/W" value={stage.r} onChange={(value)=>updateStage(index,{r:value === ''?NaN:value})}/><NumberField label="C" unit="J/K" value={stage.c} onChange={(value)=>updateStage(index,{c:value === ''?NaN:value})}/></div><div className="mt-2 text-[9px] text-slate-600">τ = {(stage.r*stage.c*1000).toFixed(3)} ms</div></div>)}</div><CalculateButton disabled={!ready} onClick={()=>setResult(calculateTransientThermal({ambientTempC:requireNumber(state.ambientTempC,'环境'),biasPowerW:requireNumber(state.biasPowerW,'稳态功耗'),pulsePowerW:requireNumber(state.pulsePowerW,'脉冲功耗'),pulseWidthMs:requireNumber(state.pulseWidthMs,'脉冲宽度'),tjMaxC:requireNumber(state.tjMaxC,'TjMax'),deratingMarginC:requireNumber(state.deratingMarginC,'降额裕量'),fosterStages:state.stages}))}/>{result&&<FosterResult result={result}/>}</div>;
}

function FosterResult({result}:{result:TransientThermalResult}){const maxTj=Math.max(...result.timeSeries.map((item)=>item.tj));const maxZ=Math.max(...result.timeSeries.map((item)=>item.zth),1e-9);const points=result.timeSeries.map((item,index)=>`${(index/(result.timeSeries.length-1))*680+20},${210-(item.tj/maxTj)*180}`).join(' ');return <div className="mt-4 grid gap-4 xl:grid-cols-[.75fr_1.25fr]"><div className="grid grid-cols-2 gap-2"><MiniResult label="RθJA" value={`${result.steadyRthJA} K/W`}/><MiniResult label="Zth(tp)" value={`${result.zthPulse} K/W`}/><MiniResult label="峰值 Tj" value={`${result.peakJunctionTempC} °C`} tone={result.absoluteTjPass?'default':'danger'}/><MiniResult label="降额边界" value={`${result.deratedLimitC} °C`}/><MiniResult label="裕量" value={`${result.marginC} °C`} tone={result.deratingPass?'good':'warn'}/><MiniResult label="绝对 Tj" value={result.absoluteTjPass?'PASS':'VETO 风险'} tone={result.absoluteTjPass?'good':'danger'}/></div><div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-xs font-semibold">Zth / Tj 时间响应</div><svg viewBox="0 0 720 230" className="mt-2 w-full h-auto"><line x1="20" x2="700" y1="210" y2="210" stroke="rgba(100,116,139,.55)"/><polyline fill="none" stroke="currentColor" strokeWidth="1.7" points={points} className="text-orange-300"/></svg><div className="text-[10px] text-slate-600">时间轴 0.01 ms → 100 s（对数采样）；Zth 最大值 {maxZ.toFixed(4)} K/W。</div></div></div>}

function VoltageTool({ project }: { project: EngineeringProject }) {
  const [state, setState] = useState<VoltageState>({ nominalVoltage: initialNumber(q(project,'vbusNominalV')), regulatorTolerancePercent: '', lineAndSwitchDropMv: '', transientDipMv: '', minAllowedVoltage: '' });
  const [result, setResult] = useState<VoltageMarginResult | null>(null);
  const ready=Object.values(state).every((value)=>value!=='');
  const voltageFields: Array<[string,string,keyof VoltageState]> = [['标称电压','V','nominalVoltage'],['稳压容差','%','regulatorTolerancePercent'],['线束/开关压降','mV','lineAndSwitchDropMv'],['瞬态跌落','mV','transientDipMv'],['最小允许电压','V','minAllowedVoltage']];
  return <><ToolGrid>{voltageFields.map(([label,unit,key])=><NumberField key={key} label={label} unit={unit} value={state[key]} onChange={(value)=>setState((prev)=>({...prev,[key]:value}))}/>)}</ToolGrid><CalculateButton disabled={!ready} onClick={()=>setResult(calculateVoltageMargin({nominalVoltage:requireNumber(state.nominalVoltage,'标称电压'),regulatorTolerancePercent:requireNumber(state.regulatorTolerancePercent,'稳压容差'),lineAndSwitchDropMv:requireNumber(state.lineAndSwitchDropMv,'线束/开关压降'),transientDipMv:requireNumber(state.transientDipMv,'瞬态跌落'),minAllowedVoltage:requireNumber(state.minAllowedVoltage,'最小允许电压')}))}/>{result&&<div className="mt-4 grid grid-cols-3 gap-2"><MiniResult label="稳压最低" value={`${result.regulatorMinimumV} V`}/><MiniResult label="最坏最低" value={`${result.worstCaseMinimumV} V`}/><MiniResult label="裕量" value={`${result.marginV} V`} tone={result.pass?'good':'danger'}/></div>}</>;
}

function CommutationTool(){const [state,setState]=useState<CommutationState>({controlMode:'hall_six_step',speedMinRpm:'',speedMaxRpm:'',angleOffsetDeg:'',torqueFluctuationPct:''});const [result,setResult]=useState<CommutationResult|null>(null);const ready=[state.speedMinRpm,state.speedMaxRpm,state.angleOffsetDeg,state.torqueFluctuationPct].every((value)=>value!=='');return <><div className="grid gap-3 md:grid-cols-2"><label><span className="text-[10px] text-slate-500">控制方式</span><select value={state.controlMode} onChange={(e)=>setState((prev)=>({...prev,controlMode:e.target.value as CommutationState['controlMode']}))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"><option value="hall_six_step">Hall 六步</option><option value="sensorless_bemf">无感 BEMF</option><option value="foc_vector">FOC</option></select></label><NumberField label="最低转速" unit="rpm" value={state.speedMinRpm} onChange={(v)=>setState((prev)=>({...prev,speedMinRpm:v}))}/><NumberField label="最高转速" unit="rpm" value={state.speedMaxRpm} onChange={(v)=>setState((prev)=>({...prev,speedMaxRpm:v}))}/><NumberField label="换相角偏差" unit="°e" value={state.angleOffsetDeg} onChange={(v)=>setState((prev)=>({...prev,angleOffsetDeg:v}))}/><NumberField label="转矩波动" unit="%" value={state.torqueFluctuationPct} onChange={(v)=>setState((prev)=>({...prev,torqueFluctuationPct:v}))}/></div><CalculateButton disabled={!ready} onClick={()=>setResult(calculateCommutationRisk({controlMode:state.controlMode,speedMinRpm:requireNumber(state.speedMinRpm,'最低转速'),speedMaxRpm:requireNumber(state.speedMaxRpm,'最高转速'),angleOffsetDeg:requireNumber(state.angleOffsetDeg,'换相角偏差'),torqueFluctuationPct:requireNumber(state.torqueFluctuationPct,'转矩波动')}))}/>{result&&<div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4"><MiniResult label="基础纹波" value={`${result.baseRipplePct}%`}/><MiniResult label="综合纹波" value={`${result.torqueRipplePct}%`}/><MiniResult label="低速 BEMF" value={result.lowSpeedBEMFRisk?'RISK':'—'} tone={result.lowSpeedBEMFRisk?'warn':'good'}/><MiniResult label="角度风险" value={result.angleRisk.toUpperCase()} tone={result.angleRisk==='critical'?'danger':result.angleRisk==='warning'?'warn':'good'}/></div>}</>}

function SafetyTool(){const [state,setState]=useState<SafetyState>({fhtiBudgetMs:'',watchdogTimeoutMs:'',safeStateTransitionMs:'',currentSenseDeviationPct:''});const [result,setResult]=useState<SafetyChainResult|null>(null);const ready=Object.values(state).every((value)=>value!=='');const fields:Array<[string,string,keyof SafetyState]>=[['FHTI预算','ms','fhtiBudgetMs'],['看门狗检测','ms','watchdogTimeoutMs'],['安全状态切换','ms','safeStateTransitionMs'],['双通道偏差','%','currentSenseDeviationPct']];return <><ToolGrid>{fields.map(([label,unit,key])=><NumberField key={key} label={label} unit={unit} value={state[key]} onChange={(v)=>setState((prev)=>({...prev,[key]:v}))}/>)}</ToolGrid><CalculateButton disabled={!ready} onClick={()=>setResult(calculateSafetyChain({fhtiBudgetMs:requireNumber(state.fhtiBudgetMs,'FHTI预算'),watchdogTimeoutMs:requireNumber(state.watchdogTimeoutMs,'看门狗检测'),safeStateTransitionMs:requireNumber(state.safeStateTransitionMs,'安全状态切换'),currentSenseDeviationPct:requireNumber(state.currentSenseDeviationPct,'双通道偏差')}))}/>{result&&<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2"><MiniResult label="总响应" value={`${result.responseTimeMs} ms`}/><MiniResult label="FHTI裕量" value={`${result.marginMs} ms`} tone={result.timingPass?'good':'danger'}/><MiniResult label="时序" value={result.timingPass?'PASS':'CRITICAL'} tone={result.timingPass?'good':'danger'}/><MiniResult label="电流核验" value={result.currentSenseStatus} tone={result.currentSenseStatus==='COMPLIANT'?'good':result.currentSenseStatus==='WARNING'?'warn':'danger'}/></div>}</>}

function MiniResult({label,value,tone='default'}:{label:string;value:string;tone?:'default'|'good'|'warn'|'danger'}){const cls=tone==='good'?'text-emerald-300':tone==='warn'?'text-amber-300':tone==='danger'?'text-rose-300':'text-slate-100';return <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"><div className="text-[10px] text-slate-500">{label}</div><div className={`mt-1 font-mono text-xs ${cls}`}>{value}</div></div>}
function ToolResult({value}:{value:unknown}){return <pre className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[10px] leading-relaxed text-blue-100">{JSON.stringify(value,null,2)}</pre>}
