import re

with open("src/pages/Career.tsx", "r") as f:
    content = f.read()

target = """  useEffect(() => {
     // dummy effect to match old structure if needed, not actually replacing it. Just ignore.
  }, [0]);
  
  const _old_ = () => {
     fetch('/api/career').then(r => r.json()).then(data => {
        if (data) {
           setCareer(data);
           try {
              setSkills(JSON.parse(data.skills_needed || '[]'));
           } catch(e) { setSkills([]); }
           setEditForm({
              current_role: data.current_role || '',
              target_role: data.target_role || '',
              current_salary: data.current_salary?.toString() || '',
              target_salary: data.target_salary?.toString() || ''
           });
        }
     });
  }, []);"""

if target in content:
    content = content.replace(target, "")
    with open("src/pages/Career.tsx", "w") as f:
        f.write(content)
    print("Fixed syntax")
else:
    print("Not found")

