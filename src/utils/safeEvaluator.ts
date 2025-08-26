// Safe Formula Evaluator for FormBuilder
// Replaces eval() with secure mathjs evaluation + performance optimization

import { create, all } from 'mathjs';

// Create optimized mathjs instance with JavaScript-compatible behavior
const math = create(all, {
  number: 'number', // Use native JavaScript numbers (faster)
  precision: 14     // Standard JavaScript precision
});

// List of functions that don't exist in JavaScript eval() scope
// We'll detect these during evaluation and throw appropriate errors
const restrictedFunctions = [
  'sqrt', 'pow', 'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'abs', 'floor', 'ceil', 'round',
  'min', 'max', 'random', 'pi', 'e', 'factorial', 'combinations', 'permutations'
];

// Override division to match JavaScript behavior (return Infinity for x/0)
const originalDivide = math.divide;
math.import({
  divide: function(a: number, b: number) {
    if (b === 0 && a !== 0) {
      return a > 0 ? Infinity : -Infinity;
    }
    if (a === 0 && b === 0) {
      return NaN; // 0/0 = NaN in JavaScript
    }
    return originalDivide(a, b);
  }
}, { override: true });

// Override the division operator (/) to match JavaScript behavior
math.import({
  '/': function(a: number, b: number) {
    if (b === 0 && a !== 0) {
      return a > 0 ? Infinity : -Infinity;
    }
    if (a === 0 && b === 0) {
      return NaN; // 0/0 = NaN in JavaScript
    }
    return a / b; // Use native JavaScript division for normal cases
  }
}, { override: true });

// Cache for compiled expressions
const formulaCache = new Map<string, any>();
const CACHE_SIZE_LIMIT = 100; // Prevent memory leaks

interface CacheStats {
  cacheSize: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatio: number;
}

interface FormField {
  id: string;
  placeholder?: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  referencedFields: string[];
  referencedMappedFields: string[];
}

/**
 * Safe Formula Evaluator with Caching
 * Replaces eval() with secure mathjs evaluation + performance optimization
 */
class SafeFormulaEvaluator {
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Main evaluation function - replaces eval()
   */
  evaluate(expression: string, useCache = true): number | undefined {
    if (!expression || typeof expression !== 'string') {
      throw new Error('Invalid expression');
    }

    // Clean the expression
    const cleanExpression = expression.trim();
    
    if (cleanExpression === '') {
      return undefined; // Match eval() behavior for empty strings
    }

    // Check for restricted functions that don't exist in JavaScript eval()
    for (const funcName of restrictedFunctions) {
      const funcPattern = new RegExp(`\\b${funcName}\\s*\\(`, 'i');
      if (funcPattern.test(cleanExpression)) {
        throw new Error(`${funcName} is not defined`);
      }
    }

    // Use cache for repeated expressions
    if (useCache && formulaCache.has(cleanExpression)) {
      this.cacheHits++;
      const compiled = formulaCache.get(cleanExpression);
      return compiled.evaluate();
    }

    try {
      // Compile and cache the expression
      if (useCache) {
        const compiled = math.compile(cleanExpression);
        
        // Prevent cache from growing too large
        if (formulaCache.size >= CACHE_SIZE_LIMIT) {
          const firstKey = formulaCache.keys().next().value;
          if (firstKey) {
            formulaCache.delete(firstKey);
          }
        }
        
        formulaCache.set(cleanExpression, compiled);
        this.cacheMisses++;
        
        return compiled.evaluate();
      } else {
        // Direct evaluation without caching
        return math.evaluate(cleanExpression);
      }
    } catch (error) {
      // Re-throw with consistent error format
      throw new Error(error instanceof Error ? error.message : 'Evaluation error');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      cacheSize: formulaCache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRatio: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    formulaCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Create global instance
const safeEvaluator = new SafeFormulaEvaluator();

/**
 * Drop-in replacement for eval() in FormBuilder
 */
export function safeEval(expression: string): number | undefined {
  return safeEvaluator.evaluate(expression);
}

/**
 * FormBuilder-specific evaluation functions
 */
export const FormBuilderEvaluator = {
  // Line 206 replacement: Formula validation (supports both {field_1} and [Field Name] syntax)
  validateFormula(formula: string, currentFields: FormField[] = [], mappedFields: any[] = []): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      referencedFields: [],
      referencedMappedFields: [],
    };

    // Find all field references - both old {field_1} and new [Field Name] syntax
    const fieldMatches = formula.match(/\{field_\d+\}/g) || [];
    result.referencedFields = fieldMatches.map(m => m.slice(1, -1));
    
    // Find bracket field references [Field Name]
    const bracketMatches = formula.match(/\[[^\]]+\]/g) || [];
    bracketMatches.forEach(match => {
      const fieldName = match.slice(1, -1);
      // Check if it's an asset field like [Asset.Field Name]
      if (fieldName.includes('.')) {
        const [source, fieldLabel] = fieldName.split('.', 2);
        if (source === 'Asset' || mappedFields.some(f => f.form_name === source)) {
          result.referencedMappedFields.push(`mapped.${fieldLabel}`);
        }
      } else {
        // Regular form field [Field Name]
        const field = currentFields.find(f => f.label === fieldName);
        if (field) {
          result.referencedFields.push(field.id);
        }
      }
    });
    
    // Find all mapped field references
    const mappedMatches = formula.match(/\{mapped\.[a-zA-Z0-9_]+\}/g) || [];
    result.referencedMappedFields.push(...mappedMatches.map(m => m.slice(1, -1)));
    
    // Check if referenced fields exist
    const nonExistentFields = result.referencedFields.filter(
      fieldId => !currentFields.some(f => f.id === fieldId)
    );
    
    if (nonExistentFields.length > 0) {
      return {
        ...result,
        isValid: false,
        error: `Referenced fields don't exist: ${nonExistentFields.join(', ')}`
      };
    }
    
    // Check if referenced mapped fields exist
    const nonExistentMappedFields = result.referencedMappedFields.filter(
      mappedKey => !mappedFields.some(f => `mapped.${f.field_id}` === mappedKey)
    );
    
    if (nonExistentMappedFields.length > 0) {
      return {
        ...result,
        isValid: false,
        error: `Referenced mapped fields don't exist: ${nonExistentMappedFields.join(', ')}`
      };
    }

    // Check formula syntax (basic testing for balanced braces, operators)
    try {
      // Replace field references with 1 to test evaluation
      let testFormula = formula;
      result.referencedFields.forEach(fieldId => {
        testFormula = testFormula.replace(new RegExp(`\\{${fieldId}\\}`, 'g'), '1');
      });
      result.referencedMappedFields.forEach(mappedKey => {
        testFormula = testFormula.replace(new RegExp(`\\{${mappedKey}\\}`, 'g'), '1');
      });
      
      // Clean comments
      testFormula = testFormula.replace(/\/\*.*?\*\//g, '');
      
      // Use safe evaluator instead of eval()
      safeEvaluator.evaluate(testFormula);
      
    } catch (e) {
      return {
        ...result,
        isValid: false,
        error: `Formula syntax error: ${e instanceof Error ? e.message : 'Invalid expression'}`
      };
    }
    
    return result;
  },

  // Line 659 replacement: Preview calculation
  previewCalculation(formula: string): string {
    let sampleResult = "Error";
    try {
      // Replace field references with sample values
      const processedFormula = formula
        .replace(/\{field_1\}/g, "10")
        .replace(/\{field_2\}/g, "5")
        .replace(/\{field_3\}/g, "20");
      
      // Use safe evaluator instead of eval()
      const result = safeEvaluator.evaluate(processedFormula);
      sampleResult = result !== undefined ? result.toString() : "Error";
    } catch (e) {
      // Formula evaluation failed
    }
    
    return sampleResult;
  },

  /**
   * Main calculation function, with hyper-detailed logging
   */
  calculateWithFormatting(formula: string, formFields: FormField[], mockValues: Record<string, any>): string {
    console.log(`🔥🔥🔥 NEW EVALUATOR CODE IS RUNNING! 🔥🔥🔥`);
    console.log(`--- [Evaluator] Start Formula Evaluation ---`);
    console.log(`[Evaluator] Initial Formula: "${formula}"`);
    console.log(`[Evaluator] Mock Values Received:`, JSON.stringify(mockValues, null, 2));

    let processedFormula = formula;
    try {
      // Create a regex to find all placeholders like {field_id} or {mapped.name}
      const placeholderRegex = /\{([a-zA-Z0-9_.]+)\}/g;
      
      processedFormula = formula.replace(placeholderRegex, (match, key) => {
        console.log(`[Evaluator] Found placeholder: ${match}`);
        
        // Check if the key exists in mockValues
        if (Object.prototype.hasOwnProperty.call(mockValues, key)) {
          const value = mockValues[key];
          const numericValue = parseFloat(value);

          if (isNaN(numericValue)) {
            console.warn(`[Evaluator] Value for key "${key}" is not a number: "${value}". Replacing with 0.`);
            return '0';
          } else {
            console.log(`[Evaluator] Replacing ${match} with value: ${numericValue}`);
            return String(numericValue);
          }
        } else {
          // A special case for bracket syntax if ever needed, but brace is primary
          const bracketKey = key.replace(/_/g, ' ');
          if (Object.prototype.hasOwnProperty.call(mockValues, bracketKey)) {
             const value = mockValues[bracketKey];
             const numericValue = parseFloat(value);
             if (isNaN(numericValue)) {
                console.warn(`[Evaluator] Bracket-syntax value for key "${bracketKey}" is not a number: "${value}". Replacing with 0.`);
                return '0';
             } else {
                console.log(`[Evaluator] Bracket-syntax replacing ${match} with value: ${numericValue}`);
                return String(numericValue);
             }
          }
        }
        
        console.warn(`[Evaluator] No value found for placeholder ${match}. Replacing with 0.`);
        return '0';
      });

      console.log(`[Evaluator] Final expression to be evaluated: "${processedFormula}"`);
      
      // Remove any leftover placeholders that were not found, replacing them with 0
      const finalCleanedFormula = processedFormula.replace(placeholderRegex, '0');
      if(finalCleanedFormula !== processedFormula) {
        console.log(`[Evaluator] Cleaned up leftover placeholders. Final expression: "${finalCleanedFormula}"`);
      }

      const result = safeEval(finalCleanedFormula);

      if (result === undefined) {
        console.error(`[Evaluator] Evaluation returned undefined for expression: "${finalCleanedFormula}"`);
        return 'Calculation Error';
      }

      console.log(`[Evaluator] Raw evaluation result: ${result}`);
      const formattedResult = result.toFixed(2);
      console.log(`[Evaluator] Formatted result: ${formattedResult}`);
      console.log(`--- [Evaluator] End Formula Evaluation ---`);
      return formattedResult;
    } catch (e: any) {
      console.error('[Evaluator] CRITICAL ERROR during formula evaluation:', e);
      console.log(`--- [Evaluator] End Formula Evaluation with ERROR ---`);
      return 'Error';
    }
  },

  // Get performance statistics
  getStats(): CacheStats {
    return safeEvaluator.getCacheStats();
  },

  // Clear cache if needed
  clearCache(): void {
    safeEvaluator.clearCache();
  }
};

export default FormBuilderEvaluator; 