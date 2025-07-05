# CODEBASE UNDERSTANDING - Admin Panel IFMSA Brazil

## Executive Summary

This codebase represents a comprehensive administrative panel for IFMSA Brazil (International Federation of Medical Students' Associations - Brazil), built using modern web technologies. The system manages organizational data, events, member registrations, and content management with real-time capabilities.

## Technology Stack

### Core Framework
- **Next.js 14**: React-based framework with App Router architecture
- **TypeScript**: Providing type safety throughout the application
- **React 18**: Component-based UI library

### Database & ORM
- **MySQL**: Primary relational database
- **Prisma**: Type-safe ORM with migration support
- **Convex**: Real-time database for live features (attendance, registrations)

### Authentication & Security
- **NextAuth.js v4**: OAuth authentication with Google provider
- **Session-based auth**: Server-side session management
- **Role-based access**: IFMSA email domain validation

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: Radix UI-based component library
- **Class Variance Authority**: Component variant management

### API Layer
- **tRPC**: Type-safe API layer with Next.js integration
- **RESTful endpoints**: For specific operations (email, file downloads)

### External Services
- **GitHub API**: Content storage for images and documents
- **Mailtrap**: Email service provider
- **Algolia**: Search functionality
- **Vercel**: Analytics and speed insights

## Architecture Overview

### Directory Structure

```
adminpanel-1/
├── src/
│   ├── app/                    # Next.js App Router pages and components
│   │   ├── _components/        # Page-specific components
│   │   ├── actions/            # Server actions
│   │   ├── ag/                 # Assembly (AG) management pages
│   │   ├── api/                # API routes
│   │   └── [various pages]/    # Feature-specific pages
│   ├── components/             # Shared UI components
│   ├── server/                 # Server-side logic
│   │   ├── api/                # tRPC routers
│   │   ├── auth.ts             # Authentication configuration
│   │   └── db.ts               # Database client
│   ├── lib/                    # Utility functions
│   └── styles/                 # Global styles
├── convex/                     # Real-time database schemas and functions
├── prisma/                     # Database schema and migrations
└── public/                     # Static assets
```

### Core Design Patterns

1. **Server Components First**: Leverages Next.js 14's server components for optimal performance
2. **Type-Safe API Layer**: tRPC provides end-to-end type safety
3. **Dual Database Architecture**: MySQL for persistent data, Convex for real-time features
4. **Component Composition**: Modular UI components using Radix UI primitives
5. **Server Actions**: Direct server mutations without API endpoints

## Major Functional Modules

### 1. Authentication System (`src/server/auth.ts`)
- Google OAuth integration
- Session management with database persistence
- IFMSA email domain validation
- Protected procedures for authorized endpoints

### 2. Event Management (AG - Assembleia Geral)
The most complex module managing medical student assemblies:

#### Components:
- **Assembly Configuration** (`convex/assemblies.ts`)
- **Registration System** (`convex/agRegistrations.ts`)
- **Attendance Tracking** (`convex/attendance.ts`)
- **Session Management** (`convex/agSessions.ts`)
- **QR Code System** (`convex/qrReaders.ts`)

#### Key Features:
- Multi-step registration process
- Payment tracking and exemptions
- Real-time attendance marking
- Session-based participation tracking
- QR code generation for check-ins

### 3. Content Management System
Manages various types of organizational content:

#### News/Blog System (`src/app/noticias/`)
- Markdown editor integration
- Image upload to GitHub CDN
- Multi-author support
- Draft/publish workflow

#### Document Management (`src/app/documentos/`)
- Multiple document types
- File storage via GitHub API
- Access control

### 4. Member Management
Handles different member types:

#### Executive Board (EB)
- Role-based hierarchy
- Image management
- Order/position tracking

#### Regional Coordinators (CR)
- Regional association
- Hierarchical structure
- Contact information management

#### Teams (Times)
- Multiple team types
- Member assignments
- Role definitions

### 5. Email System (`src/app/actions/sendEmail.ts`)
Comprehensive email functionality:
- Template-based emails
- Multiple email types (registration, approval, payment, etc.)
- HTML email generation
- Bulk email capabilities
- Rate limiting

### 6. File Management
Dual approach to file storage:
- **GitHub CDN**: For public images and documents
- **Convex Storage**: For receipt uploads and private files

### 7. Real-time Features
Using Convex for live updates:
- Attendance marking
- Registration status
- Session participation
- QR reader status

## Data Flow Architecture

### Registration Flow
1. User initiates registration through multi-step form
2. Data validation on client and server
3. Storage in Convex with real-time status
4. Email notifications via server actions
5. Admin review and approval process
6. Payment verification workflow
7. QR code generation for approved participants

### Content Publishing Flow
1. Create/edit content with markdown editor
2. Image upload to GitHub via API
3. Save metadata to MySQL via Prisma
4. CDN URL generation for assets
5. Public availability through Next.js pages

### Authentication Flow
1. User clicks sign-in
2. Redirect to Google OAuth
3. Callback validates email domain
4. Session created in database
5. Protected routes check session
6. IFMSA email validation for admin features

## Key Technical Decisions

### Dual Database Strategy
- **MySQL/Prisma**: For structured, relational data requiring ACID compliance
- **Convex**: For real-time features requiring instant updates and subscriptions

### External Storage via GitHub
- Leverages GitHub as a free CDN
- Version control for content
- API-based management
- Public accessibility

### Server-First Architecture
- Reduces client bundle size
- Improves SEO and initial load
- Server components for data fetching
- Client components only where needed

### Type Safety Throughout
- TypeScript for compile-time checks
- tRPC for API type safety
- Prisma for database type safety
- Zod for runtime validation

## Security Measures

### Authentication & Authorization
- OAuth 2.0 with Google
- Session-based authentication
- Domain-based access control (@ifmsabrazil.org)
- Role-based permissions

### Data Protection
- Server-side session validation
- Input sanitization
- Prepared statements via Prisma
- Environment variable validation

### API Security
- Protected procedures require authentication
- IFMSA email validation for sensitive operations
- Rate limiting considerations

## Performance Optimizations

### Caching Strategy
- Next.js automatic caching
- Server component caching
- Static generation where possible

### Database Optimization
- Indexed queries
- Efficient relationship loading
- Transaction batching

### Asset Optimization
- External CDN for images
- Lazy loading components
- Code splitting

## Deployment Considerations

### Environment Requirements
- Node.js runtime
- MySQL database
- Convex deployment
- Environment variables configuration

### Scalability Factors
- Horizontal scaling capability
- CDN for static assets
- Database connection pooling
- Real-time connection management

## Areas of Complexity

### Assembly Registration System
The most complex feature involving:
- Multi-step forms with state persistence
- Payment processing workflow
- Email notifications
- Real-time status updates
- QR code generation and validation

### Dual Database Synchronization
Managing data consistency between:
- MySQL for persistent storage
- Convex for real-time features
- Ensuring data integrity

### Email Template System
Complex HTML email generation with:
- Multiple template types
- Dynamic content insertion
- Styling for email clients
- Delivery tracking

## Technical Debt Indicators

1. **Mixed Data Storage**: Using both MySQL and Convex creates complexity
2. **Email HTML Complexity**: Large inline HTML templates in code
3. **Manual GitHub API Integration**: Custom implementation for file storage
4. **Limited Error Recovery**: Some operations lack robust error handling
5. **Component Organization**: Some components are quite large and could be split

## Conclusion

This codebase represents a sophisticated administrative system with real-time capabilities, comprehensive member management, and event coordination features. The architecture leverages modern web technologies effectively, though there are areas where complexity could be reduced through refactoring and consolidation of data storage strategies.
