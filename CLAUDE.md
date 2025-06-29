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
- **Charts**: shadcn/ui chart components built on Recharts (React 19 compatible)
- **Fonts**: Geist Sans and Geist Mono via next/font
- **Authentication**: Custom React Context-based authentication system

### Application Structure

The app uses an authentication-gated layout with the following sections:

1. **登录页面 (Login) - `/login`**: Student authentication with predefined student accounts
2. **我的信息 (Profile) - `/profile`**: Student personal information and academic records  
3. **数据总览 (Dashboard) - `/dashboard`**: Main analytics dashboard with charts and metrics
4. **Role Model - `/role-models`**: Database of senior students for mentorship
5. **分析模块 (Analysis) - `/analysis`**: Deep learning analytics and improvement suggestions
6. **图表展示 (Charts) - `/charts`**: Comprehensive chart examples and demos

### Layout Architecture

- `app/layout.tsx`: Root layout with authentication provider and font configuration
- `components/auth/auth-wrapper.tsx`: Authentication wrapper that handles login state and redirects
- `contexts/student-context.tsx`: React Context for managing student authentication state
- `components/layout/sidebar.tsx`: Main navigation sidebar with route-based active states
- The authenticated layout uses flexbox with a fixed sidebar and scrollable main content area
- Non-authenticated users see only the login page

### Component System

**UI Components** (`components/ui/`):
- Built on Radix UI primitives with custom styling
- Uses `class-variance-authority` for variant management
- Follows shadcn/ui patterns with `cn()` utility for className merging
- Key components: Button, Card, Badge, Sidebar, Select, Chart
- Chart components include: ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend

**Styling System**:
- CSS custom properties for theming with light/dark mode support
- Tailwind v4 with `@theme inline` configuration in `globals.css`
- HSL color values for easy theme customization

### Data Visualization

Uses shadcn/ui chart components built on Recharts with React 19 compatibility:
- Bar charts for subject performance
- Pie charts for attendance data
- Line charts for progress trends
- Radar charts for ability assessment
- Area charts for time analysis
- All charts use proper height configuration (h-[300px]) to avoid rendering issues
- Chart colors are configured via CSS custom properties for consistent theming

### TypeScript Configuration

- Path aliases configured with `@/*` mapping to project root
- Strict TypeScript settings enabled
- Next.js plugin integration for optimized builds

### State Management

Uses React's built-in state management with custom Context:
- **Student Context**: Manages authentication state and current student data
- **Local component state**: Uses `useState` for component-specific state
- **Navigation state**: Via Next.js `usePathname` for route-based UI updates
- **Persistence**: Student login state persisted in localStorage
- No external state management library implemented

## Authentication System

The application uses a custom React Context-based authentication system:

### Student Accounts
- **2023213592**: 学生 A (通信工程专业)
- **2024213472**: 学生 B (计算机科学与技术专业)  
- **2023213043**: 学生 C (软件工程专业)

### Authentication Flow
1. Users visit `/` and are redirected to `/login`
2. Login page displays dropdown to select from predefined student accounts
3. Selected student ID is stored in localStorage and React Context
4. Authenticated users can access all dashboard features
5. Dashboard displays data specific to the logged-in student
6. Logout button clears authentication state and redirects to login

### Database Integration
- Student data is stored in Supabase with the three student IDs above
- Dashboard components automatically load data for the authenticated student
- All database queries use the current student's ID from the authentication context

## Development Notes

- The app redirects from `/` to `/login` for unauthenticated users
- Authenticated users are redirected from `/login` to `/dashboard`
- All pages except `/login` require authentication
- All pages are server components except where client interactivity is needed
- Chinese language support is configured (lang="zh" in root layout)
- Responsive design implemented using Tailwind's responsive utilities
- Chart components must use explicit height (h-[300px]) to render properly

## Development Guidelines

- Always try to use shadcn/ui