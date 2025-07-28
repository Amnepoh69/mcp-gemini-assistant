# CFO/CTO Helper MVP - Testing Instructions

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Python 3.11+
- PostgreSQL running locally

### 1. Start Backend Server
```bash
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Frontend Server
```bash
cd frontend
npm run dev
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Debug Page**: http://localhost:3000/debug (for API testing)
- **Auth Test Page**: http://localhost:3000/auth-test (for authentication testing)

## 🔐 Test Credentials

### Login Credentials
- **Email**: `test@example.com`
- **Password**: `TestPassword123!`

### User Details
- **Name**: Test User
- **Role**: Analyst
- **Status**: Active

## 📋 Testing Scenarios

### 1. Authentication Testing
1. **Visit**: http://localhost:3000/
2. **Expected**: Login form appears after "Initializing..." message
3. **Login**: Use test credentials above
4. **Expected**: Redirects to dashboard without hydration errors

### 2. Dashboard Testing
1. **After login**: Should see dashboard with:
   - Welcome message
   - Quick action cards
   - Upload Data, New Analysis, Sample Report buttons
   - Recent activity section
   - Alerts panel
   - Statistics cards

### 3. Data Upload Testing
1. **Click**: "Upload Data" button
2. **Test**: Upload CSV/Excel file
3. **Expected**: File progress tracking and success message

### 4. Scenario Analysis Testing
1. **Visit**: http://localhost:3000/scenarios
2. **Click**: "New Scenario" button
3. **Create**: Revenue forecast scenario
4. **Expected**: Analysis results with interactive charts

### 5. Visualization Testing
1. **After scenario analysis**: Should see:
   - Line charts for revenue forecasting
   - Bar charts for cost analysis
   - Pie charts for cost breakdown
   - Tornado charts for risk assessment
   - Interactive tooltips and export options

## 🛠️ API Testing

### Health Check
```bash
curl -s http://localhost:8000/health
```

### Authentication
```bash
# Login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@example.com\", \"password\": \"TestPassword123!\"}"

# Get user profile
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Scenario Analysis
```bash
# Create scenario
curl -X POST "http://localhost:8000/api/v1/scenarios" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Q1 Revenue Forecast",
    "type": "revenue_forecast",
    "parameters": {
      "time_period": 12,
      "growth_rate": 0.05
    }
  }'
```

## 🔍 Troubleshooting

### Common Issues

1. **Backend not starting**
   - Check PostgreSQL is running
   - Install dependencies: `pip install -r requirements.txt`
   - Check port 8000 is available

2. **Frontend not loading**
   - Check port 3000 is available
   - Run `npm install` if needed
   - Clear browser cache

3. **Authentication errors**
   - Verify backend API URL in frontend (should be port 8000)
   - Check test credentials are correct
   - Clear localStorage and cookies: visit `/auth-test` page and click "Clear All Data"
   - Use debug pages: `/debug` and `/auth-test`

4. **Hydration errors**
   - Should be fixed with AuthProvider component
   - Check browser console for specific errors

5. **"Not authenticated" errors**
   - Tokens are now stored in both localStorage and cookies
   - Clear all browser data and try fresh login
   - Check API endpoints are using correct prefix `/api/v1/`

### Debug Commands
```bash
# Check running processes
lsof -i :3000
lsof -i :8000

# Kill processes if needed
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Check logs
tail -f backend/logs/app.log
```

## 📊 Features to Test

### ✅ Completed Features
- [x] User authentication (login/register)
- [x] Password validation (8+ characters)
- [x] Dashboard with quick actions
- [x] Data upload (CSV/Excel)
- [x] Scenario creation and analysis
- [x] 5 types of scenario analysis:
  - Revenue forecast
  - Cost analysis
  - Cash flow
  - Risk assessment
  - Market scenario
- [x] Interactive visualizations:
  - Line charts
  - Bar charts
  - Pie charts
  - Tornado charts
  - Scatter plots
- [x] Scenario results with charts
- [x] Export functionality (PDF)
- [x] Hydration error fixes
- [x] Token storage improvements (localStorage + cookies)
- [x] API authentication debugging tools
- [x] Debug and auth test pages

### 🔄 In Progress
- [ ] Complete export functionality
- [ ] Alerts and notifications
- [ ] Dashboard integration improvements

## 🎯 Success Criteria

The MVP is working correctly if:
1. ✅ No hydration errors in browser console
2. ✅ Smooth authentication flow
3. ✅ Dashboard loads without errors
4. ✅ File upload works
5. ✅ Scenario analysis generates charts
6. ✅ Charts are interactive and responsive
7. ✅ Export functionality works

## 🔧 Technical Details

### Architecture
- **Frontend**: Next.js 12 + TypeScript + Tailwind CSS
- **Backend**: FastAPI + PostgreSQL + SQLAlchemy
- **Charts**: Recharts library
- **Auth**: JWT tokens with refresh mechanism
- **State**: Zustand for client state management

### File Structure
```
project-c-level-claude/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/          # Chart components
│   │   │   ├── dashboard/       # Dashboard components
│   │   │   ├── scenarios/       # Scenario components
│   │   │   └── visualization/   # Visualization components
│   │   ├── pages/
│   │   │   ├── scenarios.tsx    # Scenario analysis page
│   │   │   └── dashboard.tsx    # Main dashboard
│   │   └── services/
│   │       └── visualizationService.ts
└── backend/
    ├── app/
    │   ├── api/routes/
    │   ├── services/
    │   └── models/
    └── requirements.txt
```

---

**Status**: MVP Complete and Ready for Testing!
**Last Updated**: July 16, 2025