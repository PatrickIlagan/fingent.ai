import re

with open("src/pages/Business.tsx", "r") as f:
    content = f.read()

# Replace the state section of SaaSDashboard
pattern = r"function SaaSDashboard\(\{ business.*?const handleAddExpense = \(\) => \{.*?setIsAddExpenseOpen\(false\);\n    setNewExpense\(\{ name: '', category: 'Tools', amount: '', frequency: 'Monthly' \}\);\n  \};"

new_code = """function SaaSDashboard({ business, isAdvanced, currentTab, onNavigate }: any) {
  const { shouldRefresh, triggerRefresh } = useStore();
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);
  const [newUser, setNewUser] = React.useState({ email: '', plan: 'Basic' });
  
  const [isAddCampaignOpen, setIsAddCampaignOpen] = React.useState(false);
  const [campaigns, setCampaigns] = React.useState<any[]>([]);
  const [newCampaign, setNewCampaign] = React.useState({ name: '', spend: '' });

  const [isAddExpenseOpen, setIsAddExpenseOpen] = React.useState(false);
  const [expenses, setExpenses] = React.useState<any[]>([]);
  const [newExpense, setNewExpense] = React.useState({ name: '', category: 'Tools', amount: '', frequency: 'Monthly' });

  React.useEffect(() => {
    Promise.all([
      fetch(`/api/businesses/${business.id}/items`),
      fetch(`/api/businesses/${business.id}/transactions`)
    ]).then(async ([itemsRes, txRes]) => {
      const itemsData = await itemsRes.json();
      const txData = await txRes.json();
      
      const usrs = itemsData.filter((i:any) => i.type === 'user').map((i:any) => {
        let extra = {};
        try { extra = JSON.parse(i.extra_info || '{}'); } catch(e){}
        return { id: i.id, email: i.name, plan: extra.plan || 'Basic', status: i.status };
      });
      setUsers(usrs);

      const camps = itemsData.filter((i:any) => i.type === 'campaign').map((i:any) => {
        return { id: i.id, name: i.name, spend: i.value, signups: 0 };
      });
      setCampaigns(camps);

      const exps = txData.filter((t:any) => t.type === 'expense').map((t:any) => ({
        id: t.id, name: t.description, amount: t.amount, category: t.category, frequency: 'Monthly'
      }));
      setExpenses(exps);
    }).catch(console.error);
  }, [business.id, shouldRefresh]);

  const handleAddUser = async () => {
    if (!newUser.email) return;
    try {
      const val = newUser.plan === 'Pro' ? 1500 : newUser.plan === 'Enterprise' ? 5000 : 500;
      await fetch(`/api/businesses/${business.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user',
          name: newUser.email,
          status: 'Active',
          value: val,
          extra_info: { plan: newUser.plan }
        })
      });
      triggerRefresh();
      setNewUser({ email: '', plan: 'Basic' });
      setIsAddUserOpen(false);
    } catch(e) { console.error(e); }
  };

  const handleAddCampaign = async () => {
    if (!newCampaign.name) return;
    try {
      await fetch(`/api/businesses/${business.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'campaign',
          name: newCampaign.name,
          status: 'Active',
          value: parseFloat(newCampaign.spend) || 0
        })
      });
      triggerRefresh();
      setNewCampaign({ name: '', spend: '' });
      setIsAddCampaignOpen(false);
    } catch(e) { console.error(e); }
  };

  const handleAddExpense = async () => {
    if (!newExpense.name) return;
    try {
      await fetch(`/api/businesses/${business.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense',
          amount: parseFloat(newExpense.amount) || 0,
          date: new Date().toISOString().split('T')[0],
          description: newExpense.name,
          category: newExpense.category
        })
      });
      triggerRefresh();
      setNewExpense({ name: '', category: 'Tools', amount: '', frequency: 'Monthly' });
      setIsAddExpenseOpen(false);
    } catch(e) { console.error(e); }
  };"""

content = re.sub(pattern, new_code, content, flags=re.DOTALL)

with open("src/pages/Business.tsx", "w") as f:
    f.write(content)
