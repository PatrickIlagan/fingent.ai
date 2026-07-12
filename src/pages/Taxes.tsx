import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calculator, Download, ExternalLink, FileText, Info } from 'lucide-react';
import { useStore } from '../store/useStore';

type Profile = 'employment' | 'self-employed' | 'mixed';
type Scenario = {
  profile: Profile;
  compensation: string;
  nonTaxable: string;
  statutory: string;
  businessGross: string;
  method: 'itemized' | 'osd';
  expenses: string;
  eightPercent: boolean;
  businessTax: 'percentage' | 'vat';
  inputVat: string;
  withholding: string;
  credits: string;
};

const initial: Scenario = {
  profile: 'employment', compensation: '', nonTaxable: '', statutory: '',
  businessGross: '', method: 'itemized', expenses: '', eightPercent: false,
  businessTax: 'percentage', inputVat: '', withholding: '', credits: ''
};

const n = (value: string) => Math.max(0, Number(value) || 0);
const php = (value: number) => '₱' + Math.round(value).toLocaleString('en-PH');

function graduatedTax(income: number) {
  if (income <= 250000) return 0;
  if (income <= 400000) return (income - 250000) * .15;
  if (income <= 800000) return 22500 + (income - 400000) * .20;
  if (income <= 2000000) return 102500 + (income - 800000) * .25;
  if (income <= 8000000) return 402500 + (income - 2000000) * .30;
  return 2202500 + (income - 8000000) * .35;
}

function MoneyField({ label, value, setValue, help }: { label: string, value: string, setValue: (value: string) => void, help: string }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₱</span><input type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-8 pr-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-violet-500" /></div><span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{help}</span></label>;
}

export function Taxes() {
  const { themeMode } = useStore();
  const isAdvanced = themeMode === 'advanced';
  const [scenario, setScenario] = useState<Scenario>(() => {
    try { return { ...initial, ...JSON.parse(localStorage.getItem('fingent-ph-tax-scenario') || '{}') }; }
    catch { return initial; }
  });
  const set = (changes: Partial<Scenario>) => setScenario((current) => ({ ...current, ...changes }));

  useEffect(() => { localStorage.setItem('fingent-ph-tax-scenario', JSON.stringify(scenario)); }, [scenario]);

  const result = useMemo(() => {
    const compensation = n(scenario.compensation);
    const taxableComp = Math.max(0, compensation - n(scenario.nonTaxable) - n(scenario.statutory));
    const gross = n(scenario.businessGross);
    const business = scenario.profile !== 'employment';
    const mixed = scenario.profile === 'mixed';
    const eligible8 = business && gross <= 3000000;
    const deduction = scenario.method === 'osd' ? gross * .40 : n(scenario.expenses);
    const netBusiness = Math.max(0, gross - deduction);
    let incomeTax = 0;
    let businessTax = 0;
    let businessTaxName = '';

    if (scenario.profile === 'employment') incomeTax = graduatedTax(taxableComp);
    else if (scenario.eightPercent && eligible8) {
      incomeTax = (mixed ? graduatedTax(taxableComp) : 0) + (mixed ? gross : Math.max(0, gross - 250000)) * .08;
      businessTaxName = '8% business income tax';
    } else {
      incomeTax = graduatedTax(taxableComp + netBusiness);
      if (scenario.businessTax === 'percentage') {
        businessTax = gross * .03;
        businessTaxName = '3% percentage tax';
      } else {
        businessTax = Math.max(0, gross * .12 - n(scenario.inputVat));
        businessTaxName = 'VAT payable';
      }
    }

    const beforeCredits = incomeTax + businessTax;
    const credits = n(scenario.withholding) + n(scenario.credits);
    return {
      taxableComp, gross, deduction, netBusiness, eligible8, incomeTax, businessTax,
      businessTaxName, beforeCredits, credits, payable: Math.max(0, beforeCredits - credits),
      overpayment: Math.max(0, credits - beforeCredits), effective: compensation + gross ? beforeCredits / (compensation + gross) * 100 : 0
    };
  }, [scenario]);

  const card = isAdvanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const active = isAdvanced ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white';
  const inactive = isAdvanced ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600';
  const taxYear = new Date().getFullYear();

  return <div className="space-y-6 pb-10">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-3xl font-black">Philippine Tax Planner</h2><p className="mt-1 text-slate-500">Transparent planning estimates for individual taxpayers in the Philippines.</p></div><button onClick={() => window.print()} className={"flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold " + (isAdvanced ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}><Download size={16} /> Print estimate</button></div>

    <div className={"flex gap-3 rounded-3xl border p-4 text-sm " + (isAdvanced ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900')}><AlertCircle className="mt-0.5 shrink-0" size={20} /><p><strong>Planning estimate, not filing advice.</strong> This does not determine eligibility, exemptions, final taxes, capital-gains taxes, or VAT registration. Check BIR forms and a qualified tax professional before filing.</p></div>

    <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <section className={"rounded-3xl border p-6 " + card}><div className="mb-6 flex items-center gap-3"><div className={isAdvanced ? 'rounded-xl bg-violet-500/20 p-2.5 text-violet-300' : 'rounded-xl bg-violet-50 p-2.5 text-violet-600'}><Calculator size={20} /></div><div><h3 className="font-black text-lg">Tax scenario</h3><p className="text-sm text-slate-500">Use annual amounts in pesos.</p></div></div>
        <div className="space-y-5">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Income profile</p><div className="grid grid-cols-3 gap-2">{([['employment','Employee'],['self-employed','Self-employed'],['mixed','Mixed income']] as [Profile,string][]).map(([value,label]) => <button key={value} onClick={() => set({ profile: value, eightPercent: value === 'employment' ? false : scenario.eightPercent })} className={"rounded-xl px-2 py-3 text-xs font-bold " + (scenario.profile === value ? active : inactive)}>{label}</button>)}</div></div>
          {scenario.profile !== 'self-employed' && <div className="grid gap-3 sm:grid-cols-2"><MoneyField label="Annual compensation" value={scenario.compensation} setValue={(value) => set({ compensation: value })} help="Before employee mandatory contributions." /><MoneyField label="Non-taxable compensation" value={scenario.nonTaxable} setValue={(value) => set({ nonTaxable: value })} help="Only confirmed non-taxable amounts." /><MoneyField label="Mandatory employee contributions" value={scenario.statutory} setValue={(value) => set({ statutory: value })} help="Use actual payroll SSS, PhilHealth, and Pag-IBIG figures." /></div>}
          {scenario.profile !== 'employment' && <><div className="border-t border-slate-100 pt-5 dark:border-slate-700"><MoneyField label="Gross business/professional receipts" value={scenario.businessGross} setValue={(value) => set({ businessGross: value })} help="Annual gross sales/receipts before deductions." /></div>
            <label className={"flex cursor-pointer gap-3 rounded-2xl border p-4 " + (scenario.eightPercent ? (isAdvanced ? 'border-violet-500 bg-violet-500/10' : 'border-emerald-500 bg-emerald-50') : (isAdvanced ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'))}><input type="checkbox" disabled={!result.eligible8} checked={scenario.eightPercent} onChange={(event) => set({ eightPercent: event.target.checked })} className="mt-1" /><span><strong className="text-sm">Use the 8% option</strong><span className="mt-1 block text-xs text-slate-500">For qualifying non-VAT taxpayers with gross receipts not above ₱3,000,000. It is in lieu of graduated business income tax and percentage tax.</span></span></label>
            {scenario.eightPercent && !result.eligible8 && <p className="text-xs font-bold text-rose-500">The 8% option cannot be used above ₱3,000,000 in receipts.</p>}
            {!scenario.eightPercent && <div className="space-y-3"><div className="grid grid-cols-2 gap-2"><button onClick={() => set({ method: 'itemized' })} className={"rounded-xl p-3 text-sm font-bold " + (scenario.method === 'itemized' ? active : inactive)}>Itemized expenses</button><button onClick={() => set({ method: 'osd' })} className={"rounded-xl p-3 text-sm font-bold " + (scenario.method === 'osd' ? active : inactive)}>40% OSD</button></div>{scenario.method === 'itemized' ? <MoneyField label="Allowable itemized expenses" value={scenario.expenses} setValue={(value) => set({ expenses: value })} help="Ordinary, necessary, substantiated business expenses only." /> : <p className="text-xs text-slate-500">OSD is calculated automatically as 40% of gross receipts.</p>}<div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Business tax planning</p><div className="grid grid-cols-2 gap-2"><button onClick={() => set({ businessTax: 'percentage' })} className={"rounded-xl p-3 text-sm font-bold " + (scenario.businessTax === 'percentage' ? active : inactive)}>3% percentage tax</button><button onClick={() => set({ businessTax: 'vat' })} className={"rounded-xl p-3 text-sm font-bold " + (scenario.businessTax === 'vat' ? active : inactive)}>12% VAT</button></div>{scenario.businessTax === 'vat' && <div className="mt-3"><MoneyField label="Creditable input VAT" value={scenario.inputVat} setValue={(value) => set({ inputVat: value })} help="Supported by valid VAT invoices/receipts." /></div>}</div></div>}
          </>}
          <div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 dark:border-slate-700"><MoneyField label="Creditable tax withheld" value={scenario.withholding} setValue={(value) => set({ withholding: value })} help="For example, supported by BIR Form 2316 or 2307." /><MoneyField label="Other tax credits/payments" value={scenario.credits} setValue={(value) => set({ credits: value })} help="Only credits and payments you can substantiate." /></div>
        </div>
      </section>

      <section className="space-y-6"><div className={"rounded-3xl border p-6 " + card}><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Estimated annual tax payable</p><p className="mt-2 text-4xl font-black text-rose-500">{php(result.payable)}</p><p className="mt-2 text-sm text-slate-500">{result.overpayment > 0 ? php(result.overpayment) + ' more credits than this estimate.' : php(result.beforeCredits) + ' tax before credits and payments.'}</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{[['Taxable compensation',php(result.taxableComp)], [scenario.eightPercent ? '8% business base' : 'Net business income',php(scenario.eightPercent ? (scenario.profile === 'mixed' ? result.gross : Math.max(0,result.gross - 250000)) : result.netBusiness)], ['Effective rate',result.effective.toFixed(1) + '%']].map(([label,value]) => <div key={label} className={isAdvanced ? 'rounded-2xl bg-slate-900/60 p-4' : 'rounded-2xl bg-slate-50 p-4'}><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 font-black">{value}</p></div>)}</div><div className={isAdvanced ? 'mt-5 rounded-2xl bg-slate-900/60 p-4' : 'mt-5 rounded-2xl bg-slate-50 p-4'}><p className="text-xs font-bold text-slate-500">Simple quarterly reserve</p><p className="mt-1 text-xl font-black">{php(result.payable / 4)}</p><p className="mt-1 text-xs text-slate-500">A planning split only. BIR quarterly returns use cumulative computations and credits.</p></div></div>
        <div className={"rounded-3xl border p-6 " + card}><h3 className="font-black text-lg">How this estimate works</h3><div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300"><p><strong>Graduated rates:</strong> 0%, 15%, 20%, 25%, 30%, and 35% brackets effective from 2023 onward.</p>{scenario.eightPercent && <p><strong>8% election:</strong> {scenario.profile === 'mixed' ? 'the ₱250,000 reduction does not apply to business receipts of mixed-income earners.' : 'the ₱250,000 reduction is applied to purely self-employed/professional receipts.'}</p>}{!scenario.eightPercent && <p><strong>{scenario.method === 'osd' ? 'OSD:' : 'Itemized deductions:'}</strong> {scenario.method === 'osd' ? '40% of gross receipts is used.' : 'only the amount you entered is used.'}</p>}{scenario.businessTax === 'vat' && scenario.profile !== 'employment' && <p><strong>VAT:</strong> 12% output VAT less the creditable input VAT you entered.</p>}</div></div>
      </section>
    </div>

    <div className="grid gap-6 lg:grid-cols-2"><section className={"rounded-3xl border p-6 " + card}><h3 className="flex items-center gap-2 font-black text-lg"><FileText size={20} /> Planning deadlines</h3><p className="mt-1 text-sm text-slate-500">General statutory dates; taxpayer-specific schedules and extensions can differ.</p><div className="mt-5 space-y-3"><Deadline form={scenario.profile === 'employment' ? '1700 (if required)' : '1701'} label={'Annual income tax return for ' + taxYear} date={'April 15, ' + (taxYear + 1)} advanced={isAdvanced} />{scenario.profile !== 'employment' && !scenario.eightPercent && <Deadline form="1701Q" label="Quarterly income tax return (Q1)" date={'May 15, ' + taxYear} advanced={isAdvanced} />}{scenario.profile !== 'employment' && scenario.businessTax === 'percentage' && !scenario.eightPercent && <Deadline form="2551Q" label="Quarterly percentage tax return (Q1)" date={'April 25, ' + taxYear} advanced={isAdvanced} />}</div></section>
      <section className={"rounded-3xl border p-6 " + card}><h3 className="flex items-center gap-2 font-black text-lg"><Info size={20} /> Official BIR references</h3><p className="mt-1 text-sm text-slate-500">Review these before relying on an election or filing position.</p><div className="mt-5 space-y-3"><Reference label="2023 onward individual income-tax brackets" href="https://bir-cdn.bir.gov.ph/BIR/pdf/RMC%20No.%2034-2025%20Annex%20A.pdf" advanced={isAdvanced} /><Reference label="8% option, mixed-income treatment, and ₱3M threshold" href="https://bir-cdn.bir.gov.ph/local/pdf/RMO%20NO.23-2018.pdf" advanced={isAdvanced} /><Reference label="1701Q: 8% option and 40% OSD guidance" href="https://efps.bir.gov.ph/efps-war/EFPSWeb_war/forms2018Version/1701Q/1701q_v3_01.xhtml" advanced={isAdvanced} /><Reference label="2551Q percentage-tax filing guidance" href="https://efps.bir.gov.ph/efps-war/EFPSWeb_war/forms2018Version/2551Q/2551q_guidelines.html" advanced={isAdvanced} /></div></section></div>
  </div>;
}

function Deadline({ form, label, date, advanced }: { form: string, label: string, date: string, advanced: boolean }) {
  return <div className={advanced ? 'flex justify-between gap-4 rounded-2xl bg-slate-900/60 p-4' : 'flex justify-between gap-4 rounded-2xl bg-slate-50 p-4'}><div><p className="text-sm font-bold">{label}</p><p className="mt-1 text-xs text-slate-500">{form}</p></div><p className="shrink-0 text-sm font-black">{date}</p></div>;
}

function Reference({ label, href, advanced }: { label: string, href: string, advanced: boolean }) {
  return <a href={href} target="_blank" rel="noreferrer" className={advanced ? 'flex items-center justify-between gap-3 rounded-2xl border border-slate-700 p-4 text-sm font-bold text-violet-300 hover:bg-slate-900' : 'flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold text-emerald-700 hover:bg-slate-50'}>{label}<ExternalLink size={16} /></a>;
}
