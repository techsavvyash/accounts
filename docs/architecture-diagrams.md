# Architecture Diagrams

## System Architecture with Tech Stack

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>React/Next.js]
        MOBILE[Mobile App<br/>React Native]
        WA[WhatsApp Bot<br/>Webhook Handler]
    end

    subgraph "API Gateway"
        ELYSIA[ElysiaJS Server<br/>+ Swagger Plugin]
        AUTH[JWT Auth<br/>Middleware]
        RATE[Rate Limiter]
    end

    subgraph "Business Logic"
        INV[Inventory<br/>Service]
        INVOICE[Invoice<br/>Service]
        GST[GST<br/>Service]
        PARTY[Party<br/>Service]
        ANALYTICS[Analytics<br/>Service]
    end

    subgraph "Data Layer"
        PRISMA[Prisma ORM]
        PG[(PostgreSQL)]
        REDIS[(Redis Cache)]
    end

    subgraph "External Services"
        POSTHOG[PostHog<br/>Analytics]
        S3[S3/Local<br/>File Storage]
        PDF[PDF Generator<br/>Puppeteer]
    end

    WEB --> ELYSIA
    MOBILE --> ELYSIA
    WA --> ELYSIA
    
    ELYSIA --> AUTH
    AUTH --> RATE
    RATE --> INV
    RATE --> INVOICE
    RATE --> GST
    RATE --> PARTY
    RATE --> ANALYTICS
    
    INV --> PRISMA
    INVOICE --> PRISMA
    GST --> PRISMA
    PARTY --> PRISMA
    ANALYTICS --> PRISMA
    
    PRISMA --> PG
    PRISMA --> REDIS
    
    ANALYTICS --> POSTHOG
    INVOICE --> PDF
    PDF --> S3
```

## Invoice Creation Flow

```mermaid
sequenceDiagram
    participant Client
    participant Auth
    participant InvoiceAPI
    participant Validation
    participant GST
    participant DB
    participant PDF
    participant PostHog

    Client->>Auth: POST /api/auth/login
    Auth-->>Client: JWT Token
    
    Client->>InvoiceAPI: POST /api/invoices (with JWT)
    InvoiceAPI->>Auth: Validate Token & Permissions
    Auth-->>InvoiceAPI: User Context
    
    InvoiceAPI->>Validation: Validate Invoice Data
    Validation-->>InvoiceAPI: Validation Result
    
    InvoiceAPI->>GST: Calculate GST
    GST-->>InvoiceAPI: Tax Breakdown (CGST/SGST/IGST)
    
    InvoiceAPI->>DB: Begin Transaction
    InvoiceAPI->>DB: Create Invoice Record
    InvoiceAPI->>DB: Create Invoice Items
    InvoiceAPI->>DB: Update Inventory
    InvoiceAPI->>DB: Create Tax Records
    InvoiceAPI->>DB: Commit Transaction
    
    InvoiceAPI->>PDF: Generate Invoice PDF
    PDF-->>InvoiceAPI: PDF URL
    
    InvoiceAPI->>PostHog: Track Invoice Created Event
    
    InvoiceAPI-->>Client: Invoice Response with PDF URL
```

## GST Return Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Auth
    participant GSTService
    participant DB
    participant Validator
    participant FileGen

    User->>API: GET /api/gst/returns/GSTR1/{period}
    API->>Auth: Check Owner/Admin Role
    Auth-->>API: Authorized
    
    API->>GSTService: Generate GSTR1 Request
    GSTService->>DB: Fetch Period Invoices
    DB-->>GSTService: Invoice Data
    
    GSTService->>DB: Fetch Tax Calculations
    DB-->>GSTService: Tax Data
    
    GSTService->>GSTService: Aggregate B2B Supplies
    GSTService->>GSTService: Aggregate B2C Supplies
    GSTService->>GSTService: Calculate HSN Summary
    
    GSTService->>Validator: Validate Return Data
    Validator-->>GSTService: Validation Result
    
    GSTService->>FileGen: Generate JSON/Excel
    FileGen-->>GSTService: File URL
    
    GSTService->>DB: Save Return Record
    GSTService-->>API: Return Data & File
    API-->>User: GSTR1 Response
```

## Inventory Management State Machine

```mermaid
stateDiagram-v2
    [*] --> Available: Product Added
    Available --> Reserved: Order Created
    Reserved --> Sold: Invoice Confirmed
    Reserved --> Available: Order Cancelled
    Sold --> Returned: Credit Note
    Returned --> Available: Restock
    Available --> Damaged: Quality Issue
    Damaged --> [*]: Write Off
    
    Available --> LowStock: Quantity < Min
    LowStock --> Available: Restocked
    LowStock --> OutOfStock: Quantity = 0
    OutOfStock --> Available: Restocked
```

## Role-Based Access Control

```mermaid
graph TB
    subgraph "Admin Permissions"
        A1[User Management]
        A2[System Config]
        A3[All Business Ops]
        A4[Delete Records]
    end
    
    subgraph "Owner Permissions"
        O1[View All Data]
        O2[GST Returns]
        O3[Financial Reports]
        O4[Approve High Value]
        O5[Pricing Control]
    end
    
    subgraph "Sales Person Permissions"
        S1[Create Invoice]
        S2[View Customers]
        S3[Update Stock]
        S4[Basic Reports]
    end
    
    ADMIN[Admin Role] --> A1
    ADMIN --> A2
    ADMIN --> A3
    ADMIN --> A4
    ADMIN -.includes.-> OWNER
    
    OWNER[Owner Role] --> O1
    OWNER --> O2
    OWNER --> O3
    OWNER --> O4
    OWNER --> O5
    OWNER -.includes.-> SALES
    
    SALES[Sales Role] --> S1
    SALES --> S2
    SALES --> S3
    SALES --> S4
```

## Data Flow Architecture

```mermaid
graph LR
    subgraph "Write Path"
        API1[API Request] --> VAL[Validation]
        VAL --> BL[Business Logic]
        BL --> PRISMA1[Prisma ORM]
        PRISMA1 --> PG1[(PostgreSQL)]
        BL --> CACHE1[Cache Invalidation]
        CACHE1 --> REDIS1[(Redis)]
        BL --> EVENT[Event Bus]
        EVENT --> POSTHOG1[PostHog]
    end
    
    subgraph "Read Path"
        API2[API Request] --> CACHE2[Check Cache]
        CACHE2 -->|Hit| RESP[Response]
        CACHE2 -->|Miss| PRISMA2[Prisma ORM]
        PRISMA2 --> PG2[(PostgreSQL)]
        PRISMA2 --> CACHE3[Update Cache]
        CACHE3 --> REDIS2[(Redis)]
        CACHE3 --> RESP
    end
```

## Monorepo Structure

```mermaid
graph TD
    ROOT[accounts-platform/]
    ROOT --> APPS[apps/]
    ROOT --> PACKAGES[packages/]
    ROOT --> CONFIG[config/]
    
    APPS --> API[api/<br/>ElysiaJS Backend]
    APPS --> WEB[web/<br/>Next.js Frontend]
    APPS --> MOBILE[mobile/<br/>React Native]
    
    PACKAGES --> DB[database/<br/>Prisma Schema]
    PACKAGES --> SHARED[shared/<br/>Types & Utils]
    PACKAGES --> UI[ui/<br/>Component Library]
    
    CONFIG --> ESLINT[eslint-config/]
    CONFIG --> TS[typescript-config/]
    
    API --> DB
    API --> SHARED
    WEB --> SHARED
    WEB --> UI
    MOBILE --> SHARED
    MOBILE --> UI
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        LB[Load Balancer]
        
        subgraph "Application Tier"
            API1[API Server 1]
            API2[API Server 2]
            WORKER[Background Workers]
        end
        
        subgraph "Data Tier"
            PG_PRIMARY[(PostgreSQL<br/>Primary)]
            PG_REPLICA[(PostgreSQL<br/>Replica)]
            REDIS_CLUSTER[(Redis Cluster)]
        end
        
        subgraph "Storage"
            S3[S3 Compatible<br/>Object Storage]
        end
        
        subgraph "Monitoring"
            POSTHOG[PostHog]
            LOGS[Log Aggregation]
            METRICS[Metrics]
        end
    end
    
    CLIENT[Clients] --> LB
    LB --> API1
    LB --> API2
    
    API1 --> PG_PRIMARY
    API2 --> PG_PRIMARY
    API1 --> REDIS_CLUSTER
    API2 --> REDIS_CLUSTER
    
    PG_PRIMARY --> PG_REPLICA
    
    API1 --> S3
    API2 --> S3
    WORKER --> S3
    
    API1 --> POSTHOG
    API2 --> POSTHOG
    WORKER --> POSTHOG
    
    API1 --> LOGS
    API2 --> LOGS
    WORKER --> LOGS
```