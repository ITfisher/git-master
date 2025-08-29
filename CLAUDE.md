# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.5.2 project using React 19, TypeScript, and Tailwind CSS 4. It follows the App Router architecture introduced in Next.js 13+ and uses Turbopack for faster development and builds.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Create production build with Turbopack  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality

### Development Server
The dev server runs on http://localhost:3000 and uses Turbopack for enhanced performance.

## Architecture

### Project Structure
- `src/app/` - App Router pages and layouts (Next.js 13+ structure)
- `src/app/layout.tsx` - Root layout with Geist font configuration
- `src/app/page.tsx` - Home page component
- `src/app/globals.css` - Global CSS with Tailwind directives
- `public/` - Static assets (SVGs, images)

### Key Technologies
- **Next.js App Router** - File-based routing in `src/app/`
- **TypeScript** - Strict mode enabled with path aliases (`@/*` → `./src/*`)
- **Tailwind CSS 4** - Latest version with PostCSS integration
- **Geist Fonts** - Optimized font loading via `next/font/google`
- **Turbopack** - Used for both dev and production builds

### Configuration Files
- `next.config.ts` - Next.js configuration (currently minimal)
- `tsconfig.json` - TypeScript with strict mode and Next.js plugin
- `eslint.config.mjs` - ESLint with Next.js recommended rules and TypeScript support
- `postcss.config.mjs` - PostCSS configuration for Tailwind CSS 4

## Code Conventions

### Component Structure
Components use functional syntax with TypeScript interfaces for props. The main page uses Tailwind's utility classes with responsive design patterns.

### Styling
- Tailwind CSS 4 utility classes
- CSS custom properties for theming (`--font-geist-sans`, `--font-geist-mono`)
- Dark mode support via Tailwind's `dark:` modifier
- Mobile-first responsive design with `sm:` breakpoints

### TypeScript
- Strict mode enabled
- Path aliases configured for clean imports
- Next.js types included via plugin