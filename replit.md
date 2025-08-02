# SecureShare - File Sharing Platform

## Overview

SecureShare is a modern file sharing platform built with a full-stack architecture. It provides secure file upload, sharing, and management capabilities with features like password protection, expiry dates, download limits, and subscription tiers. The platform follows a Gmail-inspired dark theme design and offers both free and premium subscription options.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme design system
- **State Management**: React Context for authentication, TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **File Upload**: Multer middleware for handling multipart form data
- **API Design**: RESTful API structure with proper error handling

### Database Design
- **Primary Database**: PostgreSQL (configured for Neon serverless)
- **Schema**: Comprehensive relational design with tables for:
  - Users and profiles (authentication and user metadata)
  - Files (storage metadata and sharing configuration)
  - Shared links (different sharing methods and access control)
  - Download logs (analytics and tracking)
- **Relationships**: Proper foreign key constraints with cascade deletes
- **Migrations**: Drizzle Kit for schema migrations

### Authentication & Authorization
- **Strategy**: JWT tokens stored in localStorage
- **Password Security**: bcrypt hashing with salt rounds
- **Protected Routes**: Middleware-based route protection
- **Session Management**: Token verification on API requests
- **User Profiles**: Separate profile table for extended user metadata

### File Management System
- **Storage**: Local file system with configurable upload directory
- **Sharing Methods**: Multiple sharing options including public links, share codes, and email
- **Access Control**: Password protection, download limits, and expiry dates
- **Analytics**: Download tracking and user analytics

### Subscription System
- **Tiers**: Free and Pro subscription levels
- **Limits**: Daily upload limits and feature restrictions
- **Payment Processing**: Configured for Paddle integration
- **Upgrade Flow**: Subscription success handling

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form
- **Build Tools**: Vite, esbuild for production builds
- **TypeScript**: Full TypeScript support with strict configuration

### UI and Styling
- **shadcn/ui**: Complete component library with Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe component variants

### Database and Backend
- **Neon Database**: Serverless PostgreSQL with connection pooling
- **Drizzle ORM**: Type-safe database operations and migrations
- **Express.js**: Web application framework with middleware support
- **Authentication**: bcrypt, jsonwebtoken for security

### Development Tools
- **Replit Integration**: Development environment optimizations
- **Error Handling**: Runtime error overlays and proper error boundaries
- **Code Quality**: TypeScript strict mode, proper linting configuration

### Third-party Services
- **Supabase**: Authentication and real-time features (referenced in components)
- **TanStack Query**: Server state management and caching
- **Paddle**: Payment processing for subscriptions (configured but not fully implemented)