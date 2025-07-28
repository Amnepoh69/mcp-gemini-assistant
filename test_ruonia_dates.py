#!/usr/bin/env python3
"""
Test RUONIA table structure with dates
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, date

def test_ruonia_table_structure():
    print("Testing RUONIA table structure with dates...")
    
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
        
        # Show all rows to understand structure
        for row_idx, row in enumerate(rows):
            cells = row.find_all(['td', 'th'])
            cell_texts = [cell.text.strip() for cell in cells]
            print(f"Row {row_idx}: {cell_texts}")
        
        # Now let's analyze date structure
        print("\n=== ANALYZING DATE STRUCTURE ===")
        
        # Find date row
        date_row = None
        ruonia_row = None
        
        for row_idx, row in enumerate(rows):
            cells = row.find_all(['td', 'th'])
            if len(cells) >= 2:
                first_cell = cells[0].text.strip()
                if 'Дата ставки' in first_cell:
                    date_row = (row_idx, cells)
                    print(f"Date row {row_idx}: {[c.text.strip() for c in cells]}")
                elif 'Ставка RUONIA' in first_cell and '%' in first_cell:
                    ruonia_row = (row_idx, cells)
                    print(f"RUONIA row {row_idx}: {[c.text.strip() for c in cells]}")
        
        if date_row and ruonia_row:
            print("\n=== PARSING DATES ===")
            date_cells = date_row[1][1:]  # Skip first cell (header)
            ruonia_cells = ruonia_row[1][1:]  # Skip first cell (header)
            
            today = date.today()
            print(f"Today: {today}")
            
            best_date = None
            best_value = None
            best_diff = float('inf')
            
            for i, (date_cell, ruonia_cell) in enumerate(zip(date_cells, ruonia_cells)):
                date_text = date_cell.text.strip()
                ruonia_text = ruonia_cell.text.strip()
                
                print(f"Column {i+1}: Date='{date_text}', RUONIA='{ruonia_text}'")
                
                # Try to parse date
                try:
                    # Expected format: DD.MM.YYYY
                    parsed_date = datetime.strptime(date_text, '%d.%m.%Y').date()
                    diff = abs((today - parsed_date).days)
                    
                    print(f"  Parsed date: {parsed_date}, Days diff: {diff}")
                    
                    # Try to parse RUONIA value
                    if ruonia_text and any(char.isdigit() for char in ruonia_text):
                        try:
                            clean_ruonia = ruonia_text.replace('%', '').replace(' ', '').replace(',', '.')
                            ruonia_value = float(clean_ruonia)
                            
                            if 0 <= ruonia_value <= 30 and diff < best_diff:
                                best_date = parsed_date
                                best_value = ruonia_value
                                best_diff = diff
                                print(f"  ✓ New best: {best_date} -> {best_value}% (diff: {best_diff} days)")
                        except ValueError:
                            print(f"  ✗ Cannot parse RUONIA value: '{ruonia_text}'")
                    
                except ValueError:
                    print(f"  ✗ Cannot parse date: '{date_text}'")
            
            print(f"\n=== RESULT ===")
            if best_value is not None:
                print(f"Best RUONIA: {best_value}% from {best_date} ({best_diff} days from today)")
                return best_value
            else:
                print("No valid RUONIA value found")
                return None

if __name__ == "__main__":
    test_ruonia_table_structure()