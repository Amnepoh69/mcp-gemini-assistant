#!/usr/bin/env python3
"""
Simple script to test RUONIA fetching from CBR
"""

import requests
import xml.etree.ElementTree as ET
from datetime import datetime, date, timedelta
import re

def test_ruonia_sources():
    print("Testing RUONIA data sources...")
    
    # Test 1: Try to get HTML page
    print("\n1. Testing HTML page parsing...")
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get("https://cbr.ru/hd_base/ruonia/", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Content length: {len(response.content)}")
        
        # Check if BeautifulSoup is available
        try:
            from bs4 import BeautifulSoup
            print("   BeautifulSoup: Available")
            
            soup = BeautifulSoup(response.content, 'html.parser')
            tables = soup.find_all('table')
            print(f"   Found {len(tables)} tables")
            
            if tables:
                for i, table in enumerate(tables[:3]):  # Check first 3 tables
                    rows = table.find_all('tr')
                    print(f"   Table {i+1}: {len(rows)} rows")
                    if rows:
                        # Show first few cells of first data row
                        for row in rows[:2]:
                            cells = row.find_all(['td', 'th'])
                            cell_texts = [cell.text.strip()[:20] for cell in cells[:4]]
                            print(f"     Row: {cell_texts}")
            
        except ImportError:
            print("   BeautifulSoup: NOT AVAILABLE")
            
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: Try XML endpoints
    print("\n2. Testing XML endpoints...")
    xml_endpoints = [
        "http://www.cbr.ru/scripts/xml_ruonia.asp",
        "http://www.cbr.ru/scripts/XML_ruonia.asp",
        "https://www.cbr.ru/scripts/xml_ruonia.asp"
    ]
    
    for endpoint in xml_endpoints:
        try:
            response = requests.get(endpoint, timeout=5)
            print(f"   {endpoint}: Status {response.status_code}, Length {len(response.content)}")
            if response.status_code == 200 and len(response.content) > 50:
                print(f"     Content preview: {response.text[:200]}...")
        except Exception as e:
            print(f"   {endpoint}: Error - {e}")
    
    # Test 3: Try date-specific XML
    print("\n3. Testing date-specific XML...")
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    date_formats = [
        today.strftime('%d.%m.%Y'),
        yesterday.strftime('%d.%m.%Y'),
        today.strftime('%d/%m/%Y'),
        yesterday.strftime('%d/%m/%Y')
    ]
    
    for date_str in date_formats[:2]:  # Test first 2 formats
        try:
            url = f"http://www.cbr.ru/scripts/XML_mkr.asp?date_req={date_str}"
            response = requests.get(url, timeout=5)
            print(f"   {url}: Status {response.status_code}, Length {len(response.content)}")
            if response.status_code == 200 and len(response.content) > 50:
                print(f"     Content preview: {response.text[:200]}...")
        except Exception as e:
            print(f"   Date {date_str}: Error - {e}")
    
    # Test 4: Try REST APIs
    print("\n4. Testing REST APIs...")
    rest_endpoints = [
        "https://www.cbr-xml-daily.ru/daily_json.js",
        "https://www.cbr-xml-daily.ru/latest.js"
    ]
    
    for endpoint in rest_endpoints:
        try:
            response = requests.get(endpoint, timeout=5)
            print(f"   {endpoint}: Status {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                keys = list(data.keys())[:10]  # Show first 10 keys
                print(f"     Keys: {keys}")
                if 'RUONIA' in data:
                    print(f"     RUONIA found: {data['RUONIA']}")
        except Exception as e:
            print(f"   {endpoint}: Error - {e}")

if __name__ == "__main__":
    test_ruonia_sources()