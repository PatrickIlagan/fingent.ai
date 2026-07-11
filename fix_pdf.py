import re

with open("src/pages/Freelancing.tsx", "r") as f:
    content = f.read()

# I want to add selectedInvoice state and use it in the hidden PDF template.
state_target = "const [selectedService, setSelectedService] = useState<any | null>(null);"
state_replacement = """const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);"""
content = content.replace(state_target, state_replacement)

# Update Export PDF logic
export_target = """  const exportPDF = async () => {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('invoice.pdf');
  };"""
export_replacement = """  const exportPDF = async (inv: any) => {
    setSelectedInvoice(inv);
    setTimeout(async () => {
      if (!invoiceRef.current) return;
      const canvas = await html2canvas(invoiceRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${inv.invoice_number}.pdf`);
      setSelectedInvoice(null);
    }, 100);
  };"""
content = content.replace(export_target, export_replacement)

# Update Preview button to export instead
btn_target = """<button className="text-blue-500 hover:text-blue-600 font-bold text-xs" onClick={() => {
                            // Show PDF Preview Modal for this invoice
                         }}>
                            Preview
                         </button>"""
btn_replacement = """<button className="text-blue-500 hover:text-blue-600 font-bold text-xs flex items-center gap-1 justify-end w-full" onClick={() => exportPDF(i)}>
                            <Download size={14} /> Export PDF
                         </button>"""
content = content.replace(btn_target, btn_replacement)

# Fix hidden invoice template
template_target = """          {/* Hidden PDF template for export */}
          <div className="hidden">
             <div ref={invoiceRef} className="p-10 bg-white text-black w-[800px]">
                <h1 className="text-4xl font-black mb-10">INVOICE</h1>
                <div className="flex justify-between mb-10">
                   <div>
                      <p className="font-bold">FinGent Freelancer</p>
                      <p>freelance@fingent.com</p>
                   </div>
                   <div className="text-right">
                      <p className="font-bold">Invoice #INV-TEST</p>
                      <p>Date: {new Date().toLocaleDateString()}</p>
                   </div>
                </div>
                <table className="w-full text-left mb-10">
                   <thead><tr className="border-b-2 border-black"><th className="pb-2">Description</th><th className="pb-2 text-right">Amount</th></tr></thead>
                   <tbody>
                      <tr className="border-b"><td className="py-4">Service Rendered</td><td className="py-4 text-right">₱50,000</td></tr>
                   </tbody>
                </table>
                <div className="text-right">
                   <p className="text-2xl font-black">Total: ₱50,000</p>
                </div>
             </div>
          </div>"""
template_replacement = """          {/* Hidden PDF template for export */}
          <div className="fixed -left-[9999px]">
             {selectedInvoice && (
               <div ref={invoiceRef} className="p-10 bg-white text-black w-[800px]">
                  <h1 className="text-4xl font-black mb-10">INVOICE</h1>
                  <div className="flex justify-between mb-10">
                     <div>
                        <p className="font-bold text-xl">FinGent Freelancer</p>
                        <p>freelance@fingent.com</p>
                     </div>
                     <div className="text-right">
                        <p className="font-bold text-lg">Billed To:</p>
                        <p>{selectedInvoice.client_name}</p>
                     </div>
                  </div>
                  <div className="flex justify-between mb-10 pb-5 border-b-2 border-black">
                     <div>
                        <p className="font-bold">Invoice Number:</p>
                        <p>{selectedInvoice.invoice_number}</p>
                     </div>
                     <div className="text-right">
                        <p className="font-bold">Date of Issue:</p>
                        <p>{selectedInvoice.issue_date}</p>
                     </div>
                  </div>
                  <table className="w-full text-left mb-10">
                     <thead><tr className="border-b-2 border-black"><th className="pb-2 font-bold">Description</th><th className="pb-2 text-right font-bold">Amount</th></tr></thead>
                     <tbody>
                        <tr className="border-b"><td className="py-4">Service Rendered</td><td className="py-4 text-right">₱{selectedInvoice.amount.toLocaleString()}</td></tr>
                     </tbody>
                  </table>
                  <div className="text-right">
                     <p className="text-2xl font-black">Total: ₱{selectedInvoice.amount.toLocaleString()}</p>
                  </div>
               </div>
             )}
          </div>"""
content = content.replace(template_target, template_replacement)

# Remove the broken exportPDF button in create invoice modal
create_modal_target = """<div className="flex gap-2">
                 <button onClick={exportPDF} className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2"><Download size={16}/> Export PDF</button>
              </div>"""
create_modal_replacement = ""
content = content.replace(create_modal_target, create_modal_replacement)

with open("src/pages/Freelancing.tsx", "w") as f:
    f.write(content)
