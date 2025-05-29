import { useRef, useEffect } from 'react';

export function useDebugRenders(componentName: string, props: Record<string, any>) {
  const renderCount = useRef(0);
  const previousProps = useRef<Record<string, any>>({});
  
  renderCount.current += 1;
  
  useEffect(() => {
    const changedProps: Record<string, any> = {};
    
    Object.keys(props).forEach(key => {
      if (previousProps.current[key] !== props[key]) {
        changedProps[key] = {
          from: previousProps.current[key],
          to: props[key]
        };
      }
    });
    
    if (Object.keys(changedProps).length > 0) {
      console.log(`🔄 [${componentName}] Re-rendered (#${renderCount.current}) due to:`, changedProps);
    } else {
      console.log(`🔄 [${componentName}] Re-rendered (#${renderCount.current}) - no prop changes`);
    }
    
    previousProps.current = { ...props };
  });
  
  return renderCount.current;
} 