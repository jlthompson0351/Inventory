# Form Builder Documentation

The Form Builder is a comprehensive tool for creating dynamic, customizable forms with advanced features including calculated fields, inventory actions, and asset type integration.

## Features Overview

### 🔧 Core Features
- **Dynamic Field Types**: Text, number, textarea, select, date, checkbox, calculated, and current inventory fields
- **Drag & Drop Reordering**: Easily reorder fields with intuitive drag-and-drop interface
- **Real-time Preview**: See exactly how your form will look while building it
- **Asset Type Integration**: Link forms to asset types for enhanced field mapping
- **Formula Builder**: Advanced visual and text-based formula editor with conversion field support
- **Inventory Actions**: Configure how fields affect inventory levels (add, subtract, set, none)
- **Bulk Operations**: Import/export fields, clear all fields at once
- **Field Validation**: Built-in validation for required fields and formula syntax

### 🧮 Advanced Formula System
- **Visual Formula Builder**: Drag-and-drop interface for building complex formulas
- **Text Editor Mode**: Direct text editing with syntax highlighting (recommended for stability)
- **Conversion Field Integration**: Access conversion fields from linked asset types
- **Cross-Form Field Mapping**: Reference fields from other forms in the same asset type
- **Real-time Formula Validation**: Instant feedback on formula syntax and field references
- **Mock Value Testing**: Test formulas with sample data before deployment

### 🏭 Asset Type Integration
- **Automatic Linking**: Forms can be automatically linked to asset types during creation
- **Conversion Fields**: Access unit conversion fields defined in asset types
- **Mapped Field Inheritance**: Inherit field mappings from other forms linked to the same asset type
- **Visual Asset Type Panel**: See all available conversion and mapped fields at a glance

## Getting Started

### Creating a New Form

1. **Navigate to Forms**: Go to the Forms section in the main navigation
2. **Click "Create Form"**: Start building your new form
3. **Select Asset Type** (recommended): Choose which asset type this form relates to
4. **Add Basic Information**:
   - Form title
   - Description
   - Purpose (optional: intake, inventory, adjustment, transfer, audit, other)

### Adding Fields

#### Basic Field Types

**Text Field**
- Single-line text input
- Configurable placeholder text
- Optional validation (required/optional)

**Number Field**
- Numeric input with validation
- Supports decimal numbers
- Can be configured with inventory actions

**Textarea**
- Multi-line text input
- Adjustable height
- Perfect for descriptions or notes

**Select (Dropdown)**
- Dropdown menu with custom options
- Add/remove options dynamically
- Single selection only

**Date Field**
- Date picker interface
- Standardized date format
- Optional validation

**Checkbox**
- Boolean true/false input
- Single checkbox per field
- No placeholder text

#### Advanced Field Types

**Current Inventory**
- Special field type for baseline inventory tracking
- Automatically marked as mappable
- Creates initial inventory records
- Required by default for data integrity

**Calculated Field**
- Dynamic fields that compute values based on formulas
- Access to other form fields and conversion fields
- Real-time calculation preview
- Formula validation and error handling

### Field Configuration

Each field can be configured with:

- **Label**: Display name shown to users
- **Type**: Field type (cannot be changed after creation in some cases)
- **Placeholder**: Helper text shown in empty fields
- **Required**: Whether the field must be filled out
- **Mappable**: Whether the field can be referenced in formulas
- **Inventory Action**: How the field affects inventory levels
- **Description**: Help text shown below the field

#### Inventory Actions

- **None**: Field value is recorded but doesn't affect inventory
- **Add**: Field value is added to current inventory
- **Subtract**: Field value is subtracted from current inventory  
- **Set**: Field value replaces the current inventory amount

### Formula Builder

#### Text Editor Mode (Recommended)

The text editor provides a stable, reliable way to create formulas:

**Syntax:**
- `{field_id}` - Reference other form fields
- `{mapped.field_name}` - Reference conversion fields from asset types
- Standard mathematical operators: `+`, `-`, `*`, `/`, `%`, `**` (power)
- Parentheses for grouping: `(`, `)`
- Numbers: `123`, `45.67`

**Example Formulas:**
```
{field_1} * {mapped.convert_gallons_to_liters}
({field_2} + {field_3}) * 0.5
{mapped.base_rate} + ({field_1} * {mapped.multiplier})
```

**Features:**
- Real-time syntax validation
- Formula preview with mock data
- Quick field insertion via dropdowns
- Automatic formula completion suggestions

#### Visual Builder Mode

The visual builder provides a drag-and-drop interface:

- **Form Fields**: Drag fields from your current form
- **Conversions**: Use conversion fields from linked asset types
- **Operators**: Add mathematical operators
- **Numbers**: Insert numeric values
- **Parentheses**: Group operations

*Note: Text editor mode is recommended for stability and reliability.*

#### Formula Testing

**Mock Values System:**
- Set test values for conversion fields and form fields
- See real-time calculation results
- Save and load mock value sets for different scenarios
- Test edge cases before deploying forms

### Asset Type Integration

#### Linking Forms to Asset Types

**For New Forms:**
1. Select asset type during form creation
2. Choose form purpose (optional)
3. Form is automatically linked and gains access to conversion fields

**For Existing Forms:**
- Forms can be linked to asset types via the Asset Types management page
- Multiple forms can be linked to the same asset type
- Cross-form field references become available

#### Conversion Fields

Conversion fields are defined in Asset Types and provide:
- Unit conversions (gallons to liters, inches to centimeters, etc.)
- Standard calculation factors
- Shared values across multiple forms
- Centralized management of conversion rates

#### Mapped Fields

Mapped fields allow forms to reference:
- Fields from other forms linked to the same asset type
- Conversion fields from the asset type
- Cross-form calculations and dependencies

### Bulk Operations

#### Export Fields
- **Export All Fields**: Download complete field definitions as JSON
- **Export Mappable Only**: Download only fields marked as mappable
- Use for backups, templates, or sharing between organizations

#### Import Fields
- Import field definitions from JSON files
- Fields are added to existing form (not replaced)
- Automatic ID generation prevents conflicts
- Inventory actions are validated during import

#### Clear All Fields
- Remove all fields from the form
- Requires confirmation to prevent accidental data loss
- Irreversible operation

### Form Management

#### Saving Forms
- Forms auto-save as you build them
- All formula builders reset to text mode after saving (for stability)
- Validation ensures required information is present
- Asset type linking is preserved

#### Form Validation
- Title is required
- At least one field must be present
- Formula syntax is validated
- Field references are checked
- Inventory actions are validated

#### Form Organization
- Forms are organized by organization
- Asset type linking provides additional organization
- Search and filter capabilities
- Form purpose helps categorize usage

## Best Practices

### Form Design
1. **Start with Asset Type**: Link forms to asset types early for better field availability
2. **Use Descriptive Labels**: Make field labels clear and unambiguous
3. **Add Help Text**: Use description fields to guide users
4. **Logical Field Order**: Arrange fields in a logical sequence for users
5. **Group Related Fields**: Keep related fields near each other

### Formula Creation
1. **Use Text Editor**: Text editor mode is more stable than visual builder
2. **Test Thoroughly**: Use mock values to test all scenarios
3. **Keep Formulas Simple**: Break complex calculations into multiple fields
4. **Document Formulas**: Use description fields to explain complex calculations
5. **Validate References**: Ensure all referenced fields exist and are mappable

### Inventory Management
1. **One Inventory Field**: Use only one "Current Inventory" field per form
2. **Clear Actions**: Be explicit about inventory actions (add/subtract/set)
3. **Calculated Totals**: Use calculated fields for running totals
4. **Validation**: Include validation fields to check calculation accuracy

### Asset Type Integration
1. **Define Conversions First**: Set up conversion fields in asset types before building forms
2. **Consistent Naming**: Use consistent naming conventions for conversion fields
3. **Document Relationships**: Clearly document how forms relate to asset types
4. **Test Cross-References**: Verify that cross-form field references work correctly

## Troubleshooting

### Common Issues

**Formula Not Working**
- Check field references are correct (`{field_id}` format)
- Verify referenced fields are marked as mappable
- Ensure conversion fields exist in linked asset type
- Test with mock values to isolate issues

**Fields Not Available in Formulas**
- Confirm fields are marked as mappable
- Check asset type is properly linked
- Verify conversion fields are defined in asset type
- Refresh page if fields were recently added

**Visual Builder Flickering**
- Switch to text editor mode (recommended)
- Visual builder has known stability issues with certain field configurations
- Text editor provides the same functionality with better reliability

**Inventory Actions Not Working**
- Verify inventory action is set correctly (add/subtract/set/none)
- Check field type supports inventory actions (number, calculated, current_inventory)
- Ensure form is properly saved
- Validate field values are numeric

### Performance Tips

1. **Limit Complex Formulas**: Very complex formulas can slow down form rendering
2. **Use Text Editor**: Text editor mode is faster and more stable
3. **Minimize Cross-References**: Excessive cross-form references can impact performance
4. **Regular Cleanup**: Remove unused fields and formulas periodically

## API Integration

Forms created with the Form Builder integrate with the inventory system API:

- **Form Submission**: Submitting forms automatically updates inventory based on field actions
- **Calculation Engine**: Formulas are evaluated server-side for security and consistency
- **Validation**: Field validation occurs both client-side and server-side
- **Asset Integration**: Asset type links are maintained through the API

## Security Considerations

- **Formula Sandboxing**: Formulas are evaluated in a secure sandbox environment
- **Input Validation**: All form inputs are validated and sanitized
- **Organization Isolation**: Forms are isolated by organization for security
- **Permission Checking**: User permissions are verified for all form operations

## Future Enhancements

Planned improvements for the Form Builder:

- **Conditional Fields**: Show/hide fields based on other field values
- **Multi-Step Forms**: Break large forms into manageable steps
- **Template System**: Save and reuse form templates
- **Advanced Validation**: Custom validation rules and patterns
- **Workflow Integration**: Connect forms to approval workflows
- **Mobile Optimization**: Enhanced mobile form building experience

## Support

For additional help with the Form Builder:

1. Check this documentation for answers to common questions
2. Review the in-app help text and tooltips
3. Test features in a development environment before production use
4. Contact system administrators for organization-specific assistance

---

*Last updated: December 2024* 