with open("server.ts", "r") as f:
    content = f.read()

target = """         } else if (b.type === 'Agency') {
            const clients = items.filter((i:any) => i.type === 'client');
            b.customers = clients.length;
            const projects = items.filter((i:any) => i.type === 'project');
            b.mrr = projects.reduce((sum:any, p:any) => sum + (p.value || 0), 0);
         }"""

new_code = """         } else if (b.type === 'Agency') {
            const clients = items.filter((i:any) => i.type === 'client');
            b.customers = clients.length;
            // Use clients revenue or invoices for MRR
            b.mrr = clients.reduce((sum:any, c:any) => sum + (c.value || 0), 0);
         }"""

content = content.replace(target, new_code)
with open("server.ts", "w") as f:
    f.write(content)
