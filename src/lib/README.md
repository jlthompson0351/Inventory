# Formula Evaluator

This module provides a secure way to evaluate mathematical formulas in Logistiq without using unsafe `eval()` or `Function()` methods.

## Key Features

- **Secure Evaluation**: Safely processes formulas without execution risks
- **Custom Formula Language**: Supports mathematical operations and functions
- **Variable Substitution**: Allows referencing field values using `{fieldName}` syntax
- **Validation**: Checks formula syntax before execution

## Supported Operations

- Basic arithmetic: `+`, `-`, `*`, `/`, `%` (modulus), `^` (exponent)
- Parentheses for grouping: `(` and `)`
- Mathematical functions:
  - `min`, `max`: Find minimum/maximum values
  - `abs`: Absolute value
  - `round`, `floor`, `ceil`: Rounding operations
  - `sqrt`: Square root
  - `pow`: Power function
  - `sum`: Sum multiple values
  - `avg`: Average of values

## Usage Examples

Simple calculations:
```
{field1} + {field2} * 10
```

Using functions:
```
max({quantity}, {minimum_threshold})
```

Complex formulas:
```
sum({item1_price}, {item2_price}, {item3_price}) * (1 - {discount_rate})
```

## Implementation Details

The evaluator uses the shunting-yard algorithm to convert infix notation (standard mathematical notation) to postfix notation (Reverse Polish Notation) for evaluation.

1. **Tokenization**: Breaks formula into tokens
2. **Conversion**: Transforms to postfix notation
3. **Evaluation**: Processes tokens with a stack-based approach
4. **Variable Handling**: Substitutes field references with actual values

This implementation avoids security risks associated with JavaScript's `eval()` while providing full mathematical expression capabilities. 