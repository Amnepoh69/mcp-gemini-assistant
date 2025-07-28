"""Data upload API routes."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io
import json
import logging
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.data_upload import DataUpload, DataUploadStatus
from app.api.dependencies import get_current_user
from app.services.upload_service import UploadService
from app.services.validation_service import ValidationService

router = APIRouter()

@router.post("/upload", response_model=dict)
async def upload_file(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a CSV or Excel file."""
    
    # Validate file type
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Only CSV and Excel files are supported"
        )
    
    # Validate file size (10MB limit)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 10MB limit"
        )
    
    # Reset file pointer
    await file.seek(0)
    
    try:
        # Create upload record
        upload_record = DataUpload(
            user_id=current_user.id,
            name=name,
            description=description,
            source_type=file.filename.split('.')[-1].lower(),
            file_size=len(file_content),
            status=DataUploadStatus.PROCESSING
        )
        
        db.add(upload_record)
        db.commit()
        db.refresh(upload_record)
        
        # Process the file
        upload_service = UploadService()
        validation_service = ValidationService()
        
        # Parse file data with encoding detection
        if file.filename.endswith('.csv'):
            # List of encodings to try in order
            encodings_to_try = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1', 'utf-16']
            
            df = None
            used_encoding = None
            
            for encoding in encodings_to_try:
                try:
                    df = pd.read_csv(io.StringIO(file_content.decode(encoding)))
                    used_encoding = encoding
                    break
                except (UnicodeDecodeError, UnicodeError, LookupError):
                    continue
            
            if df is None:
                raise HTTPException(
                    status_code=400,
                    detail="Unable to decode CSV file. Please ensure the file is saved in UTF-8 or standard encoding."
                )
                
            logging.info(f"Successfully parsed CSV file with encoding: {used_encoding}")
            
        else:  # Excel
            try:
                df = pd.read_excel(io.BytesIO(file_content))
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unable to read Excel file: {str(e)}"
                )
        
        # Check if dataframe is empty
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty or contains no valid data rows."
            )
        
        logging.info(f"Successfully parsed file with {len(df)} rows and {len(df.columns)} columns")
        logging.info(f"Columns: {list(df.columns)}")
        
        # Validate data
        validation_errors = validation_service.validate_financial_data(df, category)
        
        # Convert to JSON for storage
        data_dict = df.to_dict(orient='records')
        
        # Update upload record
        upload_record.raw_data = data_dict
        upload_record.row_count = len(df)
        upload_record.validation_errors = validation_errors
        upload_record.status = DataUploadStatus.COMPLETED if not validation_errors else DataUploadStatus.FAILED
        
        db.commit()
        db.refresh(upload_record)
        
        return {
            "upload_id": upload_record.id,
            "status": upload_record.status.value,
            "row_count": upload_record.row_count,
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "validation_errors": validation_errors,
            "preview_data": data_dict[:5] if data_dict else [],  # First 5 rows
            "encoding_used": used_encoding if file.filename.endswith('.csv') else None
        }
        
    except Exception as e:
        # Update upload record with error
        if 'upload_record' in locals():
            upload_record.status = DataUploadStatus.FAILED
            upload_record.processing_log = str(e)
            db.commit()
        
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )

@router.post("/manual", response_model=dict)
async def create_manual_entry(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form(...),
    entries: str = Form(...),  # JSON string of entries
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a manual data entry."""
    
    try:
        # Parse entries JSON
        entries_data = json.loads(entries)
        
        # Create upload record
        upload_record = DataUpload(
            user_id=current_user.id,
            name=name,
            description=description,
            source_type="manual",
            raw_data=entries_data,
            row_count=len(entries_data),
            status=DataUploadStatus.COMPLETED
        )
        
        db.add(upload_record)
        db.commit()
        db.refresh(upload_record)
        
        return {
            "upload_id": upload_record.id,
            "status": upload_record.status.value,
            "row_count": upload_record.row_count,
            "data": entries_data
        }
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON format for entries"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating manual entry: {str(e)}"
        )

@router.get("/uploads", response_model=List[dict])
async def get_uploads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all uploads for the current user."""
    
    uploads = db.query(DataUpload).filter(
        DataUpload.user_id == current_user.id
    ).order_by(DataUpload.created_at.desc()).all()
    
    return [
        {
            "id": upload.id,
            "name": upload.name,
            "description": upload.description,
            "source_type": upload.source_type,
            "status": upload.status.value,
            "row_count": upload.row_count,
            "file_size": upload.file_size,
            "created_at": upload.created_at.isoformat(),
            "updated_at": upload.updated_at.isoformat()
        }
        for upload in uploads
    ]

@router.get("/uploads/{upload_id}", response_model=dict)
async def get_upload(
    upload_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific upload by ID."""
    
    upload = db.query(DataUpload).filter(
        DataUpload.id == upload_id,
        DataUpload.user_id == current_user.id
    ).first()
    
    if not upload:
        raise HTTPException(
            status_code=404,
            detail="Upload not found"
        )
    
    return {
        "id": upload.id,
        "name": upload.name,
        "description": upload.description,
        "source_type": upload.source_type,
        "status": upload.status.value,
        "row_count": upload.row_count,
        "file_size": upload.file_size,
        "raw_data": upload.raw_data,
        "validation_errors": upload.validation_errors,
        "created_at": upload.created_at.isoformat(),
        "updated_at": upload.updated_at.isoformat()
    }

@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an upload."""
    
    upload = db.query(DataUpload).filter(
        DataUpload.id == upload_id,
        DataUpload.user_id == current_user.id
    ).first()
    
    if not upload:
        raise HTTPException(
            status_code=404,
            detail="Upload not found"
        )
    
    db.delete(upload)
    db.commit()
    
    return {"message": "Upload deleted successfully"}

@router.get("/template/{category}")
async def download_template(category: str):
    """Download a template file for the specified category."""
    
    # Template data based on category
    templates = {
        "revenue": {
            "columns": ["date", "amount", "source", "description"],
            "sample_data": [
                ["2024-01-01", 10000, "Sales", "Q1 sales revenue"],
                ["2024-02-01", 12000, "Sales", "Q1 sales revenue"],
                ["2024-03-01", 15000, "Sales", "Q1 sales revenue"]
            ]
        },
        "expenses": {
            "columns": ["date", "amount", "category", "description"],
            "sample_data": [
                ["2024-01-01", 5000, "Marketing", "Ad spend"],
                ["2024-02-01", 3000, "Office", "Rent"],
                ["2024-03-01", 2000, "Software", "SaaS subscriptions"]
            ]
        },
        "cash_flow": {
            "columns": ["date", "inflow", "outflow", "net_flow", "description"],
            "sample_data": [
                ["2024-01-01", 15000, 8000, 7000, "Monthly cash flow"],
                ["2024-02-01", 18000, 9000, 9000, "Monthly cash flow"],
                ["2024-03-01", 20000, 10000, 10000, "Monthly cash flow"]
            ]
        }
    }
    
    if category not in templates:
        raise HTTPException(
            status_code=400,
            detail="Invalid category"
        )
    
    template = templates[category]
    
    # Create DataFrame
    df = pd.DataFrame(template["sample_data"], columns=template["columns"])
    
    # Convert to Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name=category.capitalize())
    
    output.seek(0)
    
    return JSONResponse(
        content={"message": "Template would be downloaded in a real implementation"},
        headers={
            "Content-Disposition": f"attachment; filename={category}_template.xlsx"
        }
    )