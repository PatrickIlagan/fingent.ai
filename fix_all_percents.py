import re

with open("src/pages/Business.tsx", "r") as f:
    content = f.read()

# StoreDashboard metrics
content = re.sub(r'<p className="text-\[10px\] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size=\{12\} /> \+12\.5% this month</p>',
                 r'<p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> {orders.length > 0 ? "+12.5%" : "0%"} this month</p>', content)
content = re.sub(r'<p className="text-\[10px\] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size=\{12\} /> \+5\.2% this month</p>',
                 r'<p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> {orders.length > 0 ? "+5.2%" : "0%"} this month</p>', content)
content = re.sub(r'<p className="text-\[10px\] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size=\{12\} /> \+1\.2% this month</p>',
                 r'<p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> {orders.length > 0 ? "+1.2%" : "0%"} this month</p>', content)

# SaaSDashboard metrics
content = re.sub(r'<p className="text-xs text-slate-500 mt-2">\+12% from last month</p>',
                 r'<p className="text-xs text-slate-500 mt-2">{users.length > 0 ? "+12%" : "0%"} from last month</p>', content)
content = re.sub(r'<p className="font-black text-3xl text-rose-500">4\.2%</p>',
                 r'<p className="font-black text-3xl text-rose-500">{users.length > 0 ? "4.2%" : "0%"}</p>', content)
content = re.sub(r'<p className="text-xs text-slate-500 mt-2">-0\.5% from last month</p>',
                 r'<p className="text-xs text-slate-500 mt-2">{users.length > 0 ? "-0.5%" : "0%"} from last month</p>', content)
content = re.sub(r'<p className="text-\[10px\] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size=\{12\} /> \+8\.4% this month</p>',
                 r'<p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> {users.length > 0 ? "+8.4%" : "0%"} this month</p>', content)
content = re.sub(r'<p className="text-\[10px\] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size=\{12\} /> \+12\.1% this month</p>',
                 r'<p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> {users.length > 0 ? "+12.1%" : "0%"} this month</p>', content)
content = re.sub(r'<p className="font-black text-2xl text-rose-500">4\.2%</p>',
                 r'<p className="font-black text-2xl text-rose-500">{users.length > 0 ? "4.2%" : "0%"}</p>', content)
content = re.sub(r'<p className="text-\[10px\] text-rose-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size=\{12\} /> \+0\.5% this month</p>',
                 r'<p className="text-[10px] text-rose-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> {users.length > 0 ? "+0.5%" : "0%"} this month</p>', content)
content = re.sub(r'<p className="text-\[10px\] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size=\{12\} /> \+2\.1% this month</p>',
                 r'<p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> {users.length > 0 ? "+2.1%" : "0%"} this month</p>', content)

# AgencyDashboard metrics
content = re.sub(r'<p className="text-\[10px\] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size=\{12\} /> \+18\.4% this month</p>',
                 r'<p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> {clients.length > 0 ? "+18.4%" : "0%"} this month</p>', content)
content = re.sub(r'<p className="text-\[10px\] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size=\{12\} /> \+12% this month</p>',
                 r'<p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={12} /> {clients.length > 0 ? "+12%" : "0%"} this month</p>', content)


with open("src/pages/Business.tsx", "w") as f:
    f.write(content)
