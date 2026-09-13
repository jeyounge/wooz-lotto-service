import urllib.request
import json

url = "https://rncjgtyqzjewnmxycexp.supabase.co/rest/v1/lotto_history?select=drw_no,numbers,bonus&order=drw_no.desc&limit=15"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY2pndHlxempld25teHljZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzI4MzEsImV4cCI6MjA4NTE0ODgzMX0.kMQxGUe6BOCTlaGbEQyoeS11VUDUYoTCoTo_tw8bpxE",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY2pndHlxempld25teHljZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzI4MzEsImV4cCI6MjA4NTE0ODgzMX0.kMQxGUe6BOCTlaGbEQyoeS11VUDUYoTCoTo_tw8bpxE"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        
        print("=== Recent 15 Draws ===")
        for r in data:
            print(f"Round {r['drw_no']}: {r['numbers']} + {r['bonus']}")
        
        kills = set()
        kills_list = []
        reasons = {}
        killCount = 3
        
        def addKill(num, reason):
            if len(kills) >= killCount: return
            if num not in kills:
                kills.add(num)
                kills_list.append(num)
                reasons[num] = reason
        
        last10 = data[:10]
        counts10 = {}
        for r in last10:
            for n in r['numbers']:
                counts10[n] = counts10.get(n, 0) + 1
        
        def is_hot(num):
            return counts10.get(num, 0) >= 3

        r0 = set(data[0]['numbers'])
        r1 = set(data[1]['numbers'])
        r2 = set(data[2]['numbers'])
        
        for i in range(1, 46):
            if i in r0 and i in r1 and i in r2:
                addKill(i, "3-Consecutive")
                break
                
        if len(kills) < killCount:
            lastBonus = data[0]['bonus']
            addKill(lastBonus, "Last Bonus")
            
        if len(kills) < killCount:
            last5 = data[:5]
            digits_count = {}
            num_counts = {}
            for r in last5:
                for n in r['numbers']:
                    digit = n % 10
                    digits_count[digit] = digits_count.get(digit, 0) + 1
                    num_counts[n] = num_counts.get(n, 0) + 1
            
            sorted_digits = sorted(digits_count.items(), key=lambda x: (-x[1], x[0]))
            if sorted_digits:
                target_digit = sorted_digits[0][0]
                candidates = [i for i in range(1, 46) if i % 10 == target_digit]
                candidates.sort(key=lambda x: (num_counts.get(x, 0), x))
                
                print(f"\n[Priority 3] Hottest Digit: {target_digit}")
                print(f"Candidates with digit {target_digit}: {candidates}")
                print(f"Their 5-week frequencies: {[num_counts.get(c, 0) for c in candidates]}")
                print(f"Their 10-week frequencies (>=3 is HOT): {[counts10.get(c, 0) for c in candidates]}")
                
                for cand in candidates:
                    if is_hot(cand):
                        print(f"  -> Skipped Hot Number {cand} from execution")
                        continue
                    addKill(cand, f"Weakest of Hot Digit {target_digit}")
                    if len(kills) >= killCount: break
                    
        print(f"\nFINAL 3-KILL Results: {kills_list}")
        for k in kills_list:
            print(f"- {k}: {reasons[k]}")
            
        # Do it again for 5-kill
        kills.clear()
        kills_list.clear()
        reasons.clear()
        killCount = 5
        
        for i in range(1, 46):
            if i in r0 and i in r1 and i in r2:
                addKill(i, "3-Consecutive")
                break
                
        if len(kills) < killCount:
            lastBonus = data[0]['bonus']
            addKill(lastBonus, "Last Bonus")
            
        if len(kills) < killCount:
            sorted_digits = sorted(digits_count.items(), key=lambda x: (-x[1], x[0]))
            if sorted_digits:
                target_digit = sorted_digits[0][0]
                candidates = [i for i in range(1, 46) if i % 10 == target_digit]
                candidates.sort(key=lambda x: (num_counts.get(x, 0), x))
                for cand in candidates:
                    if is_hot(cand): continue
                    addKill(cand, f"Weakest of Hot Digit {target_digit}")
                    if len(kills) >= killCount: break
                    
        # Priority 4: Coldest Numbers (Lowest freq in last 10)
        if len(kills) < killCount:
            allNums = [i for i in range(1, 46)]
            allNums.sort(key=lambda x: (counts10.get(x, 0), x))
            
            for cand in allNums:
                if is_hot(cand): continue
                addKill(cand, f"Coldest Number (10주 {counts10.get(cand, 0)}회)")
                if len(kills) >= killCount: break
                
        print(f"\nFINAL 5-KILL Results: {kills_list}")
        for k in kills_list:
            print(f"- {k}: {reasons[k]}")
                    
except Exception as e:
    print("Error:", e)
