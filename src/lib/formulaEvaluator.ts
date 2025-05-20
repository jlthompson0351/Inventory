/**
 * Formula Evaluator - A utility for safely evaluating mathematical expressions
 * 
 * This module provides a secure way to evaluate formula expressions without using
 * the unsafe Function() or eval() methods.
 */

// Supported mathematical operators and their precedence
const operators: Record<string, { precedence: number, associativity: 'left' | 'right', operation: (a: number, b: number) => number }> = {
  '+': { precedence: 1, associativity: 'left', operation: (a, b) => a + b },
  '-': { precedence: 1, associativity: 'left', operation: (a, b) => a - b },
  '*': { precedence: 2, associativity: 'left', operation: (a, b) => a * b },
  '/': { precedence: 2, associativity: 'left', operation: (a, b) => a / b },
  '%': { precedence: 2, associativity: 'left', operation: (a, b) => a % b },
  '^': { precedence: 3, associativity: 'right', operation: (a, b) => Math.pow(a, b) },
};

// Mathematical functions that are allowed to be used in formulas
const functions: Record<string, (...args: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sqrt: Math.sqrt,
  pow: Math.pow,
  sum: (...args) => args.reduce((sum, val) => sum + val, 0),
  avg: (...args) => args.length ? args.reduce((sum, val) => sum + val, 0) / args.length : 0,
  count: (...args) => args.length,
};

// Tokenizes a mathematical expression into its components
function tokenize(expression: string): string[] {
  // Enhanced regex to handle negative numbers, decimals, and better spacing
  const regex = /((?:\-)?[0-9]*\.?[0-9]+|\+|\-|\*|\/|\^|\%|\(|\)|,|[a-zA-Z_][a-zA-Z0-9_]*)/g;
  return expression.match(regex) || [];
}

// Converts infix notation to postfix (Reverse Polish Notation)
function infixToPostfix(tokens: string[]): string[] {
  const output: string[] = [];
  const stack: string[] = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // If token is a number
    if (!isNaN(Number(token))) {
      output.push(token);
    }
    // If token is a function
    else if (token in functions) {
      stack.push(token);
    }
    // If token is a comma (function argument separator)
    else if (token === ',') {
      while (stack.length > 0 && stack[stack.length - 1] !== '(') {
        output.push(stack.pop()!);
      }
    }
    // If token is an operator
    else if (token in operators) {
      while (
        stack.length > 0 &&
        stack[stack.length - 1] in operators &&
        ((operators[token].associativity === 'left' && 
          operators[token].precedence <= operators[stack[stack.length - 1]].precedence) ||
         (operators[token].associativity === 'right' && 
          operators[token].precedence < operators[stack[stack.length - 1]].precedence))
      ) {
        output.push(stack.pop()!);
      }
      stack.push(token);
    }
    // If token is a left parenthesis
    else if (token === '(') {
      stack.push(token);
    }
    // If token is a right parenthesis
    else if (token === ')') {
      while (stack.length > 0 && stack[stack.length - 1] !== '(') {
        output.push(stack.pop()!);
      }
      if (stack.length > 0 && stack[stack.length - 1] === '(') {
        stack.pop(); // Remove the left parenthesis
      } else {
        throw new Error('Mismatched parentheses');
      }
      // If there's a function before the parenthesis
      if (stack.length > 0 && stack[stack.length - 1] in functions) {
        output.push(stack.pop()!);
      }
    }
  }
  
  // Pop any remaining operators
  while (stack.length > 0) {
    const op = stack.pop()!;
    if (op === '(' || op === ')') {
      throw new Error('Mismatched parentheses');
    }
    output.push(op);
  }
  
  return output;
}

// Evaluates a postfix (RPN) expression
function evaluatePostfix(tokens: string[]): number {
  const stack: number[] = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // If token is a number
    if (!isNaN(Number(token))) {
      stack.push(Number(token));
    }
    // If token is a function
    else if (token in functions) {
      const fn = functions[token];
      const arity = getArity(fn);
      if (stack.length < arity) {
        throw new Error(`Not enough arguments for function ${token}`);
      }
      
      const args: number[] = [];
      for (let j = 0; j < arity; j++) {
        args.unshift(stack.pop()!);
      }
      
      stack.push(fn(...args));
    }
    // If token is an operator
    else if (token in operators) {
      if (stack.length < 2) {
        throw new Error(`Not enough operands for operator ${token}`);
      }
      
      const b = stack.pop()!;
      const a = stack.pop()!;
      
      stack.push(operators[token].operation(a, b));
    }
  }
  
  if (stack.length !== 1) {
    throw new Error('Invalid expression');
  }
  
  return stack[0];
}

// Get the number of arguments a function expects
function getArity(fn: Function): number {
  return fn.length || 0; // For variadic functions, handle arity appropriately
}

/**
 * Evaluates a mathematical formula with variable substitution
 * 
 * @param {string} formula - The formula to evaluate (e.g., "{field1} + {field2} * 10")
 * @param {Record<string, any>} variables - Object containing variable values to substitute
 * @returns {number} - The result of the formula evaluation
 */
export function evaluateFormula(formula: string, variables: Record<string, any>): number {
  try {
    // Pre-process formula by replacing variable placeholders
    let processedFormula = formula;
    
    // Replace variable placeholders with their values
    for (const [fieldId, value] of Object.entries(variables)) {
      // Properly escape special regex characters
      const escapedFieldId = fieldId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const fieldPattern = new RegExp(`\\{${escapedFieldId}\\}`, 'g');
      const valueAsNumber = parseFloat(String(value)) || 0;
      processedFormula = processedFormula.replace(fieldPattern, valueAsNumber.toString());
    }
    
    // Tokenize, convert to postfix, and evaluate
    const tokens = tokenize(processedFormula);
    const postfix = infixToPostfix(tokens);
    return evaluatePostfix(postfix);
  } catch (error) {
    console.error('Formula evaluation error:', error);
    throw new Error(`Invalid formula: ${(error as Error).message}`);
  }
}

/**
 * Validates a formula for syntax errors without evaluating it
 * 
 * @param {string} formula - The formula to validate
 * @param {string[]} availableVariables - List of available variable names
 * @returns {string|null} - Error message if invalid, null if valid
 */
export function validateFormula(formula: string, availableVariables: string[] = []): string | null {
  try {
    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of formula) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) return 'Unbalanced parentheses';
    }
    if (parenCount !== 0) return 'Unbalanced parentheses';
    
    // Check for invalid variable references
    const variableMatches = formula.match(/\{([^{}]+)\}/g) || [];
    for (const match of variableMatches) {
      const varName = match.substring(1, match.length - 1);
      if (!availableVariables.includes(varName)) {
        return `Unknown field reference: ${varName}`;
      }
    }
    
    // Process formula with dummy values - SAME logic as evaluateFormula
    let processedFormula = formula;
    for (const match of variableMatches) {
      processedFormula = processedFormula.replace(match, '1');
    }
    
    // Try to tokenize and convert to postfix (will throw errors for invalid syntax)
    const tokens = tokenize(processedFormula);
    infixToPostfix(tokens);
    
    return null; // No errors found
  } catch (error) {
    return (error as Error).message;
  }
}

/**
 * Extracts field references from a formula
 * 
 * @param {string} formula - The formula to parse
 * @returns {string[]} - Array of field IDs referenced in the formula
 */
export function extractFieldReferences(formula: string): string[] {
  const references = new Set<string>();
  const matches = formula.match(/\{([^{}]+)\}/g) || [];
  
  for (const match of matches) {
    const fieldId = match.substring(1, match.length - 1);
    references.add(fieldId);
  }
  
  return Array.from(references);
} 