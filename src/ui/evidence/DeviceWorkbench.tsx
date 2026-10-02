import { useMemo, useRef, useState } from 'react';
import type { EngineeringProject } from '../../core/model/contracts.ts';
import { BLDC_FIELDS } from '../../core/derive/bldc.ts';
import { buildDeviceCandidateImportPayload, getAutoImportCandidateIds, type DeviceParameterCandidate, type DeviceFieldProvenance } from '../../core/evidence/deviceCandidateImport.ts';
import { buildDeviceParameterCandidates } from '../../core/evidence/deviceParameterCandidates.ts';
import { compareDevices, type DeviceComparison } from '../../core/evidence/deviceCompare.ts';
import { getAllEngineeringMeasurementFields } from '../../core/evidence/deviceFields.ts';
import { applyCandidateDecisions, deleteDevice, importDeviceFromJson, loadDevices, saveDevice, updateDeviceCandidateDecision, type DeviceEntry } from '../../app/evidence/deviceRepository.ts';
import { DIRECT_MAPPABLE_TARGET_KEYS, CONFIRM_REQUIRED_TARGET_KEYS, DEVICE_PARAM_PROMPT, MOSFET_TEMPLATE_JSON } from '../../content/deviceTemplate.ts';

function valueMap(project: EngineeringProject): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const [key, quantity] of Object.entries(project.issue.quantities)) if (quantity.status === 'ok') out[key] = quantity.value;
  return out;
}
function provenanceMap(project: EngineeringProject): Record<string, DeviceFieldProvenance> {
  const out: Record<string, DeviceFieldProvenance> = {};
  for (const [key, quantity] of Object.entries(project.issue.quantities)) if (quantity.status === 'ok') {
    out[key] = { source: quantity.evidence, sourceLabel: quantity.sourceLabel, evidenceId: quantity.evidenceId, enteredAt: quantity.enteredAt };
  }
  return out;
}

interface Props {
  project: EngineeringProject;
  onApplyValues: (values: Record<string, number | string>, provenance: Record<string, DeviceFieldProvenance>) => void;
  onDeviceSelect: (deviceId: string | undefined) => void;
}

type Tab = 'import' | 'current' | 'candidates' | 'library' | 'compare';

export function DeviceWorkbench({ project, onApplyValues, onDeviceSelect }: Props) {
  const [tab, setTab] = useState<Tab>('current');
  const [devices, setDevices] = useState<DeviceEntry[]>(() => loadDevices());
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(project.meta.selectedDeviceId);
  const [jsonText, setJsonText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState<string>('');
  const [compareRightId, setCompareRightId] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const currentDevice = devices.find((d) => d.id === selectedDeviceId);
  const fieldKeys = useMemo(() => new Set(BLDC_FIELDS.map((f) => f.key)), []);
  const candidates = useMemo(() => {
    if (!currentDevice) return [];
    const base = buildDeviceParameterCandidates(currentDevice, fieldKeys);
    return applyCandidateDecisions(base, currentDevice.candidateDecisions, fieldKeys);
  }, [currentDevice, fieldKeys, devices]);
  const candidateGroups = useMemo(() => ({
    direct: candidates.filter((c) => c.candidateKind === 'DIRECT_SCALAR'),
    confirm: candidates.filter((c) => c.candidateKind === 'DERIVED_OR_ESTIMATE'),
    curve: candidates.filter((c) => c.candidateKind === 'CURVE_ONLY'),
    unmapped: candidates.filter((c) => c.candidateKind === 'NO_MAPPING' || c.mappingStatus !== 'mapped'),
  }), [candidates]);

  const applyImport = (payload: { values: Record<string, number | string>; provenance: Record<string, DeviceFieldProvenance>; importedIds: string[]; conflicts: Array<{ label: string }>; overwritten: Array<{ label: string }>; duplicateTargets: Array<unknown>; invalidCandidates: string[]; superseded: Array<unknown> }) => {
    if (Object.keys(payload.values).length) onApplyValues(payload.values, payload.provenance);
    setMessage(`已导入 ${payload.importedIds.length} 项${payload.overwritten.length ? `；覆盖 ${payload.overwritten.length} 项非实测旧值` : ''}${payload.conflicts.length ? `；保护 ${payload.conflicts.length} 项实测/导入值` : ''}${payload.invalidCandidates.length ? `；拒绝 ${payload.invalidCandidates.length} 项无效候选` : ''}`);
    setSelectedCandidates([]);
  };

  const handleImportJson = () => {
    const result = importDeviceFromJson(jsonText);
    if (!result.device) { setMessage(result.error || '导入失败'); setWarnings([]); return; }
    const saved = saveDevice(result.device);
    setDevices(saved);
    setSelectedDeviceId(result.device.id);
    onDeviceSelect(result.device.id);
    setWarnings(result.warnings || []);
    setMessage(`已保存器件 ${result.device.partNumber}`);
    setTab('current');
    const directCandidates = buildDeviceParameterCandidates(result.device, fieldKeys);
    const autoIds = getAutoImportCandidateIds(directCandidates, valueMap(project), provenanceMap(project));
    if (autoIds.size) {
      const payload = buildDeviceCandidateImportPayload(directCandidates, autoIds, valueMap(project), result.device.partNumber, new Date().toISOString(), new Set(), provenanceMap(project));
      applyImport(payload);
    }
    setJsonText('');
  };
  const chooseFile = async (file: File) => {
    try { setJsonText(await file.text()); setTab('import'); setMessage(`已读取 ${file.name}，确认后再入库。`); }
    catch { setMessage('无法读取文件。'); }
  };
  const selectDevice = (device: DeviceEntry) => {
    setSelectedDeviceId(device.id);
    onDeviceSelect(device.id);
    setSelectedCandidates([]);
    setTab('current');
    const currentCandidates = applyCandidateDecisions(buildDeviceParameterCandidates(device, fieldKeys), device.candidateDecisions, fieldKeys);
    const autoIds = getAutoImportCandidateIds(currentCandidates, valueMap(project), provenanceMap(project));
    if (autoIds.size) {
      const payload = buildDeviceCandidateImportPayload(currentCandidates, autoIds, valueMap(project), device.partNumber, new Date().toISOString(), new Set(), provenanceMap(project), undefined, forceOverwrite);
      applyImport(payload);
    } else setMessage(`已设为当前器件：${device.partNumber}；没有新的可安全直导参数。`);
  };
  const importSelected = () => {
    if (!currentDevice) return;
    const payload = buildDeviceCandidateImportPayload(candidates, new Set(selectedCandidates), valueMap(project), currentDevice.partNumber, new Date().toISOString(), new Set(), provenanceMap(project), undefined, forceOverwrite);
    applyImport(payload);
  };
  const comparison = useMemo<DeviceComparison | null>(() => {
    const left = devices.find((d) => d.id === compareLeftId);
    const right = devices.find((d) => d.id === compareRightId);
    if (!left || !right || left.id === right.id) return null;
    return compareDevices(left, right, fieldKeys);
  }, [devices, compareLeftId, compareRightId, fieldKeys]);

  const confirmOne = (candidate: DeviceParameterCandidate) => {
    if (!currentDevice) return;
    const mapped = candidate.targetKey ? candidate : { ...candidate, targetKey: undefined };
    if (!mapped.targetKey) { setMessage('该候选没有安全工程字段映射，不能直接导入；请先映射。'); return; }
    const next = updateDeviceCandidateDecision(currentDevice.id, candidate.rawPath, 'imported', mapped.targetKey);
    setDevices(next);
    const refreshed = next.find((d) => d.id === currentDevice.id);
    if (!refreshed) return;
    const updatedCandidates = applyCandidateDecisions(buildDeviceParameterCandidates(refreshed, fieldKeys), refreshed.candidateDecisions, fieldKeys);
    const payload = buildDeviceCandidateImportPayload(updatedCandidates, new Set([candidate.id]), valueMap(project), refreshed.partNumber, new Date().toISOString(), new Set([candidate.id]), provenanceMap(project), undefined, forceOverwrite);
    applyImport(payload);
  };

  return <section className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl shadow-black/10">
    <div className="border-b border-slate-800 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">器件与规格书工作台</h2><p className="mt-1 text-xs text-slate-400">把 datasheet 变成可审计候选参数；直接值可安全导入，曲线/派生值保持“需确认”，实测值默认受保护。</p></div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">直值自动导入 {DIRECT_MAPPABLE_TARGET_KEYS.length}</span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-300">需确认 {CONFIRM_REQUIRED_TARGET_KEYS.length}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1">
        {([['import','规格书导入'],['current','当前器件'],['candidates','参数候选'],['library','器件库'],['compare','器件对比']] as const).map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-3 py-2 text-xs ${tab === id ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800'}`}>{label}</button>)}
      </div>
    </div>

    <div className="p-5">
      {message && <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">{message}</div>}
      {warnings.length > 0 && <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-3 text-xs text-amber-200"><div className="font-semibold">器件资料完整性提醒</div>{warnings.map((w) => <div key={w} className="mt-1">· {w}</div>)}</div>}

      {tab === 'import' && <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-sm font-semibold">规格书 → 标准 JSON</div><div className="mt-1 text-[11px] text-slate-500">支持 AI/OCR 输出 JSON 文件或直接粘贴；解析后保留原始 raw，不丢曲线和 conditions。</div></div><button onClick={() => fileRef.current?.click()} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs hover:bg-slate-800">读取 JSON 文件</button><input ref={fileRef} type="file" accept=".json,.txt,application/json,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void chooseFile(f); e.currentTarget.value=''; }} /></div>
          <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} className="mt-3 min-h-[360px] w-full rounded-xl border border-slate-700 bg-black/30 p-3 font-mono text-[11px] text-slate-200 outline-none focus:border-blue-500/50" placeholder="粘贴器件 JSON……" />
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={handleImportJson} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500">解析并保存到器件库</button><button onClick={() => setJsonText('')} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400">清空</button></div>
        </div>
        <div className="space-y-4">
          <PromptCard title="给免费 AI 的参数提取指令" content={DEVICE_PARAM_PROMPT} />
          <PromptCard title="JSON 字段模板" content={MOSFET_TEMPLATE_JSON} />
        </div>
      </div>}

      {tab === 'current' && <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-[11px] uppercase tracking-wider text-slate-500">当前绑定器件</div>{currentDevice ? <><div className="mt-2 text-xl font-semibold">{currentDevice.partNumber}</div><div className="mt-1 text-xs text-slate-400">{currentDevice.manufacturer || '未填厂家'} · {currentDevice.package || '未填封装'} · {currentDevice.aecqGrade || 'AEC-Q 信息待补'}</div><div className="mt-4 grid grid-cols-2 gap-2 text-xs">{[['候选', candidates.length],['直值', candidateGroups.direct.length],['需确认', candidateGroups.confirm.length],['未映射', candidateGroups.unmapped.length]].map(([k,v]) => <div key={String(k)} className="rounded-lg border border-slate-800 bg-slate-900 p-3"><div className="text-slate-500">{k}</div><div className="mt-1 text-base font-semibold">{v}</div></div>)}</div><button onClick={() => setTab('candidates')} className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">查看候选并映射 →</button></> : <div className="mt-3 rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-xs text-slate-500">还没有当前器件。先导入一份规格书 JSON。</div>}</div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold">当前工程里的器件参数证据</div><div className="mt-1 text-[11px] text-slate-500">任何 datasheet 自动带入都会以 DATASHEET/DERIVED 写入，实测/导入值不会被默认覆盖。</div></div><div className="text-xs text-slate-500">{Object.values(project.issue.quantities).filter((q) => q.status === 'ok').length} 项已填</div></div><div className="mt-3 max-h-80 space-y-1.5 overflow-auto pr-1">{BLDC_FIELDS.filter((f) => project.issue.quantities[f.key]?.status === 'ok').map((field) => { const q = project.issue.quantities[field.key]; return <div key={field.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"><div className="min-w-0"><div className="text-xs text-slate-200">{field.label}</div><div className="truncate text-[10px] font-mono text-slate-500">{field.key}</div></div><div className="text-right"><div className="font-mono text-xs text-slate-100">{q.status === 'ok' ? q.value : '—'} {q.status === 'ok' ? q.unit : ''}</div><div className="text-[10px] text-slate-500">{q.status === 'ok' ? q.evidence : ''}</div></div></div> })}</div></div>
      </div>}

      {tab === 'candidates' && <CandidatePanel candidates={candidates} currentDevice={currentDevice} selectedCandidates={selectedCandidates} setSelectedCandidates={setSelectedCandidates} showUnmapped={showUnmapped} setShowUnmapped={setShowUnmapped} forceOverwrite={forceOverwrite} setForceOverwrite={setForceOverwrite} onImport={importSelected} onConfirm={confirmOne} onMap={(c,key) => { if (!currentDevice) return; const next = updateDeviceCandidateDecision(currentDevice.id, c.rawPath, 'mapped_to', key); setDevices(next); setMessage(`${c.label} 已映射至 ${key}`); }} />}

      {tab === 'library' && <div className="grid gap-3 md:grid-cols-2">{devices.length === 0 ? <div className="md:col-span-2 rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center text-xs text-slate-500">器件库为空。先从“规格书导入”开始。</div> : devices.map((device) => <div key={device.id} className={`rounded-xl border p-4 ${device.id === selectedDeviceId ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-800 bg-slate-950/40'}`}><div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{device.partNumber}</div><div className="mt-1 text-xs text-slate-400">{device.manufacturer || '厂家待补'} · {device.deviceType} · {device.package || '封装待补'}</div><div className="mt-2 text-[10px] text-slate-500">更新：{new Date(device.updatedAt).toLocaleString()}</div></div><div className="flex gap-1"><button onClick={() => selectDevice(device)} className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-[11px] text-blue-300">设为当前</button><button onClick={() => { setDevices(deleteDevice(device.id)); if (selectedDeviceId === device.id) { setSelectedDeviceId(undefined); onDeviceSelect(undefined); } }} className="rounded-lg border border-red-500/20 px-2.5 py-1.5 text-[11px] text-red-300">删除</button></div></div></div>)}</div>}

      {tab === 'compare' && <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-wider text-slate-500">左侧器件</div><select value={compareLeftId} onChange={(e)=>setCompareLeftId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs"><option value="">选择器件…</option>{devices.map((d)=><option key={d.id} value={d.id}>{d.partNumber} · {d.manufacturer || '厂家待补'}</option>)}</select></label>
          <label className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-wider text-slate-500">右侧器件</div><select value={compareRightId} onChange={(e)=>setCompareRightId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs"><option value="">选择器件…</option>{devices.map((d)=><option key={d.id} value={d.id}>{d.partNumber} · {d.manufacturer || '厂家待补'}</option>)}</select></label>
        </div>
        {!comparison ? <div className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-xs text-slate-500">选择两个不同器件后，这里比较它们当前可映射的规格参数。这里只显示证据与差异，不自动宣布“替代可行”。</div> : <div className="overflow-hidden rounded-xl border border-slate-800"><div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-950/80 text-slate-500"><tr><th className="px-3 py-3">工程字段</th><th className="px-3 py-3">{comparison.left.partNumber}</th><th className="px-3 py-3">{comparison.right.partNumber}</th><th className="px-3 py-3">状态</th></tr></thead><tbody>{comparison.rows.map((row)=><tr key={row.targetKey} className="border-t border-slate-800"><td className="px-3 py-3"><div className="text-slate-200">{row.label}</div><div className="font-mono text-[9px] text-slate-600">{row.targetKey} · {row.unit || '—'}</div></td><td className="px-3 py-3"><CompareValues values={row.left}/></td><td className="px-3 py-3"><CompareValues values={row.right}/></td><td className="px-3 py-3"><span className={row.status==='DIFFER'?'text-amber-300':row.status==='MATCH'?'text-emerald-300':'text-slate-400'}>{row.status}</span></td></tr>)}</tbody></table></div></div>}
      </div>}
    </div>
  </section>;
}

function CompareValues({ values }: { values: Array<{ value: number | string; source: string; confidence: number; sourceRef?: string }> }) {
  if (!values.length) return <span className="text-slate-600">—</span>;
  return <div className="space-y-1">{values.map((item, index)=><div key={`${String(item.value)}-${index}`}><div className="font-mono text-slate-100">{item.value}</div><div className="text-[9px] text-slate-500">{item.source} · {Math.round(item.confidence*100)}%{item.sourceRef ? ` · ${item.sourceRef}` : ''}</div></div>)}</div>;
}

function PromptCard({ title, content }: { title: string; content: string }) {
  const copy = async () => { try { await navigator.clipboard.writeText(content); } catch { /* clipboard permission is optional */ } };
  return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center justify-between gap-2"><div className="text-sm font-semibold">{title}</div><button onClick={copy} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-slate-800">复制</button></div><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-black/20 p-3 font-mono text-[10px] leading-relaxed text-slate-400">{content}</pre></div>;
}

function CandidatePanel({ candidates, currentDevice, selectedCandidates, setSelectedCandidates, showUnmapped, setShowUnmapped, forceOverwrite, setForceOverwrite, onImport, onConfirm, onMap }: { candidates: DeviceParameterCandidate[]; currentDevice?: DeviceEntry; selectedCandidates: string[]; setSelectedCandidates: (ids: string[]) => void; showUnmapped: boolean; setShowUnmapped: (v:boolean)=>void; forceOverwrite:boolean; setForceOverwrite:(v:boolean)=>void; onImport:()=>void; onConfirm:(c:DeviceParameterCandidate)=>void; onMap:(c:DeviceParameterCandidate,key:string)=>void; }) {
  if (!currentDevice) return <div className="rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center text-xs text-slate-500">先选择当前器件。</div>;
  const fieldOptions = getAllEngineeringMeasurementFields();
  const grouped = [
    { title: '可安全直导', note: 'datasheet 直接单值 + 高置信度；仍受实测值保护。', list: candidates.filter((c) => c.candidateKind === 'DIRECT_SCALAR') },
    { title: '需工程确认', note: '曲线选点 / DERIVED / estimates；必须明确确认后才能写入。', list: candidates.filter((c) => c.candidateKind === 'DERIVED_OR_ESTIMATE') },
    ...(showUnmapped ? [{ title: '未映射 / 资料保留', note: '不能安全投影为当前工程单值，仍保留在器件原始资料。', list: candidates.filter((c) => c.candidateKind === 'NO_MAPPING' || c.mappingStatus !== 'mapped') }] : []),
  ];
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-xs text-slate-400">器件：<span className="font-semibold text-slate-100">{currentDevice.partNumber}</span> · 当前候选 {candidates.length} 项</div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-[11px] text-slate-400"><input type="checkbox" checked={forceOverwrite} onChange={(e) => setForceOverwrite(e.target.checked)} />允许覆盖非实测已有值</label><label className="flex items-center gap-2 text-[11px] text-slate-400"><input type="checkbox" checked={showUnmapped} onChange={(e) => setShowUnmapped(e.target.checked)} />显示未映射资料</label><button onClick={onImport} disabled={selectedCandidates.length===0} className="rounded-lg bg-blue-600 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">导入选中 {selectedCandidates.length}</button></div></div>
    {grouped.map((group) => <div key={group.title} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><div className="text-sm font-semibold">{group.title} <span className="ml-1 text-xs text-slate-500">{group.list.length}</span></div><div className="mt-1 text-[11px] text-slate-500">{group.note}</div><div className="mt-3 space-y-2">{group.list.length===0 ? <div className="rounded-lg border border-dashed border-slate-800 px-3 py-5 text-center text-[11px] text-slate-600">暂无</div> : group.list.map((c) => <div key={c.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="flex gap-3"><input type="checkbox" className="mt-1" checked={selectedCandidates.includes(c.id)} onChange={(e)=> setSelectedCandidates(e.target.checked ? [...selectedCandidates,c.id] : selectedCandidates.filter(id=>id!==c.id))} disabled={!c.importable && c.candidateKind !== 'DERIVED_OR_ESTIMATE'} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-200">{c.label}</span><span className="rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] text-slate-400">{c.sourceType}</span><span className="rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] text-slate-400">{Math.round(c.confidence*100)}%</span></div><div className="mt-1 font-mono text-sm text-blue-200">{typeof c.value === 'number' ? c.value : c.value} {c.unit || ''}</div><div className="mt-1 text-[10px] text-slate-500">来源：{c.sourceRef || c.evidence || '未标注'}{c.note ? ` · ${c.note}` : ''}</div><div className="mt-3 flex flex-wrap items-center gap-2"><select value={c.targetKey || ''} onChange={(e)=> e.target.value && onMap(c,e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-300"><option value="">工程字段映射…</option>{fieldOptions.map((f)=><option key={f.key} value={f.key}>{f.label} · {f.unit}</option>)}</select>{c.candidateKind==='DERIVED_OR_ESTIMATE' && c.mappingStatus==='mapped' && <button onClick={()=>onConfirm(c)} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300">确认导入</button>}</div></div></div></div>)}</div></div>)}
  </div>;
}
