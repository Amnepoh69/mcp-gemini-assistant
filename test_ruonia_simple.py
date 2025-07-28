#!/usr/bin/env python3
"""
Test the exact RUONIA parsing logic
"""

import requests
from bs4 import BeautifulSoup

def test_ruonia_parsing():
    print("Testing RUONIA HTML parsing...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get("https://cbr.ru/hd_base/ruonia/", headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    
    soup = BeautifulSoup(response.content, 'html.parser')
    table = soup.find('table')
    
    if table:
        rows = table.find_all('tr')
        print(f"Found {len(rows)} rows")
        
        # Look for the row with "Ставка RUONIA, %"
        for row_idx, row in enumerate(rows):
            cells = row.find_all(['td', 'th'])
            if len(cells) >= 2:
                first_cell = cells[0].text.strip()
                print(f"Row {row_idx}: '{first_cell}'")
                
                # Check if this is the RUONIA rate row
                if 'RUONIA' in first_cell and '%' in first_cell:
                    print(f"✓ Found RUONIA row: {first_cell}")
                    
                    # The rate should be in the next cell(s)
                    for i in range(1, len(cells)):
                        cell_text = cells[i].text.strip()
                        print(f"  Cell {i}: '{cell_text}'")
                        if cell_text and any(char.isdigit() for char in cell_text):
                            try:
                                # Clean the text and convert to float
                                clean_text = cell_text.replace('%', '').replace(' ', '').replace(',', '.')
                                value = float(clean_text)
                                # RUONIA is typically between 0 and 30%
                                if 0 <= value <= 30:
                                    print(f"✓ FOUND RUONIA VALUE: {value}")
                                    return value
                            except ValueError as e:
                                print(f"  ValueError: {e}")
                                continue
                    break
    
    print("❌ RUONIA value not found")
    return None

if __name__ == "__main__":
    test_ruonia_parsing()