import re
with open("src/pages/Business.tsx", "r") as f:
    content = f.read()

target = """function StoreDashboard({ business, isAdvanced, currentTab, onNavigate }: any) {
  const [search, setSearch] = React.useState('');
  const [inventory, setInventory] = React.useState([
    { id: 'INV-1001', name: 'Premium Leather Wallet', stock: 45, status: 'In Stock', price: 1200 },
    { id: 'INV-1002', name: 'Minimalist Watch', stock: 12, status: 'Low Stock', price: 3500 },
    { id: 'INV-1003', name: 'Canvas Backpack', stock: 0, status: 'Out of Stock', price: 2100 },
    { id: 'INV-1004', name: 'Sunglasses', stock: 89, status: 'In Stock', price: 800 },
  ]);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [newItem, setNewItem] = React.useState({ name: '', stock: '', price: '' });

  const [orders, setOrders] = React.useState([
    { id: 'ORD-5091', date: '2 mins ago', customer: 'Alex Johnson', amount: 3500, status: 'Processing' },
    { id: 'ORD-5090', date: '1 hour ago', customer: 'Sarah Miller', amount: 1200, status: 'Shipped' },
    { id: 'ORD-5089', date: '3 hours ago', customer: 'David Chen', amount: 4500, status: 'Delivered' },
  ]);
  const [isAddOrderOpen, setIsAddOrderOpen] = React.useState(false);
  const [newOrder, setNewOrder] = React.useState({ customer: '', amount: '' });

  const [expenses, setExpenses] = React.useState([
    { id: 'EXP-1', name: 'Facebook Ads', amount: 15000, date: 'May 15', category: 'Marketing' },
    { id: 'EXP-2', name: 'Shopify Plan', amount: 2500, date: 'May 1', category: 'Software' },
    { id: 'EXP-3', name: 'Supplier Payment', amount: 45000, date: 'May 10', category: 'Inventory' },
  ]);"""

new_code = """function StoreDashboard({ business, isAdvanced, currentTab, onNavigate }: any) {
  const { shouldRefresh, triggerRefresh } = useStore();
  const [search, setSearch] = React.useState('');
  const [inventory, setInventory] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [expenses, setExpenses] = React.useState<any[]>([]);

  React.useEffect(() => {
    Promise.all([
      fetch(`/api/businesses/${business.id}/items`),
      fetch(`/api/businesses/${business.id}/transactions`)
    ]).then(async ([itemsRes, txRes]) => {
      const itemsData = await itemsRes.json();
      const txData = await txRes.json();
      
      const inv = itemsData.filter((i:any) => i.type === 'inventory').map((i:any) => {
        let extra = {};
        try { extra = JSON.parse(i.extra_info || '{}'); } catch(e){}
        return { id: i.id, name: i.name, stock: extra.stock || 0, status: i.status, price: i.value };
      });
      setInventory(inv);

      const ords = txData.filter((t:any) => t.type === 'income').map((t:any) => ({
        id: t.id, date: t.date, customer: t.description, amount: t.amount, status: t.status
      }));
      setOrders(ords);

      const exps = txData.filter((t:any) => t.type === 'expense').map((t:any) => ({
        id: t.id, name: t.description, amount: t.amount, date: t.date, category: t.category
      }));
      setExpenses(exps);
    }).catch(console.error);
  }, [business.id, shouldRefresh]);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [newItem, setNewItem] = React.useState({ name: '', stock: '', price: '' });

  const [isAddOrderOpen, setIsAddOrderOpen] = React.useState(false);
  const [newOrder, setNewOrder] = React.useState({ customer: '', amount: '' });"""

content = content.replace(target, new_code)

add_item_target = """  const handleAddItem = () => {
    if (!newItem.name) return;
    setInventory([...inventory, {
      id: `INV-${1000 + inventory.length + 5}`,
      name: newItem.name,
      stock: parseInt(newItem.stock) || 0,
      status: parseInt(newItem.stock) > 0 ? 'In Stock' : 'Out of Stock',
      price: parseFloat(newItem.price) || 0
    }]);
    setNewItem({ name: '', stock: '', price: '' });
    setIsAddOpen(false);
  };"""

new_add_item = """  const handleAddItem = async () => {
    if (!newItem.name) return;
    try {
      const stock = parseInt(newItem.stock) || 0;
      await fetch(`/api/businesses/${business.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'inventory',
          name: newItem.name,
          status: stock > 0 ? 'In Stock' : 'Out of Stock',
          value: parseFloat(newItem.price) || 0,
          extra_info: { stock }
        })
      });
      triggerRefresh();
      setNewItem({ name: '', stock: '', price: '' });
      setIsAddOpen(false);
    } catch(e) { console.error(e); }
  };"""

content = content.replace(add_item_target, new_add_item)

add_order_target = """  const handleAddOrder = () => {
    if (!newOrder.customer) return;
    setOrders([{
      id: `ORD-${5092 + orders.length}`,
      date: 'Just now',
      customer: newOrder.customer,
      amount: parseFloat(newOrder.amount) || 0,
      status: 'Processing'
    }, ...orders]);
    setNewOrder({ customer: '', amount: '' });
    setIsAddOrderOpen(false);
  };"""

new_add_order = """  const handleAddOrder = async () => {
    if (!newOrder.customer) return;
    try {
      await fetch(`/api/businesses/${business.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'income',
          amount: parseFloat(newOrder.amount) || 0,
          date: new Date().toISOString().split('T')[0],
          description: newOrder.customer,
          status: 'Processing'
        })
      });
      triggerRefresh();
      setNewOrder({ customer: '', amount: '' });
      setIsAddOrderOpen(false);
    } catch(e) { console.error(e); }
  };"""

content = content.replace(add_order_target, new_add_order)

with open("src/pages/Business.tsx", "w") as f:
    f.write(content)
