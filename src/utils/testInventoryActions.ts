// Test utility for inventory actions
export interface TestFormField {
  id: string;
  label: string;
  type: string;
  inventory_action: 'add' | 'subtract' | 'set' | 'none';
}

export interface TestFormSchema {
  fields: TestFormField[];
}

export interface TestFormData {
  [fieldId: string]: any;
}

export interface InventoryChange {
  action: string;
  field: string;
  value: number;
  description: string;
}

/**
 * Test function that simulates the inventory action processing logic
 * This mirrors the logic in formSubmissionService.ts
 */
export function testInventoryActions(
  currentQuantity: number,
  formSchema: TestFormSchema,
  formData: TestFormData
): {
  newQuantity: number;
  foundAction: boolean;
  changes: InventoryChange[];
} {
  let newQuantity = currentQuantity;
  let foundInventoryAction = false;
  let inventoryChanges: InventoryChange[] = [];

  if (!formSchema || !formSchema.fields || !formData) {
    return { newQuantity: currentQuantity, foundAction: false, changes: [] };
  }

  // Priority 1: Check for 'set' actions first (they override everything)
  const setField = formSchema.fields.find(field => 
    field.inventory_action === 'set' && 
    formData[field.id] !== undefined &&
    formData[field.id] !== null
  );
  
  if (setField) {
    const setValue = Number(formData[setField.id]);
    if (!isNaN(setValue)) {
      const previousQuantity = newQuantity;
      newQuantity = setValue;
      foundInventoryAction = true;
      
      // Calculate usage/difference for history tracking
      const difference = previousQuantity - setValue;
      const changeDescription = difference > 0 
        ? `${difference} units used/consumed` 
        : difference < 0 
          ? `${Math.abs(difference)} units added`
          : 'No change in quantity';
      
      inventoryChanges.push({
        action: 'set',
        field: setField.label || setField.id,
        value: setValue,
        description: `Stock count set to ${setValue} (was ${previousQuantity}). ${changeDescription}`
      });
    }
  } else {
    // Priority 2: Process add/subtract actions
    formSchema.fields.forEach(field => {
      const value = formData[field.id];
      if (value !== undefined && value !== null && field.inventory_action && field.inventory_action !== 'none') {
        const numValue = Number(value);
        if (!isNaN(numValue) && numValue !== 0) {
          switch (field.inventory_action) {
            case 'add':
              newQuantity += numValue;
              foundInventoryAction = true;
              inventoryChanges.push({
                action: 'add',
                field: field.label || field.id,
                value: numValue,
                description: `Added ${numValue} units via ${field.label}`
              });
              break;
            case 'subtract':
              newQuantity -= numValue;
              foundInventoryAction = true;
              inventoryChanges.push({
                action: 'subtract',
                field: field.label || field.id,
                value: numValue,
                description: `Subtracted ${numValue} units via ${field.label}`
              });
              break;
          }
        }
      }
    });
  }

  // Ensure quantity doesn't go negative
  const finalQuantity = Math.max(0, newQuantity);

  return {
    newQuantity: finalQuantity,
    foundAction: foundInventoryAction,
    changes: inventoryChanges
  };
}

// Test cases
export function runInventoryActionTests() {
  const tests = [
    {
      name: "Monthly Inventory Count (SET action)",
      currentQuantity: 20,
      formSchema: {
        fields: [
          { id: 'total_count', label: 'Total Gallons Counted', type: 'calculated', inventory_action: 'set' as const }
        ]
      },
      formData: { total_count: 17 },
      expected: { newQuantity: 17, foundAction: true, usageTracked: 3 }
    },
    {
      name: "Paint Intake (ADD action)",
      currentQuantity: 17,
      formSchema: {
        fields: [
          { id: 'gallons_received', label: 'Gallons Received', type: 'number', inventory_action: 'add' as const }
        ]
      },
      formData: { gallons_received: 5 },
      expected: { newQuantity: 22, foundAction: true }
    },
    {
      name: "Paint Usage (SUBTRACT action)",
      currentQuantity: 20,
      formSchema: {
        fields: [
          { id: 'gallons_used', label: 'Gallons Used', type: 'number', inventory_action: 'subtract' as const }
        ]
      },
      formData: { gallons_used: 3 },
      expected: { newQuantity: 17, foundAction: true }
    },
    {
      name: "Multiple actions (ADD + SUBTRACT)",
      currentQuantity: 20,
      formSchema: {
        fields: [
          { id: 'gallons_received', label: 'Gallons Received', type: 'number', inventory_action: 'add' as const },
          { id: 'gallons_used', label: 'Gallons Used', type: 'number', inventory_action: 'subtract' as const }
        ]
      },
      formData: { gallons_received: 5, gallons_used: 3 },
      expected: { newQuantity: 22, foundAction: true } // 20 + 5 - 3 = 22
    },
    {
      name: "SET overrides ADD/SUBTRACT",
      currentQuantity: 20,
      formSchema: {
        fields: [
          { id: 'total_count', label: 'Total Count', type: 'calculated', inventory_action: 'set' as const },
          { id: 'gallons_received', label: 'Gallons Received', type: 'number', inventory_action: 'add' as const }
        ]
      },
      formData: { total_count: 15, gallons_received: 5 },
      expected: { newQuantity: 15, foundAction: true } // SET to 15, ignores ADD of 5
    },
    {
      name: "No inventory actions (NONE)",
      currentQuantity: 20,
      formSchema: {
        fields: [
          { id: 'notes', label: 'Notes', type: 'text', inventory_action: 'none' as const }
        ]
      },
      formData: { notes: 'Just a note' },
      expected: { newQuantity: 20, foundAction: false }
    }
  ];

  console.log("🧪 Running Inventory Action Tests...\n");

  tests.forEach((test, index) => {
    const result = testInventoryActions(test.currentQuantity, test.formSchema, test.formData);
    
    const passed = result.newQuantity === test.expected.newQuantity && 
                   result.foundAction === test.expected.foundAction;
    
    console.log(`${index + 1}. ${test.name}`);
    console.log(`   Current: ${test.currentQuantity} → New: ${result.newQuantity} (expected: ${test.expected.newQuantity})`);
    console.log(`   Found Action: ${result.foundAction} (expected: ${test.expected.foundAction})`);
    console.log(`   Changes: ${result.changes.map(c => c.description).join('; ')}`);
    console.log(`   ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  });

  console.log("✨ All tests completed!");
} 