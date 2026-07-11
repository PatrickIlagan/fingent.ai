import re

with open("src/pages/Freelancing.tsx", "r") as f:
    content = f.read()

# Replace Invoices component profile rendering to add mark as paid and delete
old_invoices_start = "          <table className=\"w-full text-left text-sm\">"
old_invoices_end = "          </table>"

invoices_content = content[content.find(old_invoices_start):content.find(old_invoices_end, content.find(old_invoices_start)) + len(old_invoices_end)]

new_invoices = """          <table className="w-full text-left text-sm">
            <thead
              className={`border-b ${isAdvanced ? "border-slate-700 bg-slate-900/50" : "bg-slate-50 border-slate-200"}`}
            >
              <tr>
                <th className="p-4 font-bold text-slate-500">Invoice #</th>
                <th className="p-4 font-bold text-slate-500">Client</th>
                <th className="p-4 font-bold text-slate-500">Date</th>
                <th className="p-4 font-bold text-slate-500 text-right">
                  Amount
                </th>
                <th className="p-4 font-bold text-slate-500 text-right">
                  Status
                </th>
                <th className="p-4 font-bold text-slate-500 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i: any) => (
                <tr
                  key={i.id}
                  className={`border-b last:border-0 ${isAdvanced ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}
                >
                  <td className="p-4 font-mono font-bold text-violet-500">
                    {i.invoice_number}
                  </td>
                  <td className="p-4 font-bold">{i.client_name}</td>
                  <td className="p-4 text-slate-500">{i.issue_date}</td>
                  <td className="p-4 text-right font-bold">
                    ₱{i.amount.toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${i.status === 'Paid' ? (isAdvanced ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700") : (isAdvanced ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700")}`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-3">
                      {i.status !== 'Paid' && (
                        <button
                          className="text-emerald-500 hover:text-emerald-600 font-bold text-xs flex items-center gap-1"
                          onClick={() => handleMarkAsPaid(i)}
                        >
                          <CheckCircle2 size={14} /> Paid
                        </button>
                      )}
                      <button
                        className="text-blue-500 hover:text-blue-600 font-bold text-xs flex items-center gap-1"
                        onClick={() => exportPDF(i)}
                      >
                        <Download size={14} /> Export
                      </button>
                      <button
                        className="text-red-500 hover:text-red-600 font-bold text-xs flex items-center gap-1"
                        onClick={() => handleDelete(i.id)}
                      >
                        <X size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    No invoices.
                  </td>
                </tr>
              )}
            </tbody>
          </table>"""

content = content.replace(invoices_content, new_invoices)

# Add handler functions to InvoicesTab
handlers_target = "  const exportPDF = async (inv: any) => {"
handlers_add = """
  const handleMarkAsPaid = async (inv: any) => {
    try {
      await fetch(`/api/freelancing/invoices/${inv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inv, status: 'Paid' })
      });
      fetchAll();
    } catch (e) {}
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await fetch(`/api/freelancing/invoices/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (e) {}
  };
"""

content = content.replace(handlers_target, handlers_add + "\n" + handlers_target)

with open("src/pages/Freelancing.tsx", "w") as f:
    f.write(content)
