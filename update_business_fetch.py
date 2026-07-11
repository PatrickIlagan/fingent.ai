import re

with open("src/pages/Business.tsx", "r") as f:
    content = f.read()

# Replace the initial states with empty arrays and add useEffect
target = """  const [businesses, setBusinesses] = useState<any[]>([
    { id: 1, name: 'TechStore E-commerce', type: 'Store', status: 'Active', mrr: 124500, growth: 12.5, customers: 156, target: 200000 },
    { id: 2, name: 'Analytics SaaS', type: 'SaaS', status: 'Active', mrr: 85000, growth: 8.4, customers: 120, target: 150000 },
    { id: 3, name: 'Design Agency', type: 'Agency', status: 'Active', mrr: 245000, growth: 18.4, customers: 12, target: 500000 },
  ]);
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);

  const globalDeals = [
    { id: 'D-1', title: 'Enterprise Analytics Deal', venture: 'Analytics SaaS', stage: 'Negotiation', value: 250000, probability: 80, closing: '12 days', contact: 'Sarah Jenkins (TechCorp)', notes: 'Awaiting final legal review on MSA.' },
    { id: 'D-2', title: 'Website Redesign Retainer', venture: 'Design Agency', stage: 'Proposal Sent', value: 120000, probability: 60, closing: '5 days', contact: 'Mike Ross (Lawyer Inc)', notes: 'They requested 3 optional homepage mockups before signing.' },
    { id: 'D-3', title: 'Bulk Order Wholesale', venture: 'TechStore E-commerce', stage: 'Qualification', value: 45000, probability: 30, closing: '20 days', contact: 'David Lee (Retail Hub)', notes: 'Checking inventory availability for 500 units.' },
    { id: 'D-4', title: 'Q3 Ad Campaign', venture: 'Design Agency', stage: 'Closed Won', value: 350000, probability: 100, closing: 'Closed', contact: 'Emily Chen (GlobalBrands)', notes: 'Project kicked off last week.' },
  ];"""

new_code = """  const { shouldRefresh, triggerRefresh } = useStore();
  const [businesses, setBusinesses] = React.useState<any[]>([]);
  const [globalDeals, setGlobalDeals] = React.useState<any[]>([]);
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);

  React.useEffect(() => {
    Promise.all([
      fetch('/api/businesses').then(r => r.json()),
      fetch('/api/business_deals').then(r => r.json())
    ]).then(([b, d]) => {
      setBusinesses(Array.isArray(b) ? b : []);
      setGlobalDeals(Array.isArray(d) ? d : []);
    }).catch(console.error);
  }, [shouldRefresh, currentTab]);"""

content = content.replace(target, new_code)

add_target = """  const handleAddBusiness = () => {
    setBusinesses([...businesses, {
      id: Date.now(),
      name: newBusiness.name,
      type: newBusiness.type,
      status: 'Active',
      mrr: parseFloat(newBusiness.mrr) || 0,
      growth: 0,
      customers: parseInt(newBusiness.customers) || 0,
      target: parseFloat(newBusiness.target) || 100000
    }]);
    setIsModalOpen(false);
    setStep(1);
    setNewBusiness({ name: '', type: 'Store', status: 'Active', mrr: '', customers: '', target: '' });
  };"""

new_add_code = """  const handleAddBusiness = async () => {
    try {
      await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBusiness.name,
          type: newBusiness.type,
          status: 'Active',
          target: parseFloat(newBusiness.target) || 100000
        })
      });
      triggerRefresh();
      setIsModalOpen(false);
      setStep(1);
      setNewBusiness({ name: '', type: 'Store', status: 'Active', mrr: '', customers: '', target: '' });
    } catch(e) { console.error(e); }
  };"""

content = content.replace(add_target, new_add_code)

# Let's replace the StoreDashboard data
with open("src/pages/Business.tsx", "w") as f:
    f.write(content)
