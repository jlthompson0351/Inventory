import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  Plus,
  Minus,
  X,
  Divide,
  Percent,
  Hash,
  Parentheses,
  Calculator,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface FormulaToolbarProps {
  onInsert: (text: string, moveCursorBack?: number) => void;
}

// Define operators with tooltips
const OPERATORS = [
  { symbol: '+', label: 'Addition', icon: Plus },
  { symbol: '-', label: 'Subtraction', icon: Minus },
  { symbol: '*', label: 'Multiplication', icon: X },
  { symbol: '/', label: 'Division', icon: Divide },
  { symbol: '%', label: 'Modulus', icon: Percent },
  { symbol: '^', label: 'Exponent', icon: Hash },
  { symbol: '(', label: 'Open Parenthesis', icon: Parentheses },
  { symbol: ')', label: 'Close Parenthesis', icon: Parentheses },
];

// Define functions with parameter info
const FUNCTIONS = [
  { name: 'sum', description: 'Sum of values', params: 'value1, value2, ...', insertText: 'sum()', cursorBack: 1 },
  { name: 'avg', description: 'Average of values', params: 'value1, value2, ...', insertText: 'avg()', cursorBack: 1 },
  { name: 'min', description: 'Minimum value', params: 'value1, value2, ...', insertText: 'min()', cursorBack: 1 },
  { name: 'max', description: 'Maximum value', params: 'value1, value2, ...', insertText: 'max()', cursorBack: 1 },
  { name: 'round', description: 'Round to nearest integer', params: 'value', insertText: 'round()', cursorBack: 1 },
  { name: 'floor', description: 'Round down to integer', params: 'value', insertText: 'floor()', cursorBack: 1 },
  { name: 'ceil', description: 'Round up to integer', params: 'value', insertText: 'ceil()', cursorBack: 1 },
  { name: 'abs', description: 'Absolute value', params: 'value', insertText: 'abs()', cursorBack: 1 },
  { name: 'sqrt', description: 'Square root', params: 'value', insertText: 'sqrt()', cursorBack: 1 },
  { name: 'pow', description: 'Power', params: 'base, exponent', insertText: 'pow(,)', cursorBack: 2 },
];

export function FormulaToolbar({ onInsert }: FormulaToolbarProps) {
  return (
    <div className="flex flex-wrap gap-1 mb-2 items-center">
      <TooltipProvider>
        {OPERATORS.map(op => (
          <Tooltip key={op.symbol}>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onInsert(op.symbol)}
              >
                <op.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{op.label} ({op.symbol})</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        <div className="mx-1 h-8 border-l"></div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="outline" size="sm" className="h-8">
                <Calculator className="h-4 w-4 mr-1" />
                Functions
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Insert function</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
} 