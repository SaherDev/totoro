# Data Model: Gateway Chat Refactor

**Feature**: 001-gateway-chat-refactor  
**Date**: 2026-04-09

---

## Shared Types (libs/shared)

### ChatRequestDto (NEW — add to types.ts)

Sent from frontend → NestJS. NestJS injects `user_id` before forwarding to AI service.

```typescript
export interface ChatRequestDto {
  user_id: string;           // Injected by NestJS from Clerk auth — NOT from frontend
  message: string;           // Raw user input (URL, query, memory fragment — unclassified)
  location?: {
    lat: number;
    lng: number;
  };
}
```

### ChatResponseDto (NEW — add to types.ts)

Returned from AI service → NestJS → frontend. Always HTTP 200. Frontend reads `type` to determine what happened.

```typescript
export interface ChatResponseDto {
  type: 'extract-place' | 'consult' | 'recall' | 'assistant' | 'clarification' | 'error';
  message: string;           // Human-readable response text
  data: Record<string, unknown> | null;  // Intent-specific payload; null on error/clarification
}
```

**Note**: Old types (`ConsultRequest`, `ConsultResponse`, `PlaceResult`, `PlaceSource`, `ReasoningStep`, `SseEvent`, `LocationCoordinates`) are NOT removed in this feature. They are kept until apps/web migrates off the old endpoint pattern. A grep of `apps/web` imports from `@totoro/shared` must confirm safe removal before deletion.

---

## NestJS DTOs (services/api — local, not in libs/shared)

### ChatRequestBodyDto

Validates the request body received from the frontend. `user_id` is NOT in this DTO — it is injected from the Clerk auth token by the service, not submitted by the client.

```typescript
// services/api/src/chat/dto/chat-request.dto.ts
class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

class ChatRequestBodyDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}
```

---

## TypeORM Entities (services/api)

### UserEntity

Maps to existing `users` table. Column names match Prisma-created schema exactly (camelCase).

```typescript
// services/api/src/database/entities/user.entity.ts
@Entity('users')
export class UserEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;                  // CUID generated via @BeforeInsert()

  @Column({ unique: true })
  email: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @OneToOne(() => UserSettingsEntity, (settings) => settings.user, {
    cascade: true,
    eager: false,
  })
  settings?: UserSettingsEntity;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = createId(); // from @paralleldrive/cuid2
    }
  }
}
```

### UserSettingsEntity

Maps to existing `user_settings` table. `userId` FK column is camelCase (Prisma default).

```typescript
// services/api/src/database/entities/user-settings.entity.ts
@Entity('user_settings')
export class UserSettingsEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;                  // CUID generated via @BeforeInsert()

  @Column({ name: 'userId', unique: true })
  userId: string;

  @OneToOne(() => UserEntity, (user) => user.settings)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ default: 'en' })
  locale: string;              // "en" | "he"

  @Column({ default: 'system' })
  theme: string;               // "light" | "dark" | "system"

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = createId(); // from @paralleldrive/cuid2
    }
  }
}
```

---

## Tables Removed

| Table | How | Migration |
|-------|-----|-----------|
| `recommendations` | Prisma migration before Prisma removal | `remove_recommendations_table` |

---

## Tables Unchanged

| Table | ORM Before | ORM After | Notes |
|-------|-----------|-----------|-------|
| `users` | Prisma | TypeORM | Column names unchanged |
| `user_settings` | Prisma | TypeORM | Column names unchanged |

---

## Tables Owned by FastAPI (Untouched)

- `places`
- `embeddings`
- `taste_model`

These are never touched by this feature or TypeORM's `synchronize`. Alembic owns them.

**Risk note**: TypeORM `synchronize: true` only touches tables that have corresponding entities registered in `TypeOrmModule.forFeature()` or `entities` array. FastAPI-owned tables are NOT registered as entities — TypeORM will NOT attempt to sync them. Verify this is correct by checking TypeORM docs for synchronize behavior with unregistered tables.

**TypeORM synchronize behavior**: TypeORM only creates/alters tables for registered entities. It does NOT drop or alter tables with no corresponding entity. FastAPI tables are safe.
