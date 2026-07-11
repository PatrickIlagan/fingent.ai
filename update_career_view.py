import re

with open("src/pages/Career.tsx", "r") as f:
    content = f.read()

# Add states
state_target = """  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ name: '', amount: '', date: '', is_recurring: false, budget_preset_id: '', account_id: '' });"""

new_states = """  const [incomeViewMode, setIncomeViewMode] = useState<'list' | 'add' | 'details'>('list');
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [incomeForm, setIncomeForm] = useState({ name: '', amount: '', date: '', is_recurring: false, budget_preset_id: '', account_id: '' });"""

if state_target in content:
    content = content.replace(state_target, new_states)
    
# Replace the whole main structure if incomeViewMode !== 'list'
# Wait, maybe it's better to render the add/details views in place of the whole page content or in place of just the Income Flows section?
# "add income should change the whole screen itself, not just a modal"
# So let's wrap the main return in `{incomeViewMode === 'list' ? ( ... ) : incomeViewMode === 'add' ? ( ... ) : ( ... ) }`
