import { useMemo, useRef, useState } from 'react';
import {
  buildMarkers,
  buildMeasurementsFromChannels,
  computeMetrics,
  fftMagnitude,
  parseScopeCsv,
  resampleUniform,
  type ParsedScope,
  type ScopeRole,
  type WaveformMarker,
  type WaveformMetrics,
} from '../../core/evidence/waveform.ts';
import {
  addWaveforms,
  loadWaveforms,
  makeStoredWaveform,
  removeWaveform,
  type StoredWaveform,
} from '../../app/evidence/waveformRepository.ts';
import type { DeviceFieldProvenance } from '../../core/evidence/deviceCandidateImport.ts';
import type { EngineeringProject } from '../../core/model/contracts.ts';
import { buildWaveformBackfillPlan, allowMeasuredOverwrite } from '../../core/evidence/waveformBackfill.ts';

type Props = {
  project: EngineeringProject;
  onApplyValues: (
    values: Record<string, number | string>,
    provenance: Record<string, DeviceFieldProvenance>,
    options?: { allowOverwriteMeasured?: boolean },
  ) => void;
};

type WaveformTab = 'overview' | 'channels' | 'spectrum' | 'saved';

const ROLES: Array<{ value: ScopeRole; label: string }> = [
  { value: 'none', label: '不导入' },
  { value: 'vbus', label: 'Vbus 母线' },
  { value: 'vgs', label: 'Vgs 门极' },
  { value: 'vds', label: 'Vds 漏源' },
];

export function WaveformWorkbench({ project, onApplyValues }: Props) {
  const [parsed, setParsed] = useState<ParsedScope | null>(null);
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [roles, setRoles] = useState<ScopeRole[]>([]);
  const [activeChannel, setActiveChannel] = useState(0);
  const [tab, setTab] = useState<WaveformTab>('overview');
  const [message, setMessage] = useState<string | null>(null);
  const [stored, setStored] = useState<StoredWaveform[]>(() => loadWaveforms());
  const [showRaw, setShowRaw] = useState(false);
  const [allowOverwriteMeasured, setAllowOverwriteMeasured] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const metrics = useMemo(
    () => (parsed ? parsed.channels.map((channel) => computeMetrics(parsed.time, channel.samples)) : []),
    [parsed],
  );
  const activeMetrics = metrics[activeChannel];
  const activeChannelData = parsed?.channels[activeChannel];
  const backfillPreview = useMemo(() => {
    if (!parsed) return null;
    const now = new Date().toISOString();
    const measurement = buildMeasurementsFromChannels(parsed, roles, fileName || 'scope-data', now);
    return buildWaveformBackfillPlan(project, measurement);
  }, [parsed, roles, project, fileName]);

  const spectrum = useMemo(() => {
    if (!parsed || !activeChannelData) return null;
    const uniform = resampleUniform(parsed.time, activeChannelData.samples);
    const result = fftMagnitude(uniform.samples, uniform.sampleRateHz);
    return { ...result, sampleCount: uniform.samples.length, resampled: uniform.resampled };
  }, [parsed, activeChannelData]);

  const spectrumPeakIndex = useMemo(() => {
    if (!spectrum || spectrum.magnitude.length === 0) return -1;
    let bestIndex = 0;
    for (let i = 1; i < spectrum.magnitude.length; i += 1) {
      if (spectrum.magnitude[i] > spectrum.magnitude[bestIndex]) bestIndex = i;
    }
    return bestIndex;
  }, [spectrum]);

  const spectrumPeakHz =
    spectrum && spectrumPeakIndex >= 0 ? spectrum.frequencyHz[spectrumPeakIndex] : null;

  const openText = (text: string, name: string) => {
    try {
      const result = parseScopeCsv(text);
      if (!result.ok || !result.data) {
        setParsed(null);
        setFileName(name);
        setMessage(result.error || '波形解析失败');
        return;
      }
      setFileName(name);
      setRawText(text);
      setParsed(result.data);
      setRoles(result.data.channels.map(() => 'none'));
      setActiveChannel(0);
      setTab('overview');
      setMessage(
        `已解析 ${name}：${result.data.rowCount.toLocaleString()} 行、${result.data.channels.length} 个通道。`,
      );
    } catch (error) {
      setParsed(null);
      setMessage(`波形解析失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const openFile = async (file: File) => {
    try {
      openText(await file.text(), file.name);
    } catch {
      setMessage('文件读取失败。');
    }
  };

  const setRole = (index: number, role: ScopeRole) => {
    setRoles((prev) => {
      const next = [...prev];
      if (role !== 'none') {
        for (let i = 0; i < next.length; i += 1) {
          if (i !== index && next[i] === role) next[i] = 'none';
        }
      }
      next[index] = role;
      return next;
    });
  };

  const importMeasurements = () => {
    if (!parsed) return;
    const now = new Date().toISOString();
    const result = buildMeasurementsFromChannels(parsed, roles, fileName, now);
    if (result.count === 0) {
      setMessage('至少为一个通道选择 Vbus / Vgs / Vds 角色。');
      return;
    }

    const basePlan = buildWaveformBackfillPlan(project, result);
    const plan = allowOverwriteMeasured ? allowMeasuredOverwrite(project, basePlan) : basePlan;
    onApplyValues(plan.apply, plan.provenance, { allowOverwriteMeasured });
    const items = result.reports.map((report) =>
      makeStoredWaveform(report, parsed, fileName, now),
    );
    setStored(addWaveforms(items));
    setTab('saved');
    setMessage(
      `已处理 ${result.count} 个通道：写入 ${Object.keys(plan.apply).length} 项；保护 ${plan.protectedKeys.length} 项已有实测。波形证据已保存。${
        plan.warnings.length ? ` 提醒：${plan.warnings.join('；')}` : ''
      }`,
    );
  };

  const restoreSaved = (waveform: StoredWaveform) => {
    setParsed({
      time: waveform.time,
      channels: [{ name: waveform.channelName, samples: waveform.samples }],
      sampleRateHz:
        waveform.time.length > 1
          ? (waveform.time.length - 1) / (waveform.time[waveform.time.length - 1] - waveform.time[0])
          : 0,
      rowCount: waveform.time.length,
    });
    setFileName(waveform.fileName);
    setRoles([waveform.role as ScopeRole]);
    setActiveChannel(0);
    setTab('overview');
    setMessage(`已回看 ${waveform.fileName} · ${waveform.channelName}；这是本地保存的降采样波形证据。`);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl shadow-black/10">
      <div className="border-b border-slate-800 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[.18em] text-blue-300">Measured Evidence</div>
            <h2 className="mt-1 text-lg font-semibold">示波器波形工作台</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              CSV/TXT → 通道识别 → 波形预览 → 20–80% dv/dt、触发前基线、主边沿后振铃 →
              均匀采样 FFT → 按角色回填当前工程实测 Evidence。所有指标均来自当前导入波形。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500"
            >
              导入 CSV / TXT
            </button>
            <button
              onClick={() => setShowRaw((value) => !value)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
            >
              {showRaw ? '收起原始文本' : '查看原始文本'}
            </button>
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[11px] text-slate-400">
              <input type="checkbox" checked={allowOverwriteMeasured} onChange={(event) => setAllowOverwriteMeasured(event.target.checked)} />
              允许新波形覆盖已有 MEASURED
            </label>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void openFile(file);
                event.currentTarget.value = '';
              }}
            />
          </div>
        </div>
        {showRaw && (
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="也可以直接粘贴示波器导出的 CSV / TXT 文本，然后点击“从文本解析”。"
            className="mt-4 min-h-36 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-slate-300 outline-none focus:border-blue-500/50"
          />
        )}
        {showRaw && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => openText(rawText, fileName || 'pasted-scope-data.csv')}
              disabled={!rawText.trim()}
              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 disabled:opacity-40"
            >
              从文本解析
            </button>
          </div>
        )}
      </div>

      <div className="p-5">
        {message && (
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
            {message}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-1">
          {(
            [
              ['overview', '总览'],
              ['channels', '通道映射'],
              ['spectrum', 'FFT / 频谱'],
              ['saved', '已保存证据'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-2 text-xs ${
                tab === id
                  ? 'border border-blue-500/30 bg-blue-600/20 text-blue-300'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!parsed ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {[
              ['① 导入', '支持常见示波器 CSV/TXT，自动识别分隔符并跳过元数据。'],
              ['② 审核', '逐通道查看波形、峰值、基线、dv/dt、振铃和采样可信度。'],
              ['③ 回填', '只把明确映射的 Vbus / Vgs / Vds 写成当前工程的实测证据。'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-sm font-semibold text-slate-100">{title}</div>
                <div className="mt-2 text-xs leading-relaxed text-slate-500">{text}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <ScopeSummary parsed={parsed} metrics={metrics} />

            {tab === 'overview' && activeMetrics && activeChannelData && (
              <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_.85fr]">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <WaveformChart
                    time={parsed.time}
                    samples={activeChannelData.samples}
                    markers={buildMarkers(parsed.time, activeChannelData.samples, activeMetrics)}
                    title={`${activeChannelData.name} · 指标取点`}
                  />
                </div>
                <div className="space-y-3">
                  <MetricsCard
                    metrics={activeMetrics}
                    sampleRate={parsed.sampleRateHz}
                    spectrumPeak={spectrumPeakHz}
                    fftResampled={spectrum?.resampled ?? false}
                  />
                  <RoleActionCard
                    channelName={activeChannelData.name}
                    role={roles[activeChannel] ?? 'none'}
                    metrics={activeMetrics}
                    onSetRole={(role) => setRole(activeChannel, role)}
                  />
                </div>
              </div>
            )}

            {tab === 'channels' && backfillPreview && (
              <section className="mb-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">回填预览</h3>
                    <p className="mt-1 text-[11px] text-slate-500">软件只会写入 canonical 工程字段；已有 MEASURED 默认保护，Vds 峰值仅保存为波形证据。</p>
                  </div>
                  <div className="text-[10px] text-slate-500">待写入 {Object.keys(backfillPreview.apply).length} · 保护 {backfillPreview.protectedKeys.length}</div>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-[11px]">
                    <thead className="text-slate-600"><tr><th className="px-2 py-2">工程字段</th><th className="px-2 py-2">当前/导入</th><th className="px-2 py-2">动作</th><th className="px-2 py-2">说明</th></tr></thead>
                    <tbody>{backfillPreview.candidates.map((candidate) => <tr key={candidate.key} className="border-t border-slate-800"><td className="px-2 py-2"><div className="text-slate-200">{candidate.label}</div><div className="font-mono text-[9px] text-slate-600">{candidate.key}</div></td><td className="px-2 py-2 font-mono text-slate-300">{Number.isFinite(candidate.value) ? `${candidate.value} ${candidate.unit}` : '—'}</td><td className="px-2 py-2"><span className={candidate.action==='APPLY'?'text-emerald-300':candidate.action==='PROTECTED'?'text-amber-300':candidate.action==='SKIP_NON_CANONICAL'?'text-slate-500':'text-rose-300'}>{candidate.action}</span></td><td className="px-2 py-2 text-slate-500">{candidate.reason}</td></tr>)}</tbody>
                  </table>
                </div>
              </section>
            )}

            {tab === 'channels' && (
              <ChannelMappingTable
                parsed={parsed}
                metrics={metrics}
                roles={roles}
                activeChannel={activeChannel}
                onActiveChannel={setActiveChannel}
                onRole={setRole}
              />
            )}

            {tab === 'spectrum' && spectrum && activeChannelData && (
              <SpectrumPanel
                channelName={activeChannelData.name}
                spectrum={spectrum}
                peakIndex={spectrumPeakIndex}
              />
            )}

            {tab === 'saved' && (
              <SavedEvidencePanel
                stored={stored}
                onRestore={restoreSaved}
                onRemove={(id) => setStored(removeWaveform(id))}
              />
            )}

            {tab !== 'saved' && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-[11px] text-slate-500">
                  当前选择：{roles.filter((role) => role !== 'none').join('、') || '尚未映射工程角色'}
                </div>
                <button
                  onClick={importMeasurements}
                  disabled={!roles.some((role) => role !== 'none')}
                  className="rounded-lg bg-emerald-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  将选定通道作为实测证据导入工程
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ScopeSummary({ parsed, metrics }: { parsed: ParsedScope; metrics: WaveformMetrics[] }) {
  const warningCount = metrics.reduce((sum, item) => sum + (item.warnings?.length ?? 0), 0);
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <MiniStat label="采样行数" value={parsed.rowCount.toLocaleString()} />
      <MiniStat label="通道数" value={String(parsed.channels.length)} />
      <MiniStat label="解析采样率" value={parsed.sampleRateHz ? `${(parsed.sampleRateHz / 1e6).toFixed(4)} MS/s` : '未知'} />
      <MiniStat
        label="分析提示"
        value={warningCount ? `${warningCount} 条` : '无'}
        tone={warningCount ? 'amber' : 'green'}
      />
    </div>
  );
}

function ChannelMappingTable({
  parsed,
  metrics,
  roles,
  activeChannel,
  onActiveChannel,
  onRole,
}: {
  parsed: ParsedScope;
  metrics: WaveformMetrics[];
  roles: ScopeRole[];
  activeChannel: number;
  onActiveChannel: (index: number) => void;
  onRole: (index: number, role: ScopeRole) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-500">
            <tr>
              <th className="px-3 py-3">通道</th>
              <th className="px-3 py-3">Peak</th>
              <th className="px-3 py-3">Valley</th>
              <th className="px-3 py-3">P-P</th>
              <th className="px-3 py-3">dv/dt</th>
              <th className="px-3 py-3">基线</th>
              <th className="px-3 py-3">振铃</th>
              <th className="px-3 py-3">工程角色</th>
            </tr>
          </thead>
          <tbody>
            {parsed.channels.map((channel, index) => {
              const metric = metrics[index];
              return (
                <tr
                  key={`${channel.name}-${index}`}
                  className={`border-t border-slate-800 ${
                    activeChannel === index ? 'bg-blue-500/5' : 'bg-transparent'
                  }`}
                >
                  <td className="px-3 py-3">
                    <button onClick={() => onActiveChannel(index)} className="text-left">
                      <div className="font-medium text-slate-100">{channel.name}</div>
                      <div className="mt-1 text-[10px] text-slate-600">{channel.samples.length.toLocaleString()} samples</div>
                    </button>
                  </td>
                  <td className="px-3 py-3 font-mono text-amber-300">{metric.peak}</td>
                  <td className="px-3 py-3 font-mono text-slate-300">{metric.valley}</td>
                  <td className="px-3 py-3 font-mono text-slate-300">{metric.peakToPeak}</td>
                  <td className="px-3 py-3 font-mono text-cyan-300">
                    {metric.dvDtMaxVns}
                    <div className="text-[9px] text-slate-600">
                      {metric.dvDtMethod === 'EDGE_20_80' ? '20–80%' : 'raw slope'}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-300">
                    {metric.baselineLevel === undefined ? '—' : metric.baselineLevel}
                    {metric.baselineStable === false && <div className="text-[9px] text-amber-400">不稳定</div>}
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-300">{metric.ringingHz ?? '—'}</td>
                  <td className="px-3 py-3">
                    <select
                      value={roles[index] ?? 'none'}
                      onChange={(event) => onRole(index, event.target.value as ScopeRole)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-300"
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {metrics.some((metric) => metric.warnings?.length) && (
        <div className="border-t border-slate-800 bg-amber-950/10 p-3 text-[10px] text-amber-200">
          {parsed.channels.flatMap((channel, index) =>
            (metrics[index].warnings ?? []).map((warning) => `${channel.name}：${warning}`),
          ).map((warning) => (
            <div key={warning}>⚠ {warning}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleActionCard({
  channelName,
  role,
  metrics,
  onSetRole,
}: {
  channelName: string;
  role: ScopeRole;
  metrics: WaveformMetrics;
  onSetRole: (role: ScopeRole) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] text-slate-500">当前通道</div>
          <div className="mt-1 text-sm font-semibold text-slate-100">{channelName}</div>
        </div>
        <select
          value={role}
          onChange={(event) => onSetRole(event.target.value as ScopeRole)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-300"
        >
          {ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>
      <div className="mt-3 text-[11px] leading-relaxed text-slate-500">
        {role === 'vbus' && '导入为 vbusMeasuredPeakV，并用触发前基线生成 vbusNominalV。'}
        {role === 'vgs' && '导入为 gateSpikeMeasuredV；这是实测栅极峰值，不是理论估算。'}
        {role === 'vds' && '导入 Vds 峰值与 dv/dt；不会把 Vds 峰值冒充 Vbus 母线峰值。需要母线实测请另外映射 Vbus 通道。'}
        {role === 'none' && '不写入当前工程。'}
      </div>
      {metrics.dvDtMethod !== 'EDGE_20_80' && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-950/10 px-2.5 py-2 text-[10px] text-amber-200">
          当前 dv/dt 回退为相邻点最大斜率，导入后会保留较低置信度提示。
        </div>
      )}
    </div>
  );
}

function MetricsCard({
  metrics,
  sampleRate,
  spectrumPeak,
  fftResampled,
}: {
  metrics: WaveformMetrics;
  sampleRate: number;
  spectrumPeak: number | null;
  fftResampled: boolean;
}) {
  const entries: Array<[string, string]> = [
    ['Peak', `${metrics.peak} V`],
    ['Valley', `${metrics.valley} V`],
    ['P-P', `${metrics.peakToPeak} V`],
    ['dv/dt', `${metrics.dvDtMaxVns} V/ns`],
    ['Baseline', metrics.baselineLevel === undefined ? '—' : `${metrics.baselineLevel} V`],
    ['Ringing', metrics.ringingHz === null ? '未检测到' : `${metrics.ringingHz} Hz`],
  ];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="text-sm font-semibold">工程指标</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-lg border border-slate-800 bg-slate-900 p-2.5">
            <div className="text-[10px] text-slate-500">{key}</div>
            <div className="mt-1 font-mono text-xs text-slate-100">{value}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] leading-relaxed text-slate-500">
        解析采样率：{sampleRate ? `${(sampleRate / 1e6).toFixed(4)} MS/s` : '—'} ·
        dv/dt：{metrics.dvDtMethod === 'EDGE_20_80' ? '20–80% 边沿法' : '相邻点回退'} ·
        FFT：{fftResampled ? '已线性重采样为均匀采样' : '原始均匀采样'} ·
        主峰：{spectrumPeak === null ? '—' : `${spectrumPeak.toPrecision(5)} Hz`}
      </div>
      {metrics.warnings && metrics.warnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-950/10 p-2 text-[10px] text-amber-200">
          {metrics.warnings.map((warning) => <div key={warning}>⚠ {warning}</div>)}
        </div>
      )}
    </div>
  );
}

function SpectrumPanel({
  channelName,
  spectrum,
  peakIndex,
}: {
  channelName: string;
  spectrum: { frequencyHz: number[]; magnitude: number[]; sampleRateHz: number; sampleCount: number; resampled: boolean };
  peakIndex: number;
}) {
  const width = 920;
  const height = 320;
  const pad = { left: 48, right: 20, top: 20, bottom: 38 };
  const maxFreq = spectrum.frequencyHz[spectrum.frequencyHz.length - 1] ?? 0;
  const maxMag = Math.max(...spectrum.magnitude, 1e-12);
  const points = spectrum.frequencyHz.map((freq, index) => {
    const x = pad.left + (maxFreq > 0 ? (freq / maxFreq) * (width - pad.left - pad.right) : 0);
    const y = height - pad.bottom - (spectrum.magnitude[index] / maxMag) * (height - pad.top - pad.bottom);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const peakFreq = peakIndex >= 0 ? spectrum.frequencyHz[peakIndex] : null;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">FFT 频谱 · {channelName}</div>
            <div className="mt-1 text-[10px] text-slate-500">
              N={spectrum.sampleCount.toLocaleString()} · Fs={(spectrum.sampleRateHz / 1e6).toFixed(4)} MS/s · {spectrum.resampled ? '线性重采样后' : '原始均匀采样'}
            </div>
          </div>
          <div className="font-mono text-xs text-cyan-300">
            主峰 {peakFreq === null ? '—' : `${peakFreq.toPrecision(5)} Hz`}
          </div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
          <rect x="0" y="0" width={width} height={height} rx="10" fill="rgba(2,6,23,.55)" stroke="rgba(51,65,85,.8)" />
          <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="rgba(100,116,139,.55)" />
          <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} stroke="rgba(100,116,139,.55)" />
          <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} className="text-cyan-300" />
          {peakFreq !== null && maxFreq > 0 && (
            <line
              x1={pad.left + (peakFreq / maxFreq) * (width - pad.left - pad.right)}
              x2={pad.left + (peakFreq / maxFreq) * (width - pad.left - pad.right)}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="currentColor"
              strokeDasharray="5 5"
              className="text-amber-300"
            />
          )}
        </svg>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-sm font-semibold">FFT 解释</div>
          <div className="mt-2 text-xs leading-relaxed text-slate-500">
            FFT 使用当前通道的真实时间轴。时间戳不均匀时，先按时间差中位数进行线性重采样，再执行纯函数 FFT；不会调用 Web Audio 的 AnalyserNode。
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-sm font-semibold">频率分辨率</div>
          <div className="mt-2 font-mono text-sm text-slate-100">
            {spectrum.frequencyHz.length > 1 ? `${(spectrum.frequencyHz[1] - spectrum.frequencyHz[0]).toPrecision(5)} Hz` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

function SavedEvidencePanel({
  stored,
  onRestore,
  onRemove,
}: {
  stored: StoredWaveform[];
  onRestore: (waveform: StoredWaveform) => void;
  onRemove: (id: string) => void;
}) {
  if (stored.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center text-xs text-slate-500">还没有保存的波形证据。</div>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {stored.slice().reverse().map((waveform) => (
        <div key={waveform.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-100">{waveform.fileName}</div>
              <div className="mt-1 text-xs text-slate-400">{waveform.channelName} · {waveform.role}</div>
            </div>
            <div className="text-[9px] font-mono text-slate-600">{waveform.id.slice(0, 18)}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <MiniEvidenceValue label="Peak" value={`${waveform.metrics.peak} V`} />
            <MiniEvidenceValue label="dv/dt" value={`${waveform.metrics.dvDtMaxVns} V/ns`} />
            <MiniEvidenceValue label="Baseline" value={waveform.metrics.baselineLevel === undefined ? '—' : `${waveform.metrics.baselineLevel} V`} />
            <MiniEvidenceValue label="Ringing" value={waveform.metrics.ringingHz === null ? '—' : `${waveform.metrics.ringingHz} Hz`} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => onRestore(waveform)} className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-[11px] text-blue-300">回看</button>
            <button onClick={() => onRemove(waveform.id)} className="rounded-lg border border-red-500/20 px-2.5 py-1.5 text-[11px] text-red-300">删除</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'amber' | 'green' }) {
  const valueClass = tone === 'amber' ? 'text-amber-300' : tone === 'green' ? 'text-emerald-300' : 'text-slate-100';
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-sm ${valueClass}`}>{value}</div>
    </div>
  );
}

function MiniEvidenceValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-2">
      <div className="text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-slate-200">{value}</div>
    </div>
  );
}

function WaveformChart({
  time,
  samples,
  markers,
  title,
}: {
  time: number[];
  samples: number[];
  markers: WaveformMarker[];
  title: string;
}) {
  if (time.length === 0 || samples.length === 0) return null;
  const width = 1000;
  const height = 390;
  const pad = { left: 48, right: 18, top: 24, bottom: 42 };
  const minT = time[0];
  const maxT = time[time.length - 1];
  const minV = Math.min(...samples);
  const maxV = Math.max(...samples);
  const spanT = maxT - minT || 1;
  const spanV = maxV - minV || 1;
  const ds = downsampleForView(time, samples, 1800);
  const points = ds.time.map((t, index) => {
    const x = pad.left + ((t - minT) / spanT) * (width - pad.left - pad.right);
    const y = height - pad.bottom - ((ds.samples[index] - minV) / spanV) * (height - pad.top - pad.bottom);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

  const markerNodes = markers.map((marker, index) => {
    const x = pad.left + ((marker.t - minT) / spanT) * (width - pad.left - pad.right);
    const y = height - pad.bottom - ((marker.v - minV) / spanV) * (height - pad.top - pad.bottom);
    const isVertical = marker.kind === 'baseline';
    return (
      <g key={`${marker.kind}-${marker.t}-${index}`}>
        {isVertical ? (
          <line x1={x} x2={x} y1={pad.top} y2={height - pad.bottom} stroke="currentColor" strokeDasharray="4 4" className="text-slate-600" />
        ) : (
          <circle cx={x} cy={y} r="4" fill="currentColor" className={marker.kind === 'ring' ? 'text-purple-300' : 'text-amber-300'} />
        )}
      </g>
    );
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[10px] text-slate-600">视图抽样：{ds.samples.length.toLocaleString()} 点</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <rect x="0" y="0" width={width} height={height} rx="10" fill="rgba(2,6,23,.55)" stroke="rgba(51,65,85,.8)" />
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = pad.top + ratio * (height - pad.top - pad.bottom);
          const value = maxV - ratio * spanV;
          return (
            <g key={ratio}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="rgba(51,65,85,.55)" strokeDasharray="3 4" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="10">{value.toFixed(2)}</text>
            </g>
          );
        })}
        <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="rgba(100,116,139,.55)" />
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} stroke="rgba(100,116,139,.55)" />
        <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} className="text-blue-300" />
        {markerNodes}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        <span>{minT.toExponential(4)} s</span>
        <span>{minV.toFixed(3)} … {maxV.toFixed(3)} V</span>
        <span>{maxT.toExponential(4)} s</span>
      </div>
    </div>
  );
}

function downsampleForView(time: number[], samples: number[], maxPoints: number): { time: number[]; samples: number[] } {
  if (samples.length <= maxPoints) return { time, samples };
  const bucketCount = Math.max(1, Math.floor(maxPoints / 2));
  const outTime: number[] = [];
  const outSamples: number[] = [];
  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const lo = Math.floor((bucket * samples.length) / bucketCount);
    const hi = Math.max(lo + 1, Math.floor(((bucket + 1) * samples.length) / bucketCount));
    let minIndex = lo;
    let maxIndex = lo;
    for (let index = lo; index < hi; index += 1) {
      if (samples[index] < samples[minIndex]) minIndex = index;
      if (samples[index] > samples[maxIndex]) maxIndex = index;
    }
    const a = Math.min(minIndex, maxIndex);
    const b = Math.max(minIndex, maxIndex);
    outTime.push(time[a]);
    outSamples.push(samples[a]);
    if (b !== a) {
      outTime.push(time[b]);
      outSamples.push(samples[b]);
    }
  }
  return { time: outTime, samples: outSamples };
}
