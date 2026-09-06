import React from 'react';

/**
 * Compound Card component
 */
export const Card = ({
  children,
  hoverable = false,
  clickable = false,
  className = '',
  onClick,
  ...rest
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden
        ${hoverable ? 'hover:border-amber-300 hover:shadow-md transition-all duration-200' : ''}
        ${clickable ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({
  children,
  className = '',
  border = true,
  ...rest
}) => {
  return (
    <div
      className={`
        px-6 py-5
        ${border ? 'border-b border-stone-100' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};

export const CardBody = ({
  children,
  className = '',
  ...rest
}) => {
  return (
    <div
      className={`
        px-6 py-5 text-sm text-stone-700 leading-relaxed
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};

export const CardFooter = ({
  children,
  className = '',
  border = true,
  ...rest
}) => {
  return (
    <div
      className={`
        px-6 py-4 bg-stone-50/70
        ${border ? 'border-t border-stone-100' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
