---
description: Instructions for generating React components using the Compound Component pattern.
applyTo: "**/*.{tsx,jsx}"
---

# React Compound Component Pattern Instructions

This document outlines the standards and steps for generating React components using the Compound Component pattern. This pattern is preferred for complex components with multiple distinct UI areas and optional functionality.

## Core Principles

- **Cohesion**: Components work together as a unit but maintain individual responsibilities.
- **Flexibility**: Consumers can include/exclude functionality by composing children.
- **Shared State**: Use React Context to share state between the Root and child components without prop drilling.
- **Declarative API**: The API should be intuitive, e.g., `<Component.Root><Component.Item /></Component.Root>`.

## Implementation Steps

### 1. Context and Foundation

Create a context to share state. Export a hook for child components to access this context.

```tsx
import * as React from "react";
import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

interface MyComponentContextValue {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  // ... other shared state
}

const MyComponentContext = createContext<MyComponentContextValue | null>(null);

function useMyComponentContext() {
  const context = useContext(MyComponentContext);
  if (!context) {
    throw new Error(
      "MyComponent compound components must be used within MyComponent.Root"
    );
  }
  return context;
}
```

### 2. Root Component (Provider)

The Root component manages the state and provides the context.

```tsx
interface RootProps {
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  // ... configuration props
}

function Root({
  children,
  className,
  defaultOpen = false,
  ...props
}: RootProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const contextValue = React.useMemo(
    () => ({
      isOpen,
      setIsOpen,
    }),
    [isOpen]
  );

  return (
    <MyComponentContext.Provider value={contextValue}>
      <div className={cn("root-styles", className)} {...props}>
        {children}
      </div>
    </MyComponentContext.Provider>
  );
}
Root.displayName = "MyComponent.Root";
```

### 3. Child Components

Create child components that consume the context.

```tsx
interface ItemProps {
  children: React.ReactNode;
  className?: string;
}

function Item({ children, className, ...props }: ItemProps) {
  const { isOpen } = useMyComponentContext();

  if (!isOpen) return null;

  return (
    <div className={cn("item-styles", className)} {...props}>
      {children}
    </div>
  );
}
Item.displayName = "MyComponent.Item";

function Trigger({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLButtonElement>) {
  const { setIsOpen, isOpen } = useMyComponentContext();

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={cn("trigger-styles", className)}
      {...props}
    >
      {children}
    </button>
  );
}
Trigger.displayName = "MyComponent.Trigger";
```

### 4. Export Composition

Export the components as a single object for a clean API.

```tsx
export const MyComponent = {
  Root,
  Item,
  Trigger,
  // ... other components
};
```

## Advanced Patterns

### Smart Defaults

Components can include logic to adapt based on content.

```tsx
// Example: Auto-collapsible if data is large
const shouldBeCollapsible =
  props.collapsible || (data && Object.keys(data).length > 5);
```

### Performance Optimization

Split contexts for state (frequent updates) and configuration (static) to prevent unnecessary re-renders.

```tsx
const StateContext = createContext<StateValue | null>(null)
const ConfigContext = createContext<ConfigValue | null>(null)

// In Root:
// Memoize values separately
const stateValue = React.useMemo(() => ({ ... }), [state])
const configValue = React.useMemo(() => ({ ... }), [props])
```

### TypeScript Best Practices

Ensure the exported object is typed correctly.

```tsx
interface MyComponentType {
  Root: React.ComponentType<RootProps>;
  Item: React.ComponentType<ItemProps>;
  Trigger: React.ComponentType<React.HTMLAttributes<HTMLButtonElement>>;
}

export const MyComponent: MyComponentType = {
  Root,
  Item,
  Trigger,
} as const;
```

## Testing Strategies

Test the interaction between components using `@testing-library/react`.

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MyComponent } from "./my-component";

describe("MyComponent", () => {
  it("should toggle content", () => {
    render(
      <MyComponent.Root>
        <MyComponent.Trigger>Toggle</MyComponent.Trigger>
        <MyComponent.Item>Content</MyComponent.Item>
      </MyComponent.Root>
    );

    expect(screen.queryByText("Content")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
```

## Usage Example

```tsx
function App() {
  return (
    <MyComponent.Root defaultOpen>
      <MyComponent.Trigger>Open Menu</MyComponent.Trigger>
      <MyComponent.Item>Item 1</MyComponent.Item>
      <MyComponent.Item>Item 2</MyComponent.Item>
    </MyComponent.Root>
  );
}
```
