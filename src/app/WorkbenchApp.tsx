import { useEffect, useMemo, useState } from 'react';
import type { EngineeringProject, Quantity } from '../core/model/contracts.ts';
import { analyze } from './analyze.ts';
import { loadActiveProject, saveActiveProject } from './projectRepository.ts';
import { INPUT_GROUPS } from '../ui/inputCatalog.ts';
import { EMC_INPUT_GROUPS } from '../ui/emcCatalog.ts';
import { navigate, useNavigation, type Screen } from '../ui/navigation.ts';
import { SHELL_CONTENT } from '../content/shell.ts';
import { HomeScreen } from '../ui/screens/HomeScreen.tsx';
import { InputScreen } from '../ui/screens/InputScreen.tsx';
import { PhysicsScreen } from '../ui/screens/PhysicsScreen.tsx';
import { PlanScreen } from '../ui/screens/PlanScreen.tsx';
import { DeliverScreen } from '../ui/screens/DeliverScreen.tsx';
import { ScreenErrorBoundary } from '../ui/components/ScreenErrorBoundary.tsx';

function createEmptyProject(): EngineeringProject {
  const quantities: Record<string, Quantity> = {};
  for (const group of [...INPUT_GROUPS, ...EMC_INPUT_GROUPS]) for (const field of group.fields) {
    quantities[field.key] = { status: 'missing', unit: field.unit, need: `需要提供：${field.label}` };
  }
  return { meta: { projectId: 'live-project', projectName: '', domain: 'BLDC', phase: 'EVT', at: 'live' }, issue: { title: '', phenomenon: '', requirement: '', testCondition: '', quantities } };
}

export default function WorkbenchApp() {
  const route = useNavigation();
  const [project, setProject] = useState<EngineeringProject>(() => loadActiveProject(createEmptyProject()));
  useEffect(() => { saveActiveProject(project); }, [project]);
  const result = useMemo(() => analyze(project), [project]);

  const screens: Record<Screen, React.ReactNode> = {
    home: <HomeScreen result={result} project={project} />, 
    input: <InputScreen project={project} onProjectChange={setProject} />,
    physics: <PhysicsScreen result={result} project={project} />,
    plan: <PlanScreen result={result} />,
    deliver: <DeliverScreen result={result} project={project} onProjectChange={(next)=>setProject(next)} />,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3">
          <div>
            <div className="text-sm font-semibold tracking-wide text-slate-100">{SHELL_CONTENT.productName}</div>
            <div className="text-[11px] text-slate-500">{SHELL_CONTENT.positioning}</div>
          </div>
          <nav className="flex flex-wrap gap-1">
            {(Object.entries(SHELL_CONTENT.screens) as Array<[Screen,string]>).map(([screen, label]) => (
              <button key={screen} onClick={() => navigate({ screen, sub: screen === 'home' ? undefined : screen === 'input' ? 'parameters' : screen === 'physics' ? 'patterns' : screen === 'plan' ? 'options' : 'package' })} className={`rounded-lg px-3 py-2 text-xs transition ${route.screen === screen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}>{label}</button>
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-900 bg-slate-900/70 px-4 py-2 text-center text-[11px] text-slate-500">{SHELL_CONTENT.factBoundary}</div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <ScreenErrorBoundary key={`${route.screen}:${route.sub ?? ''}`} routeKey={`${route.screen}:${route.sub ?? ''}`}>
          {screens[route.screen]}
        </ScreenErrorBoundary>
      </main>
    </div>
  );
}
