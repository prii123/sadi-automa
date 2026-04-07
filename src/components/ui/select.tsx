import { Children, isValidElement, ReactElement, ReactNode, SelectHTMLAttributes } from 'react';

interface ParsedSelectItem {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}

interface SelectContainerProps {
  children?: ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

interface SelectItemProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onValueChange'> {
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export function Select({ onValueChange, children, className = '', ...props }: SelectProps) {
  const { placeholder, items } = parseSelectChildren(children);
  const hasEmptyValueItem = items.some((item) => item.value === '');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onValueChange?.(e.target.value);
    props.onChange?.(e);
  };

  return (
    <select
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onChange={handleChange}
      {...props}
    >
      {placeholder && !hasEmptyValueItem ? (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      ) : null}
      {items.map((item) => (
        <option key={`${item.value}-${String(item.children)}`} value={item.value} disabled={item.disabled}>
          {item.children}
        </option>
      ))}
    </select>
  );
}

function parseSelectChildren(children: ReactNode) {
  const items: ParsedSelectItem[] = [];
  let placeholder: ReactNode;

  const visit = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) {
        return;
      }

      const childElement = child as ReactElement<Record<string, unknown>>;

      if (childElement.type === SelectTrigger || childElement.type === SelectContent) {
        visit((childElement.props as SelectContainerProps).children);
        return;
      }

      if (childElement.type === SelectValue) {
        const valueProps = childElement.props as SelectValueProps;

        if (valueProps.placeholder) {
          placeholder = valueProps.placeholder;
        }
        return;
      }

      if (childElement.type === SelectItem) {
        const itemProps = childElement.props as unknown as SelectItemProps;

        items.push({
          value: itemProps.value,
          children: itemProps.children,
          disabled: itemProps.disabled
        });
        return;
      }

      if (childElement.type === 'option') {
        const optionProps = childElement.props as unknown as SelectItemProps;

        items.push({
          value: optionProps.value,
          children: optionProps.children,
          disabled: optionProps.disabled
        });
        return;
      }

      const nestedChildren = (childElement.props as SelectContainerProps).children;

      if (nestedChildren) {
        visit(nestedChildren);
      }
    });
  };

  visit(children);

  return { placeholder, items };
}

export function SelectTrigger({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function SelectValue({ placeholder }: SelectValueProps) {
  return <span className="text-gray-500">{placeholder}</span>;
}

export function SelectContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({ value, children, disabled }: SelectItemProps) {
  return (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  );
}