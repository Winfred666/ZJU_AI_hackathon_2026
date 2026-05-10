---
name: baseline-ui
description: Enforces an opinionated UI baseline to prevent AI-generated interface slop.
---

# Baseline UI

Enforces an opinionated UI baseline to prevent AI-generated interface slop.

## How to use

- `/baseline-ui`
  Apply these constraints to any UI work in this conversation.

- `/baseline-ui <file>`
  Review the file against all constraints below and output:
  - violations (quote the exact line/snippet)
  - why it matters (1 short sentence)
  - a concrete fix (code-level suggestion)

## Stack

- MUST use `shadcn/ui` components for standard interface elements
- MUST use `AntV/G6` for node-link visualizations and knowledge graphs
- MUST use Tailwind CSS defaults (spacing, radius, shadows) before custom values
- MUST use `motion/react` (formerly `framer-motion`) when JavaScript animation is required
- SHOULD use `tw-animate-css` for entrance and micro-animations in Tailwind CSS
- MUST use `cn` utility (`clsx` + `tailwind-merge`) for class logic

## Components

- MUST use the project’s existing `shadcn/ui` components (found in `components/ui`) first
- MUST use accessible component primitives for anything with keyboard or focus behavior (`Radix`)
- NEVER mix primitive systems within the same interaction surface
- MUST add an `aria-label` to icon-only buttons
- NEVER rebuild keyboard or focus behavior by hand unless explicitly requested
- MUST use `isLoading` prop on the `Button` component when indicating loading state
- NEVER use `ml-x` or `mr-x` when styling an icon inside a button, since spacing will be given to it automatically
- NEVER explicitly set border color to `border-border` since this is the default border color

## Medical Science Design System

- MUST use a "Formal Medical" palette:
    - Primary/Nodes: Deep Blue (e.g., `blue-800`, `blue-900`)
    - Accents: Medical Blue (e.g., `blue-600`)
    - Backgrounds/Hover: Very Light Blue (e.g., `blue-50`)
- NEVER use warm colors (red/orange/yellow) except for critical error states
- MUST maintain a "Clean Paper" aesthetic (off-white backgrounds, subtle borders)

## Knowledge Graph (AntV/G6)

- MUST follow the "Connected Papers" aesthetic: shallow/paper background with deep blue nodes
- MUST use standard G6 layout algorithms (e.g., `force`, `dagre`) for consistency
- MUST ensure nodes are colored in Deep Blue (`#1e3a8a` or Tailwind `blue-900`)
- SHOULD use smooth layout transitions and standard G6 animation behaviors

## PDF & File Management

- MUST implement a "NotebookLM" style drag-and-list management system
- MUST use light blue hover states (`bg-blue-50`) for file list items
- MUST provide a clear "empty state" that encourages PDF uploads
- SHOULD use structural skeletons when parsing or indexing uploaded PDFs

## Interaction

- MUST use an `AlertDialog` for destructive or irreversible actions
- SHOULD use structural skeletons for loading states
- NEVER use `h-screen`, use `h-dvh`
- MUST respect `safe-area-inset` for fixed elements
- MUST show errors next to where the action happens
- NEVER block paste in `input` or `textarea` elements

## Animation

- NEVER add animation unless it is explicitly requested
- MUST animate only compositor props (`transform`, `opacity`)
- NEVER animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`)
- SHOULD avoid animating paint properties (`background`, `color`) except for small, local UI (text, icons)
- SHOULD use `ease-out` on entrance
- NEVER exceed `200ms` for interaction feedback
- MUST pause looping animations when off-screen
- MUST respect `prefers-reduced-motion`
- NEVER introduce custom easing curves unless explicitly requested
- SHOULD avoid animating large images or full-screen surfaces

## Typography

- MUST use `text-balance` for headings and `text-pretty` for body/paragraphs
- MUST use `tabular-nums` for data
- SHOULD use `truncate` or `line-clamp` for dense UI
- NEVER modify `letter-spacing` (`tracking-`) unless explicitly requested

## Layout

- MUST use a fixed `z-index` scale (no arbitrary `z-x`)
- SHOULD use `size-x` for square elements instead of `w-x` + `h-x`
- SHOULD use `gap-*` for spacing between elements instead of `space-x-*` or `space-y-*` (with appropriate `flex` and `flex-direction` classes)

## Performance

- NEVER animate large `blur()` or `backdrop-filter` surfaces
- NEVER apply `will-change` outside an active animation
- NEVER use `useEffect` for anything that can be expressed as render logic

## Design

- NEVER use gradients unless explicitly requested
- NEVER use purple or multicolor gradients
- NEVER use glow effects as primary affordances
- SHOULD use Tailwind CSS default shadow scale unless explicitly requested
- MUST give empty states one clear next action
- SHOULD limit accent color usage to one per view
- SHOULD use existing theme or Tailwind CSS color tokens before introducing new ones
