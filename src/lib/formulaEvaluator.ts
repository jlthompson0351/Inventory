/**
 * Enhanced Formula Evaluator - Industrial Inventory Management Focus
 * 
 * Supports:
 * - Regular field references: {field_1}, {field_2}
 * - Mapped field references: {mapped.conversion_rate}, {mapped.tank_inches}
 * - Industrial functions for inventory calculations
 * - Unit conversions and measurement functions
 */

// Enhanced mathematical operators with precedence
const operators: Record<string, { precedence: number, associativity: 'left' | 'right', operation: (a: number, b: number) => number }> = {
  '+': { precedence: 1, associativity: 'left', operation: (a, b) => a + b },
  '-': { precedence: 1, associativity: 'left', operation: (a, b) => a - b },
  '*': { precedence: 2, associativity: 'left', operation: (a, b) => a * b },
  '/': { precedence: 2, associativity: 'left', operation: (a, b) => a / b },
  '%': { precedence: 2, associativity: 'left', operation: (a, b) => a % b },
  '^': { precedence: 3, associativity: 'right', operation: (a, b) => Math.pow(a, b) },
};

// Enhanced mathematical functions for industrial inventory
const functions: Record<string, (...args: number[]) => number> = {
  // Basic Math
  min: Math.min,
  max: Math.max,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sqrt: Math.sqrt,
  pow: Math.pow,
  
  // Statistical Functions
  sum: (...args) => args.reduce((sum, val) => sum + val, 0),
  avg: (...args) => args.length ? args.reduce((sum, val) => sum + val, 0) / args.length : 0,
  count: (...args) => args.length,
  median: (...args) => {
    const sorted = [...args].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },
  
  // Industrial/Inventory Specific Functions
  gallons_from_inches: (inches: number, rate: number = 1) => inches * rate,
  volume_cylinder: (radius: number, height: number) => Math.PI * radius * radius * height,
  volume_rectangle: (length: number, width: number, height: number) => length * width * height,
  
  // Unit Conversions
  inches_to_feet: (inches: number) => inches / 12,
  feet_to_inches: (feet: number) => feet * 12,
  gallons_to_liters: (gallons: number) => gallons * 3.78541,
  liters_to_gallons: (liters: number) => liters / 3.78541,
  pounds_to_kg: (pounds: number) => pounds * 0.453592,
  kg_to_pounds: (kg: number) => kg / 0.453592,
  
  // Financial Functions
  markup: (cost: number, percent: number) => cost * (1 + percent / 100),
  margin: (price: number, cost: number) => ((price - cost) / price) * 100,
  discount: (price: number, percent: number) => price * (1 - percent / 100),
  
  // Percentage Functions
  percent_of: (value: number, total: number) => (value / total) * 100,
  percent_change: (oldVal: number, newVal: number) => ((newVal - oldVal) / oldVal) * 100,
  
  // Utility Functions
  if: (condition: number, trueVal: number, falseVal: number) => condition > 0 ? trueVal : falseVal,
  clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
};

// Enhanced tokenizer to handle negative numbers, decimals, field references, and function calls
function tokenize(expression: string): string[] {
  // Enhanced regex to handle:
  // - Field references: {field_name} or {mapped.field_name}  
  // - Negative numbers: -123.45
  // - Function calls: function_name(
  // - Basic operators and parentheses
  const regex = /((?:\-)?[0-9]*\.?[0-9]+|\+|\-|\*|\/|\^|\%|\(|\)|,|[a-zA-Z_][a-zA-Z0-9_]*|\{[^}]+\})/g;
  return expression.match(regex) || [];
}

// Converts infix notation to postfix (Reverse Polish Notation)
function infixToPostfix(tokens: string[]): string[] {
  const output: string[] = [];
  const operatorStack: string[] = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Numbers and field references go directly to output
    if (/^(?:\-)?[0-9]*\.?[0-9]+$/.test(token) || token.startsWith('{')) {
      output.push(token);
    }
    // Handle functions
    else if (Object.keys(functions).includes(token)) {
      operatorStack.push(token);
    }
    // Handle opening parenthesis
    else if (token === '(') {
      operatorStack.push(token);
    }
    // Handle closing parenthesis
    else if (token === ')') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
        output.push(operatorStack.pop()!);
      }
      operatorStack.pop(); // Remove the '('
      
      // If there's a function on top of the stack, pop it to output
      if (operatorStack.length > 0 && Object.keys(functions).includes(operatorStack[operatorStack.length - 1])) {
        output.push(operatorStack.pop()!);
      }
    }
    // Handle comma (function argument separator)
    else if (token === ',') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
        output.push(operatorStack.pop()!);
      }
    }
    // Handle operators
    else if (operators[token]) {
      const currentOp = operators[token];
      
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1] !== '(' &&
        operators[operatorStack[operatorStack.length - 1]] &&
        (
          operators[operatorStack[operatorStack.length - 1]].precedence > currentOp.precedence ||
          (operators[operatorStack[operatorStack.length - 1]].precedence === currentOp.precedence && 
           currentOp.associativity === 'left')
        )
      ) {
        output.push(operatorStack.pop()!);
      }
      
      operatorStack.push(token);
    }
    else {
      throw new Error(`Unknown token: ${token}`);
    }
  }
  
  // Pop remaining operators
  while (operatorStack.length > 0) {
    const op = operatorStack.pop()!;
    if (op === '(' || op === ')') {
      throw new Error('Mismatched parentheses');
    }
    output.push(op);
  }
  
  return output;
}

// Evaluates a postfix expression
function evaluatePostfix(tokens: string[]): number {
  const stack: number[] = [];
  
  for (const token of tokens) {
    // Numbers (including those that were field references)
    if (/^(?:\-)?[0-9]*\.?[0-9]+$/.test(token)) {
      stack.push(parseFloat(token));
    }
    // Functions
    else if (Object.keys(functions).includes(token)) {
      const func = functions[token];
      const argCount = func.length;
      
      if (argCount === 0) {
        stack.push(func());
      } else {
        // For variadic functions (like sum, avg), determine arg count from context
        if (['sum', 'avg', 'count', 'min', 'max', 'median'].includes(token)) {
          // For variadic functions, take all available values (minimum 1)
          if (stack.length === 0) {
            throw new Error(`Function ${token} requires at least 1 argument`);
          }
          const args = stack.splice(0); // Take all values
          stack.push(func(...args));
        } else {
          // Fixed arity functions
          if (stack.length < argCount) {
            throw new Error(`Function ${token} requires ${argCount} arguments, but only ${stack.length} available`);
          }
          const args = stack.splice(-argCount);
          stack.push(func(...args));
        }
      }
    }
    // Operators
    else if (operators[token]) {
      if (stack.length < 2) {
        throw new Error(`Operator ${token} requires 2 operands, but only ${stack.length} available`);
      }
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(operators[token].operation(a, b));
    }
    else {
      throw new Error(`Unknown token in evaluation: ${token}`);
    }
  }
  
  if (stack.length !== 1) {
    throw new Error(`Invalid expression: expected 1 result but got ${stack.length}`);
  }
  
  return stack[0];
}

/**
 * Enhanced formula evaluation with support for mapped fields
 * 
 * @param {string} formula - The formula to evaluate (e.g., "{field1} + {mapped.conversion_rate} * 10")
 * @param {Record<string, any>} variables - Object containing variable values to substitute
 * @returns {number} - The result of the formula evaluation
 */
export function evaluateFormula(formula: string, variables: Record<string, any>): number {
  try {
    // Early return for empty formula
    if (!formula || formula.trim() === '') {
      return 0;
    }

    // Pre-process formula by replacing variable placeholders
    let processedFormula = formula;
    
    // Replace field references with their values
    for (const [fieldId, value] of Object.entries(variables)) {
      // Handle both regular field references {field_id} and mapped field references {mapped.field_name}
      const patterns = [
        new RegExp(`\\{${fieldId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\}`, 'g'),
        new RegExp(`\\{mapped\\.${fieldId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\}`, 'g')
      ];
      
      patterns.forEach(pattern => {
        const valueAsNumber = parseFloat(String(value)) || 0;
        processedFormula = processedFormula.replace(pattern, valueAsNumber.toString());
      });
    }
    
    // Also handle any remaining mapped field references by key lookup
    processedFormula = processedFormula.replace(/\{mapped\.([^}]+)\}/g, (match, fieldName) => {
      const mappedValue = variables[`mapped.${fieldName}`] || variables[fieldName] || 0;
      const valueAsNumber = parseFloat(String(mappedValue)) || 0;
      return valueAsNumber.toString();
    });
    
    // Replace any remaining field references with 0 (fallback)
    processedFormula = processedFormula.replace(/\{[^}]+\}/g, '0');
    
    // Check for incomplete formulas (ending with operator)
    const trimmedFormula = processedFormula.trim();
    if (trimmedFormula.match(/[\+\-\*\/\%\^]\s*$/)) {
      throw new Error('Incomplete formula: ends with an operator');
    }
    
    // Check for operators at the beginning (except minus for negative numbers)
    if (trimmedFormula.match(/^[\+\*\/\%\^]/)) {
      throw new Error('Incomplete formula: starts with an operator');
    }
    
    // Tokenize, convert to postfix, and evaluate
    const tokens = tokenize(processedFormula);
    
    // If no tokens, return 0
    if (tokens.length === 0) {
      return 0;
    }
    
    const postfix = infixToPostfix(tokens);
    return evaluatePostfix(postfix);
  } catch (error) {
    // Don't log errors for incomplete formulas during typing
    const errorMessage = (error as Error).message;
    if (!errorMessage.includes('Incomplete formula')) {
      console.error('Formula evaluation error:', error, 'Formula:', formula, 'Variables:', variables);
    }
    throw error;
  }
}

/**
 * Enhanced formula validation with mapped field support
 * 
 * @param {string} formula - The formula to validate
 * @param {string[]} availableFields - List of available field names (regular fields)
 * @param {string[]} availableMappedFields - List of available mapped field names
 * @returns {string|null} - Error message if invalid, null if valid
 */
export function validateFormula(
  formula: string, 
  availableFields: string[] = [],
  availableMappedFields: string[] = []
): string | null {
  try {
    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of formula) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) return 'Unbalanced parentheses';
    }
    if (parenCount !== 0) return 'Unbalanced parentheses';
    
    // Check for invalid field references
    const fieldMatches = formula.match(/\{([^{}]+)\}/g) || [];
    for (const match of fieldMatches) {
      const fieldRef = match.substring(1, match.length - 1);
      
      if (fieldRef.startsWith('mapped.')) {
        const mappedFieldName = fieldRef.substring(7);
        if (!availableMappedFields.includes(mappedFieldName) && !availableMappedFields.includes(fieldRef)) {
          return `Unknown mapped field reference: ${fieldRef}`;
        }
      } else {
        if (!availableFields.includes(fieldRef)) {
          return `Unknown field reference: ${fieldRef}`;
        }
      }
    }
    
    // Check for unknown functions
    const functionMatches = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/g) || [];
    for (const funcName of functionMatches) {
      if (!Object.keys(functions).includes(funcName)) {
        return `Unknown function: ${funcName}`;
      }
    }
    
    // Try to parse and validate syntax by substituting dummy values
    let testFormula = formula;
    for (const match of fieldMatches) {
      testFormula = testFormula.replace(match, '1');
    }
    
    // Try to tokenize and convert to postfix (will throw errors for invalid syntax)
    const tokens = tokenize(testFormula);
    infixToPostfix(tokens);
    
    return null; // No errors found
  } catch (error) {
    return (error as Error).message;
  }
}

/**
 * Enhanced field reference extraction with mapped field support
 * 
 * @param {string} formula - The formula to parse
 * @returns {Object} - Object with regular and mapped field references
 */
export function extractFieldReferences(formula: string): {
  fields: string[];
  mappedFields: string[];
  all: string[];
} {
  const fields = new Set<string>();
  const mappedFields = new Set<string>();
  const matches = formula.match(/\{([^{}]+)\}/g) || [];
  
  for (const match of matches) {
    const fieldId = match.substring(1, match.length - 1);
    
    if (fieldId.startsWith('mapped.')) {
      mappedFields.add(fieldId.substring(7)); // Remove 'mapped.' prefix
    } else {
      fields.add(fieldId);
    }
  }
  
  return {
    fields: Array.from(fields),
    mappedFields: Array.from(mappedFields),
    all: [...Array.from(fields), ...Array.from(mappedFields)]
  };
}

/**
 * Get list of all available functions for formula building
 */
export function getAvailableFunctions(): { name: string; description: string; example: string }[] {
  return [
    // Basic Math
    { name: 'min', description: 'Minimum value', example: 'min(5, 10, 3)' },
    { name: 'max', description: 'Maximum value', example: 'max(5, 10, 3)' },
    { name: 'abs', description: 'Absolute value', example: 'abs(-5)' },
    { name: 'round', description: 'Round to nearest integer', example: 'round(3.7)' },
    { name: 'floor', description: 'Round down', example: 'floor(3.7)' },
    { name: 'ceil', description: 'Round up', example: 'ceil(3.2)' },
    { name: 'sqrt', description: 'Square root', example: 'sqrt(16)' },
    { name: 'pow', description: 'Power function', example: 'pow(2, 3)' },
    
    // Statistical
    { name: 'sum', description: 'Sum of values', example: 'sum(1, 2, 3, 4)' },
    { name: 'avg', description: 'Average of values', example: 'avg(1, 2, 3, 4)' },
    { name: 'count', description: 'Count of values', example: 'count(1, 2, 3)' },
    { name: 'median', description: 'Median value', example: 'median(1, 2, 3, 4, 5)' },
    
    // Industrial/Inventory
    { name: 'gallons_from_inches', description: 'Convert inches to gallons', example: 'gallons_from_inches({tank_inches}, {conversion_rate})' },
    { name: 'volume_cylinder', description: 'Cylindrical volume', example: 'volume_cylinder(radius, height)' },
    { name: 'volume_rectangle', description: 'Rectangular volume', example: 'volume_rectangle(length, width, height)' },
    
    // Unit Conversions
    { name: 'inches_to_feet', description: 'Convert inches to feet', example: 'inches_to_feet(24)' },
    { name: 'feet_to_inches', description: 'Convert feet to inches', example: 'feet_to_inches(2)' },
    { name: 'gallons_to_liters', description: 'Convert gallons to liters', example: 'gallons_to_liters(5)' },
    { name: 'liters_to_gallons', description: 'Convert liters to gallons', example: 'liters_to_gallons(20)' },
    
    // Financial
    { name: 'markup', description: 'Apply markup percentage', example: 'markup(100, 20)' },
    { name: 'margin', description: 'Calculate margin percentage', example: 'margin(120, 100)' },
    { name: 'discount', description: 'Apply discount percentage', example: 'discount(100, 10)' },
    
    // Utility
    { name: 'if', description: 'Conditional value', example: 'if({quantity} > 0, {price}, 0)' },
    { name: 'clamp', description: 'Clamp value between min/max', example: 'clamp({value}, 0, 100)' },
  ];
} 