import re

with open("src/pages/Plans.tsx", "r") as f:
    content = f.read()

target = """                })}
              </div>
            )}
            
            {!selectedPlan && ("""

new_code = """                })}
              </div>
            )}
            </div>
          )}
            
          {!selectedPlan && ("""

if target in content:
    content = content.replace(target, new_code)
    with open("src/pages/Plans.tsx", "w") as f:
        f.write(content)
    print("Fixed brackets")
else:
    print("Not found")

