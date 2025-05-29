# Enhanced Inventory Actions Guide

## Overview

The inventory actions system allows form fields (especially calculated fields) to automatically update inventory levels when forms are submitted. This is perfect for intake forms, inventory counts, and usage tracking.

## How It Works

### Field Types Supporting Inventory Actions
- **Number fields**: Direct numeric input
- **Calculated fields**: Formula-based values (PERFECT for totals and conversions)
- **Current Inventory fields**: Special inventory tracking fields

### Action Types

#### 1. 🔼 ADD - Add to current stock
**Use Case**: Intake forms, receiving inventory, additions

**Example**: 
- Current stock: 17 gallons
- Form field value: 5 gallons  
- New stock: 22 gallons (17 + 5)

**Perfect for**: "I just received 5 more gallons"

#### 2. 🔽 SUBTRACT - Subtract from current stock  
**Use Case**: Usage forms, consumption tracking, removals

**Example**:
- Current stock: 20 gallons
- Form field value: 3 gallons
- New stock: 17 gallons (20 - 3)

**Perfect for**: "I used 3 gallons of paint"

#### 3. 📋 SET - Set as new stock level
**Use Case**: Inventory counts, physical audits, monthly checks

**Example**:
- Previous stock: 20 gallons
- Form field value: 17 gallons  
- New stock: 17 gallons (set to this amount)
- **Automatically tracks**: 3 gallons as "used/consumed" in history

**Perfect for**: "I counted 17 gallons total in the tank"

#### 4. 📊 NONE - Just track value
**Use Case**: Reference data, notes, measurements

**Example**: Records the value but doesn't affect inventory levels

## Enhanced Features

### Visual Indicators
- Form fields with inventory actions show colored badges
- 🔼 ADD = Green badge
- 🔽 SUB = Orange badge  
- 📋 SET = Blue badge

### Real-World Examples

#### Monthly Paint Inventory Form
```
Tank 1: [15] gallons (calculated field) → 📋 SET
Tank 2: [8] gallons (calculated field) → 📋 SET  
Tank 3: [12] gallons (calculated field) → 📋 SET
Total: [35] gallons (calculated: Tank1 + Tank2 + Tank3) → 📋 SET
```

Result: Each tank gets its individual count, total is calculated automatically

#### Paint Intake Form
```
Gallons Received: [5] → 🔼 ADD
Supplier: [ABC Paint Co] → 📊 NONE
Date Received: [2024-01-15] → 📊 NONE
```

Result: 5 gallons added to current stock, other fields tracked for records

#### Usage Tracking Form
```
Job Name: [Kitchen Renovation] → 📊 NONE
Gallons Used: [3.5] → 🔽 SUBTRACT
Start Time: [09:00] → 📊 NONE
End Time: [17:00] → 📊 NONE
```

Result: 3.5 gallons subtracted from stock, job details tracked

### Calculated Fields Power

**Why calculated fields are perfect**:
- Can sum multiple tank measurements
- Apply unit conversions (quarts to gallons)
- Calculate usage based on start/end readings
- Combine multiple related values

**Example Formula**:
```
Tank_A + Tank_B + Tank_C
```
If this calculated field has "SET" action, it will set the total inventory based on the sum of individual tank readings.

### History Tracking

Every inventory action creates detailed history records including:
- Previous quantity
- New quantity  
- Change amount and description
- Which form field caused the change
- Full form submission data
- Automatic "usage" tracking for SET actions

### Advanced Usage

#### Multiple Actions in One Form
- Only ONE "SET" action per form (takes priority)
- Multiple "ADD" and "SUBTRACT" actions are combined
- SET always overrides ADD/SUBTRACT

#### Processing Order
1. SET actions (highest priority)
2. ADD actions (applied to SET result or current stock)
3. SUBTRACT actions (applied after ADD)

#### Safety Features
- Inventory never goes below 0
- Invalid numbers are ignored
- Detailed logging for troubleshooting
- Full audit trail in history

## Backend Implementation

### Form Submission Process
1. Parse form schema for inventory_action fields
2. Find matching field values in submission
3. Process SET actions first (override everything)
4. Process ADD/SUBTRACT actions
5. Update inventory_items table
6. Create detailed inventory_history record
7. Log all changes for audit

### History Record Structure
```json
{
  "inventory_item_id": "uuid",
  "quantity": 22,
  "notes": "Form: Paint Intake. Changes: Added 5 units via Gallons Received",
  "response_data": {
    "gallons_received": 5,
    "supplier": "ABC Paint Co",
    "_inventory_changes": [
      {
        "action": "add",
        "field": "Gallons Received", 
        "value": 5,
        "description": "Added 5 units via Gallons Received"
      }
    ],
    "_previous_quantity": 17
  }
}
```

## Best Practices

### Form Design
1. Use calculated fields for totals
2. Put inventory actions on final calculated values
3. Use clear field labels
4. Add helpful descriptions

### Inventory Counts  
1. Use SET action on calculated total
2. Include individual measurement fields
3. Add location and notes fields
4. Set up monthly/periodic forms

### Intake Forms
1. Use ADD action on quantity received
2. Include supplier, date, batch info
3. Track unit costs if needed
4. Link to purchase orders

### Usage Forms
1. Use SUBTRACT for consumption
2. Track job/project details
3. Include start/end dates
4. Note equipment or location used

This enhanced system provides complete inventory automation while maintaining detailed audit trails and supporting complex calculated field scenarios. 