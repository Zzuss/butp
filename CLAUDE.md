# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a student management system (学生管理系统) built with Next.js 15, shadcn/ui components, and Tailwind CSS v4. The application provides a dashboard for students to track their academic performance, view role models, and analyze their learning data.

## Development Commands

- `npm run dev` - Start development server (usually on port 3000, will use 3001+ if 3000 is occupied)
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint to check code quality

## Architecture

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4 with custom CSS variables for theming
- **UI Components**: Custom shadcn/ui implementation with Radix UI primitives
- **Icons**: Lucide React
- **Charts**: Recharts for data visualization
- **Fonts**: Geist Sans and Geist Mono via next/font

### Application Structure

The app uses a sidebar-based layout with four main sections:

1. **我的信息 (Profile) - `/profile`**: Student personal information and academic records
2. **数据总览 (Dashboard) - `/dashboard`**: Main analytics dashboard with charts and metrics
3. **Role Model - `/role-models`**: Database of senior students for mentorship
4. **分析模块 (Analysis) - `/analysis`**: Deep learning analytics and improvement suggestions

### Layout Architecture

- `app/layout.tsx`: Root layout with sidebar integration and font configuration
- `components/layout/sidebar.tsx`: Main navigation sidebar with route-based active states
- The layout uses flexbox with a fixed sidebar and scrollable main content area

### Component System

**UI Components** (`components/ui/`):
- Built on Radix UI primitives with custom styling
- Uses `class-variance-authority` for variant management
- Follows shadcn/ui patterns with `cn()` utility for className merging
- Key components: Button, Card, Badge, Sidebar

**Styling System**:
- CSS custom properties for theming with light/dark mode support
- Tailwind v4 with `@theme inline` configuration in `globals.css`
- HSL color values for easy theme customization

### Data Visualization

Uses Recharts for all charts and graphs:
- Bar charts for subject performance
- Pie charts for attendance data
- Line charts for progress trends
- Radar charts for ability assessment
- Area charts for time analysis

### TypeScript Configuration

- Path aliases configured with `@/*` mapping to project root
- Strict TypeScript settings enabled
- Next.js plugin integration for optimized builds

### State Management

Currently uses React's built-in state management:
- Local component state with `useState`
- Navigation state via Next.js `usePathname`
- No external state management library implemented

## Development Notes

- The app redirects from `/` to `/dashboard` as the default route
- All pages are server components except where client interactivity is needed
- Chinese language support is configured (lang="zh" in root layout)
- Responsive design implemented using Tailwind's responsive utilities