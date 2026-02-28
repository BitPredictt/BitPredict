import json, sys
d = json.load(sys.stdin)
multi = [m for m in d if 'outcomes' in m]
print(f'Total: {len(d)}, Multi: {len(multi)}')
for m in multi[:3]:
    print(m['question'][:70])
    for o in m['outcomes'][:4]:
        print(f"  {o['label'][:30]}: {round(o['price']*100)}%")
