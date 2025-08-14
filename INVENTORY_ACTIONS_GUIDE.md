# Enhanced Inventory Actions Guide

## Overview

The inventory actions system allows form fields to automatically update inventory levels when forms are submitted. This system integrates with the asset management workflow and supports various field types for flexible inventory tracking.

## How It Works

### Field Types Supporting Inventory Actions
- **Number fields**: Direct numeric input with inventory actions
- **Calculated fields**: Formula-based values (PERFECT for totals and conversions)
- **Current Inventory fields**: Specialized fields designed for inventory tracking

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
- Form fields with inventory actions show colored badges in the form builder
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
- Previous quantity and new quantity  
- Change amount and detailed description
- Which form field caused the change
- Complete form submission data with metadata
- Automatic usage calculation for SET actions
- User ID and timestamp tracking

### Advanced Usage

#### Processing Order (CRITICAL)
1. **SET actions have HIGHEST priority** - Only ONE SET action per form is processed
2. **ADD/SUBTRACT actions are ignored** if a SET action exists
3. **Multiple SET actions** will trigger a warning, first one wins
4. **Zero quantity protection** - inventory never goes below 0

#### Safety Features
- Inventory quantities are clamped to minimum of 0
- Invalid numbers are automatically ignored
- Detailed logging for troubleshooting
- Complete audit trail in inventory_history table
- Automatic event type detection based on form type

#### Event Type Detection
The system automatically determines the correct event type:
- **Form Type: 'intake'** → Event: 'intake'
- **Form Type: 'inventory'** → Event: 'audit' 
- **Default** → Event: 'audit'

## Backend Implementation

### Form Submission Process
1. Parse form schema to find fields with `inventory_action` property
2. Find matching field values in form submission data
3. **Priority 1**: Process SET actions first (overrides everything)
4. **Priority 2**: Process ADD/SUBTRACT actions (only if no SET action)
5. Update `inventory_items` table with final quantity
6. Create detailed `inventory_history` record with change tracking
7. Set appropriate event_type based on form type

### History Record Structure
```json
{
  "inventory_item_id": "uuid",
  "quantity": 22,
  "notes": "Form: Paint Intake. Changes: Added 5 units via Gallons Received",
  "event_type": "intake",
  "check_type": "form_submission",
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

### Database Integration
- **inventory_items**: Main inventory tracking table
- **inventory_history**: Complete audit trail with form data
- **assets**: Linked to inventory items for asset-based tracking
- **organization_members**: User tracking for audit purposes

## Form Builder Integration

### Setting Up Inventory Actions
1. Add Number, Calculated, or Current Inventory field to form
2. Select inventory action in field properties panel
3. Choose from: None, Add, Subtract, or Set
4. Preview examples and descriptions in real-time
5. Visual badges automatically appear on fields with actions

### Field Type Recommendations
- **Number fields**: Direct measurements, simple inputs
- **Calculated fields**: Totals, conversions, complex calculations
- **Current Inventory fields**: Specialized for count workflows

## Best Practices

### Form Design
1. Use calculated fields for automatic totals
2. Apply SET action on final calculated inventory values
3. Use clear, descriptive field labels
4. Add helpful descriptions for user guidance

### Inventory Count Forms  
1. Use SET action on calculated total field
2. Include individual measurement fields for transparency
3. Add location and condition notes
4. Design for monthly/periodic use

### Intake Forms
1. Use ADD action on quantity received
2. Include supplier, date, batch information
3. Track unit costs and purchase order data
4. Link to asset management workflow

### Usage/Consumption Forms
1. Use SUBTRACT for actual consumption
2. Track job/project details for accountability
3. Include start/end times and locations
4. Document equipment or personnel involved

## Troubleshooting

### Common Issues
- **Multiple SET actions**: Only first SET field is processed, others ignored
- **Negative quantities**: Automatically clamped to 0 for safety
- **Missing inventory item**: Form submission fails if asset has no inventory record
- **Invalid numbers**: Non-numeric values are silently ignored

### Debugging Tips
- Check browser console for inventory action processing logs
- Review inventory_history table for complete audit trail
- Verify form schema has correct `inventory_action` properties
- Confirm asset has associated inventory_items record

This enhanced system provides complete inventory automation while maintaining detailed audit trails and supporting complex calculated field scenarios with robust error handling. 