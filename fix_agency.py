import re
with open("src/pages/Business.tsx", "r") as f:
    content = f.read()

pattern = r"function AgencyDashboard\(\{ business.*?const handleAddInvoice = \(\) => \{.*?setIsAddInvoiceOpen\(false\);\n    setNewInvoice\(\{ client: '', status: 'Sent', amount: '' \}\);\n  \};"

new_code = """function AgencyDashboard({ business, isAdvanced, currentTab, onNavigate }: any) {
  const { shouldRefresh, triggerRefresh } = useStore();
  const [isAddClientOpen, setIsAddClientOpen] = React.useState(false);
  const [clients, setClients] = React.useState<any[]>([]);
  const [newClient, setNewClient] = React.useState({ name: '', type: 'Retainer', revenue: '' });

  const [isAddLeadOpen, setIsAddLeadOpen] = React.useState(false);
  const [leads, setLeads] = React.useState<any[]>([]);
  const [newLead, setNewLead] = React.useState({ name: '', status: 'Warm', value: '' });

  const [isAddProposalOpen, setIsAddProposalOpen] = React.useState(false);
  const [proposals, setProposals] = React.useState<any[]>([]);
  const [newProposal, setNewProposal] = React.useState({ title: '', status: 'Pending', value: '' });

  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = React.useState(false);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [newInvoice, setNewInvoice] = React.useState({ client: '', status: 'Sent', amount: '' });

  React.useEffect(() => {
    Promise.all([
      fetch(`/api/businesses/${business.id}/items`),
      fetch(`/api/businesses/${business.id}/transactions`)
    ]).then(async ([itemsRes, txRes]) => {
      const itemsData = await itemsRes.json();
      const txData = await txRes.json();
      
      const clis = itemsData.filter((i:any) => i.type === 'client').map((i:any) => {
        let extra = {};
        try { extra = JSON.parse(i.extra_info || '{}'); } catch(e){}
        return { id: i.id, name: i.name, type: extra.type || 'Project', revenue: i.value, status: i.status };
      });
      setClients(clis);

      const lds = itemsData.filter((i:any) => i.type === 'lead').map((i:any) => {
        return { id: i.id, name: i.name, status: i.status, value: i.value };
      });
      setLeads(lds);

      const props = itemsData.filter((i:any) => i.type === 'proposal').map((i:any) => {
        return { id: i.id, title: i.name, status: i.status, value: i.value };
      });
      setProposals(props);

      const invs = txData.filter((t:any) => t.type === 'income').map((t:any) => ({
        id: t.id, client: t.description, amount: t.amount, status: t.status
      }));
      setInvoices(invs);

    }).catch(console.error);
  }, [business.id, shouldRefresh]);

  const handleAddClient = async () => {
    if (!newClient.name) return;
    try {
      await fetch(`/api/businesses/${business.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'client',
          name: newClient.name,
          status: 'Active',
          value: parseFloat(newClient.revenue) || 0,
          extra_info: { type: newClient.type }
        })
      });
      triggerRefresh();
      setNewClient({ name: '', type: 'Retainer', revenue: '' });
      setIsAddClientOpen(false);
    } catch(e) { console.error(e); }
  };

  const handleAddLead = async () => {
    if (!newLead.name) return;
    try {
      await fetch(`/api/businesses/${business.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lead',
          name: newLead.name,
          status: newLead.status,
          value: parseFloat(newLead.value) || 0
        })
      });
      triggerRefresh();
      setNewLead({ name: '', status: 'Warm', value: '' });
      setIsAddLeadOpen(false);
    } catch(e) { console.error(e); }
  };

  const handleAddProposal = async () => {
    if (!newProposal.title) return;
    try {
      await fetch(`/api/businesses/${business.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'proposal',
          name: newProposal.title,
          status: newProposal.status,
          value: parseFloat(newProposal.value) || 0
        })
      });
      triggerRefresh();
      setNewProposal({ title: '', status: 'Pending', value: '' });
      setIsAddProposalOpen(false);
    } catch(e) { console.error(e); }
  };

  const handleAddInvoice = async () => {
    if (!newInvoice.client) return;
    try {
      await fetch(`/api/businesses/${business.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'income',
          amount: parseFloat(newInvoice.amount) || 0,
          date: new Date().toISOString().split('T')[0],
          description: newInvoice.client,
          status: newInvoice.status
        })
      });
      triggerRefresh();
      setNewInvoice({ client: '', status: 'Sent', amount: '' });
      setIsAddInvoiceOpen(false);
    } catch(e) { console.error(e); }
  };"""

content = re.sub(pattern, new_code, content, flags=re.DOTALL)

with open("src/pages/Business.tsx", "w") as f:
    f.write(content)
