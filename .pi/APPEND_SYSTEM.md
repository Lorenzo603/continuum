<!-- Ported from .claude/rules/*.instructions.md (always-on project instructions).
     Pi has no rules/applyTo mechanism: these load unconditionally with the project's
     context, not scoped to the file patterns the original rules declared.
     Per-source notes below record the original scope. -->


<!-- Source: .claude/rules/nextjs.instructions.md
     Original scope (applyTo): **/*.tsx, **/*.ts, **/*.jsx, **/*.js, **/*.css -->

# Next.js Best Practices for LLMs (2026)

_Last updated: January 2026 (aligned to Next.js 16.1.1)_

This document summarizes the latest, authoritative best practices for building, structuring, and maintaining Next.js applications. It is intended for use by LLMs and developers to ensure code quality, maintainability, and scalability.

---

## 1. Project Structure & Organization

- **Use the `app/` directory** (App Router) for all new projects. Prefer it over the legacy `pages/` directory.
- **Top-level folders:**
  - `app/` — Routing, layouts, pages, and route handlers
  - `public/` — Static assets (images, fonts, etc.)
  - `lib/` — Shared utilities, API clients, and logic
  - `components/` — Reusable UI components
  - `contexts/` — React context providers
  - `styles/` — Global and modular stylesheets
  - `hooks/` — Custom React hooks
  - `types/` — TypeScript type definitions
- **Colocation:** Place files (components, styles, tests) near where they are used, but avoid deeply nested structures.
- **Route Groups:** Use parentheses (e.g., `(admin)`) to group routes without affecting the URL path.
- **Private Folders:** Prefix with `_` (e.g., `_internal`) to opt out of routing and signal implementation details.

- **Feature Folders:** For large apps, group by feature (e.g., `app/dashboard/`, `app/auth/`).
- **Use `src/`** (optional): Place all source code in `src/` to separate from config files.

## 2.1. Server and Client Component Integration (App Router)

**Never use `next/dynamic` with `{ ssr: false }` inside a Server Component.** This is not supported and will cause a build/runtime error.

**Correct Approach:**

- If you need to use a Client Component (e.g., a component that uses hooks, browser APIs, or client-only libraries) inside a Server Component, you must:
  1. Move all client-only logic/UI into a dedicated Client Component (with `'use client'` at the top).
  2. Import and use that Client Component directly in the Server Component (no need for `next/dynamic`).
  3. If you need to compose multiple client-only elements (e.g., a navbar with a profile dropdown), create a single Client Component that contains all of them.

**Example:**

```tsx
// Server Component
import DashboardNavbar from "@/components/DashboardNavbar";

export default async function DashboardPage() {
  // ...server logic...
  return (
    <>
      <DashboardNavbar /> {/* This is a Client Component */}
      {/* ...rest of server-rendered page... */}
    </>
  );
}
```

**Why:**

- Server Components cannot use client-only features or dynamic imports with SSR disabled.
- Client Components can be rendered inside Server Components, but not the other way around.

**Summary:**
Always move client-only UI into a Client Component and import it directly in your Server Component. Never use `next/dynamic` with `{ ssr: false }` in a Server Component.

## 2.2. Next.js 16+ async request APIs (App Router)

- **Assume request-bound data is async in Server Components and Route Handlers.** In Next.js 16, APIs like `cookies()`, `headers()`, and `draftMode()` are async in the App Router.
- **Be careful with route props:** `params` / `searchParams` may be Promises in Server Components. Prefer `await`ing them instead of treating them as plain objects.
- **Avoid dynamic rendering by accident:** Accessing request data (cookies/headers/searchParams) opts the route into dynamic behavior. Read them intentionally and isolate dynamic parts behind `Suspense` boundaries when appropriate.

---

## 2. Component Best Practices

- **Component Types:**
  - **Server Components** (default): For data fetching, heavy logic, and non-interactive UI.
  - **Client Components:** Add `'use client'` at the top. Use for interactivity, state, or browser APIs.
- **When to Create a Component:**
  - If a UI pattern is reused more than once.
  - If a section of a page is complex or self-contained.
  - If it improves readability or testability.
- **Naming Conventions:**
  - Use `PascalCase` for component files and exports (e.g., `UserCard.tsx`).
  - Use `camelCase` for hooks (e.g., `useUser.ts`).
  - Use `snake_case` or `kebab-case` for static assets (e.g., `logo_dark.svg`).
  - Name context providers as `XyzProvider` (e.g., `ThemeProvider`).
- **File Naming:**
  - Match the component name to the file name.
  - For single-export files, default export the component.
  - For multiple related components, use an `index.ts` barrel file.
- **Component Location:**
  - Place shared components in `components/`.
  - Place route-specific components inside the relevant route folder.
- **Props:**
  - Use TypeScript interfaces for props.
  - Prefer explicit prop types and default values.
- **Testing:**
  - Co-locate tests with components (e.g., `UserCard.test.tsx`).

## 3. Naming Conventions (General)

- **Folders:** `kebab-case` (e.g., `user-profile/`)
- **Files:** `PascalCase` for components, `camelCase` for utilities/hooks, `kebab-case` for static assets
- **Variables/Functions:** `camelCase`
- **Types/Interfaces:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`

## 4. API Routes (Route Handlers)

- **Prefer API Routes over Edge Functions** unless you need ultra-low latency or geographic distribution.
- **Location:** Place API routes in `app/api/` (e.g., `app/api/users/route.ts`).
- **HTTP Methods:** Export async functions named after HTTP verbs (`GET`, `POST`, etc.).
- **Request/Response:** Use the Web `Request` and `Response` APIs. Use `NextRequest`/`NextResponse` for advanced features.
- **Dynamic Segments:** Use `[param]` for dynamic API routes (e.g., `app/api/users/[id]/route.ts`).
- **Validation:** Always validate and sanitize input. Use libraries like `zod` or `yup`.
- **Error Handling:** Return appropriate HTTP status codes and error messages.
- **Authentication:** Protect sensitive routes using middleware or server-side session checks.

### Route Handler usage note (performance)

- **Do not call your own Route Handlers from Server Components** (e.g., `fetch('/api/...')`) just to reuse logic. Prefer extracting shared logic into modules (e.g., `lib/`) and calling it directly to avoid extra server hops.

## 5. General Best Practices

- **TypeScript:** Use TypeScript for all code. Enable `strict` mode in `tsconfig.json`.
- **ESLint & Prettier:** Enforce code style and linting. Use the official Next.js ESLint config. In Next.js 16, prefer running ESLint via the ESLint CLI (not `next lint`).
- **Environment Variables:** Store secrets in `.env.local`. Never commit secrets to version control.
  - In Next.js 16, `serverRuntimeConfig` / `publicRuntimeConfig` are removed. Use environment variables instead.
  - `NEXT_PUBLIC_` variables are **inlined at build time** (changing them after build won’t affect a deployed build).
  - If you truly need runtime evaluation of env in a dynamic context, follow Next.js guidance (e.g., call `connection()` before reading `process.env`).
- **Testing:** Use Jest, React Testing Library, or Playwright. Write tests for all critical logic and components.
- **Accessibility:** Use semantic HTML and ARIA attributes. Test with screen readers.
- **Performance:**
  - Use built-in Image and Font optimization.
  - Prefer **Cache Components** (`cacheComponents` + `use cache`) over legacy caching patterns.
  - Use Suspense and loading states for async data.
  - Avoid large client bundles; keep most logic in Server Components.
- **Security:**
  - Sanitize all user input.
  - Use HTTPS in production.
  - Set secure HTTP headers.
  - Prefer server-side authorization for Server Actions and Route Handlers; never trust client input.
- **Documentation:**
  - Write clear README and code comments.
  - Document public APIs and components.

## 6. Caching & Revalidation (Next.js 16 Cache Components)

- **Prefer Cache Components for memoization/caching** in the App Router.
  - Enable in `next.config.*` via `cacheComponents: true`.
  - Use the **`use cache` directive** to opt a component/function into caching.
- **Use cache tagging and lifetimes intentionally:**
  - Use `cacheTag(...)` to associate cached results with tags.
  - Use `cacheLife(...)` to control cache lifetime (presets or configured profiles).
- **Revalidation guidance:**
  - Prefer `revalidateTag(tag, 'max')` (stale-while-revalidate) for most cases.
  - The single-argument form `revalidateTag(tag)` is legacy/deprecated.
  - Use `updateTag(...)` inside **Server Actions** when you need “read-your-writes” / immediate consistency.
- **Avoid `unstable_cache`** for new code; treat it as legacy and migrate toward Cache Components.

## 7. Tooling updates (Next.js 16)

- **Turbopack is the default dev bundler.** Configure via the top-level `turbopack` field in `next.config.*` (do not use the removed `experimental.turbo`).
- **Typed routes are stable** via `typedRoutes` (TypeScript required).

# Avoid Unnecessary Example Files

Do not create example/demo files (like ModalExample.tsx) in the main codebase unless the user specifically requests a live example, Storybook story, or explicit documentation component. Keep the repository clean and production-focused by default.

# Always use the latest documentation and guides

- For every nextjs related request, begin by searching for the most current nextjs documentation, guides, and examples.
- Use the following tools to fetch and search documentation if they are available:
  - `resolve_library_id` to resolve the package/library name in the docs.
  - `get_library_docs` for up to date documentation.

<!-- Source: .claude/rules/nextjs-tailwind.instructions.md
     Original scope (applyTo): **/*.tsx, **/*.ts, **/*.jsx, **/*.js, **/*.css -->

# Next.js + Tailwind Development Instructions

Instructions for high-quality Next.js applications with Tailwind CSS styling and TypeScript.

## Project Context

- Latest Next.js (App Router)
- TypeScript for type safety
- Tailwind CSS for styling

## Development Standards

### Architecture
- App Router with server and client components
- Group routes by feature/domain
- Implement proper error boundaries
- Use React Server Components by default
- Leverage static optimization where possible

### TypeScript
- Strict mode enabled
- Clear type definitions
- Proper error handling with type guards
- Zod for runtime type validation

### Styling
- Tailwind CSS with consistent color palette
- Responsive design patterns
- Dark mode support
- Follow container queries best practices
- Maintain semantic HTML structure

### State Management
- React Server Components for server state
- React hooks for client state
- Proper loading and error states
- Optimistic updates where appropriate

### Data Fetching
- Server Components for direct database queries
- React Suspense for loading states
- Proper error handling and retry logic
- Cache invalidation strategies

### Security
- Input validation and sanitization
- Proper authentication checks
- CSRF protection
- Rate limiting implementation
- Secure API route handling

### Performance
- Image optimization with next/image
- Font optimization with next/font
- Route prefetching
- Proper code splitting
- Bundle size optimization

## Implementation Process
1. Plan component hierarchy
2. Define types and interfaces
3. Implement server-side logic
4. Build client components
5. Add proper error handling
6. Implement responsive styling
7. Add loading states
8. Write tests

<!-- Source: .claude/rules/html-css-style-color-guide.instructions.md
     Original scope (applyTo): **/*.html, **/*.css, **/*.js -->

# HTML CSS Style Color Guide

Follow these guidelines when updating or creating HTML/CSS styles for browser rendering. Color names
represent the full spectrum of their respective hue ranges (e.g., "blue" includes navy, sky blue, etc.).

## Color Definitions

- **Hot Colors**: Oranges, reds, and yellows
- **Cool Colors**: Blues, greens, and purples
- **Neutral Colors**: Grays and grayscale variations
- **Binary Colors**: Black and white
- **60-30-10 Rule**
  - **Primary Color**: Use 60% of the time (*cool or light color*)
  - **Secondary Color**: Use 30% of the time (*cool or light color*)
  - **Accent**: Use 10% of the time (*complementary hot color*)

## Color Usage Guidelines

Balance the colors used by applying the **60-30-10 rule** to graphic design elements like backgrounds,
buttons, cards, etc...

### Background Colors

**Never Use:**

- Purple or magenta
- Red, orange, or yellow
- Pink
- Any hot color

**Recommended:**

- White or off-white
- Light cool colors (e.g., light blues, light greens)
- Subtle neutral tones
- Light gradients with minimal color shift

### Text Colors

**Never Use:**

- Yellow (poor contrast and readability)
- Pink
- Pure white or light text on light backgrounds
- Pure black or dark text on dark backgrounds

**Recommended:**

- Dark neutral colors (e.g., #1f2328, #24292f)
- Near-black variations (#000000 to #333333)
  - Ensure background is a light color
- Dark grays (#4d4d4d, #6c757d)
- High-contrast combinations for accessibility
- Near-white variations (#ffffff to #f0f2f3)
  - Ensure background is a dark color

### Colors to Avoid

Unless explicitly required by design specifications or user request, avoid:

- Bright purples and magentas
- Bright pinks and neon colors
- Highly saturated hot colors
- Colors with low contrast ratios (fails WCAG accessibility standards)

### Colors to Use Sparingly

**Hot Colors** (red, orange, yellow):

- Reserve for critical alerts, warnings, or error messages
- Use only when conveying urgency or importance
- Limit to small accent areas rather than large sections
- Consider alternatives like icons or bold text before using hot colors

## Gradients

Apply gradients with subtle color transitions to maintain professional aesthetics.

### Best Practices

- Keep color shifts minimal (e.g., #E6F2FF to #F5F7FA)
- Use gradients within the same color family
- Avoid combining hot and cool colors in a single gradient
- Prefer linear gradients over radial for backgrounds

### Appropriate Use Cases

- Background containers and sections
- Button hover states and interactive elements
- Drop shadows and depth effects
- Header and navigation bars
- Card components and panels

## Additional Resources

- [Color Tool](https://civicactions.github.io/uswds-color-tool/)
- [Government or Professional Color Standards](https://designsystem.digital.gov/design-tokens/color/overview/)
- [UI Color Palette Best Practices](https://www.interaction-design.org/literature/article/ui-color-palette)
- [Color Combination Resource](https://www.figma.com/resource-library/color-combinations/)

<!-- Source: .claude/rules/containerization-docker-best-practices.instructions.md
     Original scope (applyTo): **/Dockerfile,**/Dockerfile.*,**/*.dockerfile,**/docker-compose*.yml,**/docker-compose*.yaml,**/compose*.yml,**/compose*.yaml -->

# Containerization & Docker Best Practices

## Your Mission

You are an expert in containerization with deep knowledge of Docker best practices. Your goal is to guide developers in building highly efficient, secure, and maintainable Docker images and managing their containers effectively. You must emphasize optimization, security, and reproducibility.


## Core Principles of Containerization

### **1. Immutability**
- **Principle:** Once a container image is built, it should not change. Any changes should result in a new image.
- **Deeper Dive:**
    - **Reproducible Builds:** Every build should produce identical results given the same inputs. This requires deterministic build processes, pinned dependency versions, and controlled build environments.
    - **Version Control for Images:** Treat container images like code - version them, tag them meaningfully, and maintain a clear history of what each image contains.
    - **Rollback Capability:** Immutable images enable instant rollbacks by simply switching to a previous image tag, without the complexity of undoing changes.
    - **Security Benefits:** Immutable images reduce the attack surface by preventing runtime modifications that could introduce vulnerabilities.
- **Guidance:**
    - Advocate for creating new images for every code change or configuration update, never modifying running containers in production.
    - Recommend using semantic versioning for image tags (e.g., `v1.2.3`, `latest` for development only).
    - Suggest implementing automated image builds triggered by code changes to ensure consistency.
    - Emphasize the importance of treating container images as artifacts that should be versioned and stored in registries.
- **Pro Tip:** This enables easy rollbacks and consistent environments across dev, staging, and production. Immutable images are the foundation of reliable deployments.

### **2. Portability**
- **Principle:** Containers should run consistently across different environments (local, cloud, on-premise) without modification.
- **Deeper Dive:**
    - **Environment Agnostic Design:** Design applications to be environment-agnostic by externalizing all environment-specific configurations.
    - **Configuration Management:** Use environment variables, configuration files, or external configuration services rather than hardcoding environment-specific values.
    - **Dependency Management:** Ensure all dependencies are explicitly defined and included in the container image, avoiding reliance on host system packages.
    - **Cross-Platform Compatibility:** Consider the target deployment platforms and ensure compatibility (e.g., ARM vs x86, different Linux distributions).
- **Guidance:**
    - Design Dockerfiles that are self-contained and avoid environment-specific configurations within the image itself.
    - Use environment variables for runtime configuration, with sensible defaults but allowing overrides.
    - Recommend using multi-platform base images when targeting multiple architectures.
    - Suggest implementing configuration validation to catch environment-specific issues early.
- **Pro Tip:** Portability is achieved through careful design and testing across target environments, not by accident.

### **3. Isolation**
- **Principle:** Containers provide process and resource isolation, preventing interference between applications.
- **Deeper Dive:**
    - **Process Isolation:** Each container runs in its own process namespace, preventing one container from seeing or affecting processes in other containers.
    - **Resource Isolation:** Containers have isolated CPU, memory, and I/O resources, preventing resource contention between applications.
    - **Network Isolation:** Containers can have isolated network stacks, with controlled communication between containers and external networks.
    - **Filesystem Isolation:** Each container has its own filesystem namespace, preventing file system conflicts.
- **Guidance:**
    - Recommend running a single process per container (or a clear primary process) to maintain clear boundaries and simplify management.
    - Use container networking for inter-container communication rather than host networking.
    - Suggest implementing resource limits to prevent containers from consuming excessive resources.
    - Advise on using named volumes for persistent data rather than bind mounts when possible.
- **Pro Tip:** Proper isolation is the foundation of container security and reliability. Don't break isolation for convenience.

### **4. Efficiency & Small Images**
- **Principle:** Smaller images are faster to build, push, pull, and consume fewer resources.
- **Deeper Dive:**
    - **Build Time Optimization:** Smaller images build faster, reducing CI/CD pipeline duration and developer feedback time.
    - **Network Efficiency:** Smaller images transfer faster over networks, reducing deployment time and bandwidth costs.
    - **Storage Efficiency:** Smaller images consume less storage in registries and on hosts, reducing infrastructure costs.
    - **Security Benefits:** Smaller images have a reduced attack surface, containing fewer packages and potential vulnerabilities.
- **Guidance:**
    - Prioritize techniques for reducing image size and build time throughout the development process.
    - Advise against including unnecessary tools, debugging utilities, or development dependencies in production images.
    - Recommend regular image size analysis and optimization as part of the development workflow.
    - Suggest using multi-stage builds and minimal base images as the default approach.
- **Pro Tip:** Image size optimization is an ongoing process, not a one-time task. Regularly review and optimize your images.

## Dockerfile Best Practices

### **1. Multi-Stage Builds (The Golden Rule)**
- **Principle:** Use multiple `FROM` instructions in a single Dockerfile to separate build-time dependencies from runtime dependencies.
- **Deeper Dive:**
    - **Build Stage Optimization:** The build stage can include compilers, build tools, and development dependencies without affecting the final image size.
    - **Runtime Stage Minimization:** The runtime stage contains only the application and its runtime dependencies, significantly reducing the attack surface.
    - **Artifact Transfer:** Use `COPY --from=<stage>` to transfer only necessary artifacts between stages.
    - **Parallel Build Stages:** Multiple build stages can run in parallel if they don't depend on each other.
- **Guidance:**
    - Always recommend multi-stage builds for compiled languages (Go, Java, .NET, C++) and even for Node.js/Python where build tools are heavy.
    - Suggest naming build stages descriptively (e.g., `AS build`, `AS test`, `AS production`) for clarity.
    - Recommend copying only the necessary artifacts between stages to minimize the final image size.
    - Advise on using different base images for build and runtime stages when appropriate.
- **Benefit:** Significantly reduces final image size and attack surface.
- **Example (Advanced Multi-Stage with Testing):**
```dockerfile
# Stage 1: Dependencies
FROM node:25-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build
FROM node:25-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Test
FROM build AS test
RUN npm run test
RUN npm run lint

# Stage 4: Production
FROM node:25-alpine AS production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### **2. Choose the Right Base Image**
- **Principle:** Select official, stable, and minimal base images that meet your application's requirements.
- **Deeper Dive:**
    - **Official Images:** Prefer official images from Docker Hub or cloud providers as they are regularly updated and maintained.
    - **Minimal Variants:** Use minimal variants (`alpine`, `slim`, `distroless`) when possible to reduce image size and attack surface.
    - **Security Updates:** Choose base images that receive regular security updates and have a clear update policy.
    - **Architecture Support:** Ensure the base image supports your target architectures (x86_64, ARM64, etc.).
- **Guidance:**
    - Prefer Alpine variants for Linux-based images due to their small size (e.g., `alpine`, `node:25-alpine`).
    - Use official language-specific images (e.g., `python:3.9-slim-buster`, `openjdk:17-jre-slim`).
    - Avoid `latest` tag in production; use specific version tags for reproducibility.
    - Recommend regularly updating base images to get security patches and new features.
- **Pro Tip:** Smaller base images mean fewer vulnerabilities and faster downloads. Always start with the smallest image that meets your needs.

### **3. Optimize Image Layers**
- **Principle:** Each instruction in a Dockerfile creates a new layer. Leverage caching effectively to optimize build times and image size.
- **Deeper Dive:**
    - **Layer Caching:** Docker caches layers and reuses them if the instruction hasn't changed. Order instructions from least to most frequently changing.
    - **Layer Size:** Each layer adds to the final image size. Combine related commands to reduce the number of layers.
    - **Cache Invalidation:** Changes to any layer invalidate all subsequent layers. Place frequently changing content (like source code) near the end.
    - **Multi-line Commands:** Use `\` for multi-line commands to improve readability while maintaining layer efficiency.
- **Guidance:**
    - Place frequently changing instructions (e.g., `COPY . .`) *after* less frequently changing ones (e.g., `RUN npm ci`).
    - Combine `RUN` commands where possible to minimize layers (e.g., `RUN apt-get update && apt-get install -y ...`).
    - Clean up temporary files in the same `RUN` command (`rm -rf /var/lib/apt/lists/*`).
    - Use multi-line commands with `\` for complex operations to maintain readability.
- **Example (Advanced Layer Optimization):**
```dockerfile
# BAD: Multiple layers, inefficient caching
FROM ubuntu:20.04
RUN apt-get update
RUN apt-get install -y python3 python3-pip
RUN pip3 install flask
RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/*

# GOOD: Optimized layers with proper cleanup
FROM ubuntu:20.04
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    pip3 install flask && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### **4. Use `.dockerignore` Effectively**
- **Principle:** Exclude unnecessary files from the build context to speed up builds and reduce image size.
- **Deeper Dive:**
    - **Build Context Size:** The build context is sent to the Docker daemon. Large contexts slow down builds and consume resources.
    - **Security:** Exclude sensitive files (like `.env`, `.git`) to prevent accidental inclusion in images.
    - **Development Files:** Exclude development-only files that aren't needed in the production image.
    - **Build Artifacts:** Exclude build artifacts that will be generated during the build process.
- **Guidance:**
    - Always suggest creating and maintaining a comprehensive `.dockerignore` file.
    - Common exclusions: `.git`, `node_modules` (if installed inside container), build artifacts from host, documentation, test files.
    - Recommend reviewing the `.dockerignore` file regularly as the project evolves.
    - Suggest using patterns that match your project structure and exclude unnecessary files.
- **Example (Comprehensive .dockerignore):**
```dockerignore
# Version control
.git*

# Dependencies (if installed in container)
node_modules
vendor
__pycache__

# Build artifacts
dist
build
*.o
*.so

# Development files
.env.*
*.log
coverage
.nyc_output

# IDE files
.vscode
.idea
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Documentation
*.md
docs/

# Test files
test/
tests/
spec/
__tests__/
```

### **5. Minimize `COPY` Instructions**
- **Principle:** Copy only what is necessary, when it is necessary, to optimize layer caching and reduce image size.
- **Deeper Dive:**
    - **Selective Copying:** Copy specific files or directories rather than entire project directories when possible.
    - **Layer Caching:** Each `COPY` instruction creates a new layer. Copy files that change together in the same instruction.
    - **Build Context:** Only copy files that are actually needed for the build or runtime.
    - **Security:** Be careful not to copy sensitive files or unnecessary configuration files.
- **Guidance:**
    - Use specific paths for `COPY` (`COPY src/ ./src/`) instead of copying the entire directory (`COPY . .`) if only a subset is needed.
    - Copy dependency files (like `package.json`, `requirements.txt`) before copying source code to leverage layer caching.
    - Recommend copying only the necessary files for each stage in multi-stage builds.
    - Suggest using `.dockerignore` to exclude files that shouldn't be copied.
- **Example (Optimized COPY Strategy):**
```dockerfile
# Copy dependency files first (for better caching)
COPY package*.json ./
RUN npm ci

# Copy source code (changes more frequently)
COPY src/ ./src/
COPY public/ ./public/

# Copy configuration files
COPY config/ ./config/

# Don't copy everything with COPY . .
```

### **6. Define Default User and Port**
- **Principle:** Run containers with a non-root user for security and expose expected ports for clarity.
- **Deeper Dive:**
    - **Security Benefits:** Running as non-root reduces the impact of security vulnerabilities and follows the principle of least privilege.
    - **User Creation:** Create a dedicated user for your application rather than using an existing user.
    - **Port Documentation:** Use `EXPOSE` to document which ports the application listens on, even though it doesn't actually publish them.
    - **Permission Management:** Ensure the non-root user has the necessary permissions to run the application.
- **Guidance:**
    - Use `USER <non-root-user>` to run the application process as a non-root user for security.
    - Use `EXPOSE` to document the port the application listens on (doesn't actually publish).
    - Create a dedicated user in the Dockerfile rather than using an existing one.
    - Ensure proper file permissions for the non-root user.
- **Example (Secure User Setup):**
```dockerfile
# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set proper permissions
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8080

# Start the application
CMD ["node", "dist/main.js"]
```

### **7. Use `CMD` and `ENTRYPOINT` Correctly**
- **Principle:** Define the primary command that runs when the container starts, with clear separation between the executable and its arguments.
- **Deeper Dive:**
    - **`ENTRYPOINT`:** Defines the executable that will always run. Makes the container behave like a specific application.
    - **`CMD`:** Provides default arguments to the `ENTRYPOINT` or defines the command to run if no `ENTRYPOINT` is specified.
    - **Shell vs Exec Form:** Use exec form (`["command", "arg1", "arg2"]`) for better signal handling and process management.
    - **Flexibility:** The combination allows for both default behavior and runtime customization.
- **Guidance:**
    - Use `ENTRYPOINT` for the executable and `CMD` for arguments (`ENTRYPOINT ["/app/start.sh"]`, `CMD ["--config", "prod.conf"]`).
    - For simple execution, `CMD ["executable", "param1"]` is often sufficient.
    - Prefer exec form over shell form for better process management and signal handling.
    - Consider using shell scripts as entrypoints for complex startup logic.
- **Pro Tip:** `ENTRYPOINT` makes the image behave like an executable, while `CMD` provides default arguments. This combination provides flexibility and clarity.

### **8. Environment Variables for Configuration**
- **Principle:** Externalize configuration using environment variables or mounted configuration files to make images portable and configurable.
- **Deeper Dive:**
    - **Runtime Configuration:** Use environment variables for configuration that varies between environments (databases, API endpoints, feature flags).
    - **Default Values:** Provide sensible defaults with `ENV` but allow overriding at runtime.
    - **Configuration Validation:** Validate required environment variables at startup to fail fast if configuration is missing.
    - **Security:** Never hardcode secrets in environment variables in the Dockerfile.
- **Guidance:**
    - Avoid hardcoding configuration inside the image. Use `ENV` for default values, but allow overriding at runtime.
    - Recommend using environment variable validation in application startup code.
    - Suggest using configuration management tools or external configuration services for complex applications.
    - Advise on using secrets management solutions for sensitive configuration.
- **Example (Environment Variable Best Practices):**
```dockerfile
# Set default values
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# Use ARG for build-time variables
ARG BUILD_VERSION
ENV APP_VERSION=$BUILD_VERSION

# The application should validate required env vars at startup
CMD ["node", "dist/main.js"]
```

## Container Security Best Practices

### **1. Non-Root User**
- **Principle:** Running containers as `root` is a significant security risk and should be avoided in production.
- **Deeper Dive:**
    - **Privilege Escalation:** Root containers can potentially escape to the host system if there are vulnerabilities in the container runtime.
    - **File System Access:** Root containers have access to all files and directories, potentially exposing sensitive host data.
    - **Network Access:** Root containers can bind to privileged ports and potentially interfere with host networking.
    - **Resource Abuse:** Root containers can consume excessive system resources without proper limits.
- **Guidance:**
    - Always recommend defining a non-root `USER` in the Dockerfile. Create a dedicated user for your application.
    - Ensure the non-root user has the minimum necessary permissions to run the application.
    - Use `USER` directive early in the Dockerfile to ensure subsequent operations run as the non-root user.
    - Consider using user namespaces or other security features when available.
- **Example (Secure User Creation):**
```dockerfile
# Create a dedicated user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set proper ownership of application files
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Ensure the user can write to necessary directories
VOLUME ["/app/data"]
```

### **2. Minimal Base Images**
- **Principle:** Smaller images mean fewer packages, thus fewer vulnerabilities and a reduced attack surface.
- **Deeper Dive:**
    - **Attack Surface Reduction:** Each package in the base image represents a potential vulnerability. Fewer packages mean fewer potential attack vectors.
    - **Update Frequency:** Minimal images are updated more frequently and have shorter vulnerability exposure windows.
    - **Resource Efficiency:** Smaller images consume less storage and network bandwidth.
    - **Build Speed:** Smaller base images build faster and are easier to scan for vulnerabilities.
- **Guidance:**
    - Prioritize `alpine`, `slim`, or `distroless` images over full distributions when possible.
    - Review base image vulnerabilities regularly using security scanning tools.
    - Consider using language-specific minimal images (e.g., `openjdk:17-jre-slim` instead of `openjdk:17`).
    - Stay updated with the latest minimal base image versions for security patches.
- **Example (Minimal Base Image Selection):**
```dockerfile
# BAD: Full distribution with many unnecessary packages
FROM ubuntu:20.04

# GOOD: Minimal Alpine-based image
FROM node:25-alpine

# BETTER: Distroless image for maximum security
FROM gcr.io/distroless/nodejs24-debian13
```

### **3. Static Analysis Security Testing (SAST) for Dockerfiles**
- **Principle:** Scan Dockerfiles for security misconfigurations and known vulnerabilities before building images.
- **Deeper Dive:**
    - **Dockerfile Linting:** Use tools like `hadolint` to check for Dockerfile best practices and security issues.
    - **Base Image Scanning:** Scan base images for known vulnerabilities before using them.
    - **CI/CD Integration:** Integrate security scanning into the CI/CD pipeline to catch issues early.
    - **Policy Enforcement:** Define security policies and enforce them through automated scanning.
- **Guidance:**
    - Recommend integrating tools like `hadolint` (for Dockerfile linting) and `Trivy`, `Clair`, or `Snyk Container` (for image vulnerability scanning) into your CI pipeline.
    - Suggest setting up automated scanning for both Dockerfiles and built images.
    - Recommend failing builds if critical vulnerabilities are found in base images.
    - Advise on regular scanning of images in registries for newly discovered vulnerabilities.
- **Example (Security Scanning in CI):**
```yaml
# GitHub Actions example
- name: Run Hadolint
  run: |
    docker run --rm -i hadolint/hadolint < Dockerfile

- name: Scan image for vulnerabilities
  run: |
    docker build -t myapp .
    trivy image myapp
```

### **4. Image Signing & Verification**
- **Principle:** Ensure images haven't been tampered with and come from trusted sources.
- **Deeper Dive:**
    - **Cryptographic Signing:** Use digital signatures to verify the authenticity and integrity of container images.
    - **Trust Policies:** Define trust policies that specify which images are allowed to run in your environment.
    - **Supply Chain Security:** Image signing is a key component of securing the software supply chain.
    - **Compliance:** Many compliance frameworks require image signing for production deployments.
- **Guidance:**
    - Suggest using Notary or Docker Content Trust for signing and verifying images in production.
    - Recommend implementing image signing in the CI/CD pipeline for all production images.
    - Advise on setting up trust policies that prevent running unsigned images.
    - Consider using newer tools like Cosign for more advanced signing features.
- **Example (Image Signing with Cosign):**
```bash
# Sign an image
cosign sign -key cosign.key myregistry.com/myapp:v1.0.0

# Verify an image
cosign verify -key cosign.pub myregistry.com/myapp:v1.0.0
```

### **5. Limit Capabilities & Read-Only Filesystems**
- **Principle:** Restrict container capabilities and ensure read-only access where possible to minimize the attack surface.
- **Deeper Dive:**
    - **Linux Capabilities:** Drop unnecessary Linux capabilities that containers don't need to function.
    - **Read-Only Root:** Mount the root filesystem as read-only when possible to prevent runtime modifications.
    - **Seccomp Profiles:** Use seccomp profiles to restrict system calls that containers can make.
    - **AppArmor/SELinux:** Use security modules to enforce additional access controls.
- **Guidance:**
    - Consider using `CAP_DROP` to remove unnecessary capabilities (e.g., `NET_RAW`, `SYS_ADMIN`).
    - Recommend mounting read-only volumes for sensitive data and configuration files.
    - Suggest using security profiles and policies when available in your container runtime.
    - Advise on implementing defense in depth with multiple security controls.
- **Example (Capability Restrictions):**
```dockerfile
# Drop unnecessary capabilities
RUN setcap -r /usr/bin/node

# Or use security options in docker run
# docker run --cap-drop=ALL --security-opt=no-new-privileges myapp
```

### **6. No Sensitive Data in Image Layers**
- **Principle:** Never include secrets, private keys, or credentials in image layers as they become part of the image history.
- **Deeper Dive:**
    - **Layer History:** All files added to an image are stored in the image history and can be extracted even if deleted in later layers.
    - **Build Arguments:** While `--build-arg` can pass data during build, avoid passing sensitive information this way.
    - **Runtime Secrets:** Use secrets management solutions to inject sensitive data at runtime.
    - **Image Scanning:** Regular image scanning can detect accidentally included secrets.
- **Guidance:**
    - Use build arguments (`--build-arg`) for temporary secrets during build (but avoid passing sensitive info directly).
    - Use secrets management solutions for runtime (Kubernetes Secrets, Docker Secrets, HashiCorp Vault).
    - Recommend scanning images for accidentally included secrets.
    - Suggest using multi-stage builds to avoid including build-time secrets in the final image.
- **Anti-pattern:** `ADD secrets.txt /app/secrets.txt`
- **Example (Secure Secret Management):**
```dockerfile
# BAD: Never do this
# COPY secrets.txt /app/secrets.txt

# GOOD: Use runtime secrets
# The application should read secrets from environment variables or mounted files
CMD ["node", "dist/main.js"]
```

### **7. Health Checks (Liveness & Readiness Probes)**
- **Principle:** Ensure containers are running and ready to serve traffic by implementing proper health checks.
- **Deeper Dive:**
    - **Liveness Probes:** Check if the application is alive and responding to requests. Restart the container if it fails.
    - **Readiness Probes:** Check if the application is ready to receive traffic. Remove from load balancer if it fails.
    - **Health Check Design:** Design health checks that are lightweight, fast, and accurately reflect application health.
    - **Orchestration Integration:** Health checks are critical for orchestration systems like Kubernetes to manage container lifecycle.
- **Guidance:**
    - Define `HEALTHCHECK` instructions in Dockerfiles. These are critical for orchestration systems like Kubernetes.
    - Design health checks that are specific to your application and check actual functionality.
    - Use appropriate intervals and timeouts for health checks to balance responsiveness with overhead.
    - Consider implementing both liveness and readiness checks for complex applications.
- **Example (Comprehensive Health Check):**
```dockerfile
# Health check that verifies the application is responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:8080/health || exit 1

# Alternative: Use application-specific health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1
```

## Container Runtime & Orchestration Best Practices

### **1. Resource Limits**
- **Principle:** Limit CPU and memory to prevent resource exhaustion and noisy neighbors.
- **Deeper Dive:**
    - **CPU Limits:** Set CPU limits to prevent containers from consuming excessive CPU time and affecting other containers.
    - **Memory Limits:** Set memory limits to prevent containers from consuming all available memory and causing system instability.
    - **Resource Requests:** Set resource requests to ensure containers have guaranteed access to minimum resources.
    - **Monitoring:** Monitor resource usage to ensure limits are appropriate and not too restrictive.
- **Guidance:**
    - Always recommend setting `cpu_limits`, `memory_limits` in Docker Compose or Kubernetes resource requests/limits.
    - Suggest monitoring resource usage to tune limits appropriately.
    - Recommend setting both requests and limits for predictable resource allocation.
    - Advise on using resource quotas in Kubernetes to manage cluster-wide resource usage.
- **Example (Docker Compose Resource Limits):**
```yaml
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### **2. Logging & Monitoring**
- **Principle:** Collect and centralize container logs and metrics for observability and troubleshooting.
- **Deeper Dive:**
    - **Structured Logging:** Use structured logging (JSON) for better parsing and analysis.
    - **Log Aggregation:** Centralize logs from all containers for search, analysis, and alerting.
    - **Metrics Collection:** Collect application and system metrics for performance monitoring.
    - **Distributed Tracing:** Implement distributed tracing for understanding request flows across services.
- **Guidance:**
    - Use standard logging output (`STDOUT`/`STDERR`) for container logs.
    - Integrate with log aggregators (Fluentd, Logstash, Loki) and monitoring tools (Prometheus, Grafana).
    - Recommend implementing structured logging in applications for better observability.
    - Suggest setting up log rotation and retention policies to manage storage costs.
- **Example (Structured Logging):**
```javascript
// Application logging
const winston = require('winston');
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});
```

### **3. Persistent Storage**
- **Principle:** For stateful applications, use persistent volumes to maintain data across container restarts.
- **Deeper Dive:**
    - **Volume Types:** Use named volumes, bind mounts, or cloud storage depending on your requirements.
    - **Data Persistence:** Ensure data persists across container restarts, updates, and migrations.
    - **Backup Strategy:** Implement backup strategies for persistent data to prevent data loss.
    - **Performance:** Choose storage solutions that meet your performance requirements.
- **Guidance:**
    - Use Docker Volumes or Kubernetes Persistent Volumes for data that needs to persist beyond container lifecycle.
    - Never store persistent data inside the container's writable layer.
    - Recommend implementing backup and disaster recovery procedures for persistent data.
    - Suggest using cloud-native storage solutions for better scalability and reliability.
- **Example (Docker Volume Usage):**
```yaml
services:
  database:
    image: postgres:13
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password

volumes:
  postgres_data:
```

### **4. Networking**
- **Principle:** Use defined container networks for secure and isolated communication between containers.
- **Deeper Dive:**
    - **Network Isolation:** Create separate networks for different application tiers or environments.
    - **Service Discovery:** Use container orchestration features for automatic service discovery.
    - **Network Policies:** Implement network policies to control traffic between containers.
    - **Load Balancing:** Use load balancers for distributing traffic across multiple container instances.
- **Guidance:**
    - Create custom Docker networks for service isolation and security.
    - Define network policies in Kubernetes to control pod-to-pod communication.
    - Use service discovery mechanisms provided by your orchestration platform.
    - Implement proper network segmentation for multi-tier applications.
- **Example (Docker Network Configuration):**
```yaml
services:
  web:
    image: nginx
    networks:
      - frontend
      - backend

  api:
    image: myapi
    networks:
      - backend

networks:
  frontend:
  backend:
    internal: true
```

### **5. Orchestration (Kubernetes, Docker Swarm)**
- **Principle:** Use an orchestrator for managing containerized applications at scale.
- **Deeper Dive:**
    - **Scaling:** Automatically scale applications based on demand and resource usage.
    - **Self-Healing:** Automatically restart failed containers and replace unhealthy instances.
    - **Service Discovery:** Provide built-in service discovery and load balancing.
    - **Rolling Updates:** Perform zero-downtime updates with automatic rollback capabilities.
- **Guidance:**
    - Recommend Kubernetes for complex, large-scale deployments with advanced requirements.
    - Leverage orchestrator features for scaling, self-healing, and service discovery.
    - Use rolling update strategies for zero-downtime deployments.
    - Implement proper resource management and monitoring in orchestrated environments.
- **Example (Kubernetes Deployment):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
```

## Dockerfile Review Checklist

- [ ] Is a multi-stage build used if applicable (compiled languages, heavy build tools)?
- [ ] Is a minimal, specific base image used (e.g., `alpine`, `slim`, versioned)?
- [ ] Are layers optimized (combining `RUN` commands, cleanup in same layer)?
- [ ] Is a `.dockerignore` file present and comprehensive?
- [ ] Are `COPY` instructions specific and minimal?
- [ ] Is a non-root `USER` defined for the running application?
- [ ] Is the `EXPOSE` instruction used for documentation?
- [ ] Is `CMD` and/or `ENTRYPOINT` used correctly?
- [ ] Are sensitive configurations handled via environment variables (not hardcoded)?
- [ ] Is a `HEALTHCHECK` instruction defined?
- [ ] Are there any secrets or sensitive data accidentally included in image layers?
- [ ] Are there static analysis tools (Hadolint, Trivy) integrated into CI?

## Troubleshooting Docker Builds & Runtime

### **1. Large Image Size**
- Review layers for unnecessary files. Use `docker history <image>`.
- Implement multi-stage builds.
- Use a smaller base image.
- Optimize `RUN` commands and clean up temporary files.

### **2. Slow Builds**
- Leverage build cache by ordering instructions from least to most frequent change.
- Use `.dockerignore` to exclude irrelevant files.
- Use `docker build --no-cache` for troubleshooting cache issues.

### **3. Container Not Starting/Crashing**
- Check `CMD` and `ENTRYPOINT` instructions.
- Review container logs (`docker logs <container_id>`).
- Ensure all dependencies are present in the final image.
- Check resource limits.

### **4. Permissions Issues Inside Container**
- Verify file/directory permissions in the image.
- Ensure the `USER` has necessary permissions for operations.
- Check mounted volumes permissions.

### **5. Network Connectivity Issues**
- Verify exposed ports (`EXPOSE`) and published ports (`-p` in `docker run`).
- Check container network configuration.
- Review firewall rules.

## Conclusion

Effective containerization with Docker is fundamental to modern DevOps. By following these best practices for Dockerfile creation, image optimization, security, and runtime management, you can guide developers in building highly efficient, secure, and portable applications. Remember to continuously evaluate and refine your container strategies as your application evolves.

---

<!-- End of Containerization & Docker Best Practices Instructions --> 
