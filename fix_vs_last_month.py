import re

with open("src/pages/Business.tsx", "r") as f:
    content = f.read()

content = re.sub(r'<p className="text-\[10px\] text-emerald-500 mt-1">-5% vs last month</p>',
                 r'<p className="text-[10px] text-emerald-500 mt-1">{users.length > 0 ? "-5%" : "0%"} vs last month</p>', content)
content = re.sub(r'<p className="text-\[10px\] text-emerald-500 mt-1">\+15% vs last month</p>',
                 r'<p className="text-[10px] text-emerald-500 mt-1">{users.length > 0 ? "+15%" : "0%"} vs last month</p>', content)
content = re.sub(r'<p className="font-bold text-xl">12\.8%</p>',
                 r'<p className="font-bold text-xl">{users.length > 0 ? "12.8%" : "0%"}</p>', content)
content = re.sub(r'<p className="text-\[10px\] text-emerald-500 mt-1">\+1\.2% vs last month</p>',
                 r'<p className="text-[10px] text-emerald-500 mt-1">{users.length > 0 ? "+1.2%" : "0%"} vs last month</p>', content)

with open("src/pages/Business.tsx", "w") as f:
    f.write(content)
