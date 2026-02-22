import React, { useEffect, useRef, useState } from 'react';

export default function WidthProvider(WrappedComponent) {
  return function WidthProviderWrapper(props) {
    const [width, setWidth] = useState(1200);
    const elementRef = useRef(null);
    const mounted = useRef(false);

    useEffect(() => {
      mounted.current = true;
      const node = elementRef.current;
      if (!node) return;

      const observer = new ResizeObserver((entries) => {
        if (!mounted.current) return;
        for (let entry of entries) {
          setWidth(entry.contentRect.width);
        }
      });
      observer.observe(node);

      return () => {
        mounted.current = false;
        observer.disconnect();
      };
    }, []);

    return (
      <div ref={elementRef} style={{ width: '100%' }}>
        <WrappedComponent {...props} width={width} />
      </div>
    );
  };
}
