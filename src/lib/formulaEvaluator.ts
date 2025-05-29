/**
 * Enhanced Formula Evaluator - Industrial Inventory Management Focus
 * 
 * Supports:
 * - Regular field references: {field_1}, {field_2}
 * - Mapped field references: {mapped.conversion_rate}, {mapped.tank_inches}
 * - Industrial functions for inventory calculations
 * - Unit conversions and measurement functions
 */

import { create, all } from 'mathjs';

// Create a mathjs instance with limited functionality for safety
const math = create(all);

// Configure mathjs to be safe - disable potentially dangerous functions
const limitedMath = create({
  // Only include safe math operations
  addDependencies: true,
  subtractDependencies: true,
  multiplyDependencies: true,
  divideDependencies: true,
  modDependencies: true,
  powDependencies: true,
  sqrtDependencies: true,
  absDependencies: true,
  roundDependencies: true,
  floorDependencies: true,
  ceilDependencies: true,
  minDependencies: true,
  maxDependencies: true,
  sumDependencies: true,
  meanDependencies: true,
  medianDependencies: true,
  stdDependencies: true,
  varianceDependencies: true,
});

export interface FormulaContext {
  fields: Record<string, number>;
  mappedFields: Record<string, number>;
}

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
 * Safely evaluate a formula with field replacements
 * @param formula The formula string with {field_id} or {mapped.field_id} placeholders
 * @param context Object containing field values and mapped field values
 * @returns The calculated result or an error object
 */
export function evaluateFormula(
  formula: string,
  context: FormulaContext
): { success: true; result: number } | { success: false; error: string } {
  if (!formula || formula.trim() === '') {
    return { success: false, error: 'Empty formula' };
  }

  try {
    // Create a working copy of the formula
    let processedFormula = formula;

    // Replace field references with their values
    // Handle regular fields like {field_1}
    Object.entries(context.fields).forEach(([fieldId, value]) => {
      const regex = new RegExp(`\\{${fieldId}\\}`, 'g');
      processedFormula = processedFormula.replace(regex, String(value));
    });

    // Handle mapped fields like {mapped.field_name}
    Object.entries(context.mappedFields).forEach(([mappedKey, value]) => {
      const regex = new RegExp(`\\{${mappedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g');
      processedFormula = processedFormula.replace(regex, String(value));
    });

    // Check for any remaining unresolved placeholders
    const unresolvedPlaceholders = processedFormula.match(/\{[^}]+\}/g);
    if (unresolvedPlaceholders) {
      return {
        success: false,
        error: `Unresolved fields: ${unresolvedPlaceholders.join(', ')}`,
      };
    }

    // Remove any comments
    processedFormula = processedFormula.replace(/\/\*.*?\*\//g, '');
    processedFormula = processedFormula.replace(/\/\/.*$/gm, '');

    // Validate the formula doesn't contain dangerous patterns
    const dangerousPatterns = [
      /import\s/,
      /require\s*\(/,
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout/,
      /setInterval/,
      /document\./,
      /window\./,
      /console\./,
      /process\./,
      /global\./,
      /__proto__/,
      /constructor\s*\(/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(processedFormula)) {
        return { success: false, error: 'Formula contains unsafe operations' };
      }
    }

    // Use mathjs to safely evaluate the expression
    const result = limitedMath.evaluate(processedFormula);

    // Ensure the result is a number
    if (typeof result !== 'number' || isNaN(result)) {
      return { success: false, error: 'Formula did not produce a valid number' };
    }

    return { success: true, result };
  } catch (error) {
    // Return a user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown calculation error';
    return { success: false, error: `Calculation error: ${errorMessage}` };
  }
}

/**
 * Validate a formula without evaluating it
 * @param formula The formula to validate
 * @returns Validation result with any errors
 */
export function validateFormulaSyntax(formula: string): {
  isValid: boolean;
  error?: string;
  referencedFields: string[];
  referencedMappedFields: string[];
} {
  const result = {
    isValid: true,
    referencedFields: [] as string[],
    referencedMappedFields: [] as string[],
  };

  try {
    // Find all field references
    const fieldMatches = formula.match(/\{field_\d+\}/g) || [];
    result.referencedFields = fieldMatches.map(m => m.slice(1, -1));

    // Find all mapped field references
    const mappedMatches = formula.match(/\{mapped\.[a-zA-Z0-9_]+\}/g) || [];
    result.referencedMappedFields = mappedMatches.map(m => m.slice(1, -1));

    // Create a test formula with all placeholders replaced with 1
    let testFormula = formula;
    [...result.referencedFields, ...result.referencedMappedFields].forEach(ref => {
      testFormula = testFormula.replace(new RegExp(`\\{${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g'), '1');
    });

    // Remove comments
    testFormula = testFormula.replace(/\/\*.*?\*\//g, '');
    testFormula = testFormula.replace(/\/\/.*$/gm, '');

    // Check for dangerous patterns
    const dangerousPatterns = [
      /import\s/,
      /require\s*\(/,
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout/,
      /setInterval/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(testFormula)) {
        result.isValid = false;
        result.error = 'Formula contains unsafe operations';
        return result;
      }
    }

    // Try to parse with mathjs
    limitedMath.parse(testFormula);

    return result;
  } catch (error) {
    result.isValid = false;
    result.error = error instanceof Error ? error.message : 'Invalid formula syntax';
    return result;
  }
}

/**
 * Format a number for display
 * @param value The number to format
 * @param options Formatting options
 */
export function formatCalculatedValue(
  value: number,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    locale?: string;
  } = {}
): string {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 4,
    locale = 'en-US',
  } = options;

  return value.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
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