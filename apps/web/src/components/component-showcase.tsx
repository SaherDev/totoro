'use client';

import {
  Button,
  Badge,
  Avatar,
  Card,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ScrollArea,
  Separator,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@totoro/ui';
import { useState } from 'react';

/**
 * Component Showcase Page
 * Displays all 12 UI primitives with all variants and states
 * Used for visual verification against Lovable's DesignSystemScreen
 */
export function ComponentShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">
            Component Showcase
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            All 12 UI primitives with variants and states
          </p>
        </div>

        {/* Button Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Button
          </h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex gap-2">
              <Button disabled>Disabled</Button>
            </div>
          </div>
          <Separator />
        </section>

        {/* Badge Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Badge
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="muted">Muted</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
          <Separator />
        </section>

        {/* Avatar Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Avatar
          </h2>
          <div className="flex gap-4">
            <Avatar>
              <img src="https://github.com/shadcn.png" alt="@shadcn" />
            </Avatar>
            <Avatar>
              <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
                AB
              </div>
            </Avatar>
            <Avatar>
              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                ?
              </div>
            </Avatar>
          </div>
          <Separator />
        </section>

        {/* Card Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Card
          </h2>
          <Card className="p-6">
            <h3 className="font-semibold text-foreground">Card Title</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This is a card with content
            </p>
          </Card>
          <Card className="space-y-4">
            <div className="border-b border-border pb-4">
              <h3 className="font-semibold text-foreground">With Header</h3>
            </div>
            <p className="text-sm text-muted-foreground">Card content</p>
            <div className="border-t border-border pt-4 flex gap-2">
              <Button size="sm">Action</Button>
              <Button size="sm" variant="outline">
                Cancel
              </Button>
            </div>
          </Card>
          <Separator />
        </section>

        {/* Input Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Input
          </h2>
          <div className="max-w-md space-y-4">
            <Input placeholder="Default input" />
            <Input placeholder="With prefix" defaultValue="@" />
            <Input placeholder="Disabled" disabled />
            <Input placeholder="Error state" className="border-destructive" />
          </div>
          <Separator />
        </section>

        {/* Dialog Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Dialog / Modal
          </h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This is a dialog modal component
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Separator />
        </section>

        {/* ScrollArea Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            ScrollArea
          </h2>
          <ScrollArea className="h-40 w-full border border-border rounded-lg p-4">
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="text-sm text-foreground">
                  Item {i + 1}
                </div>
              ))}
            </div>
          </ScrollArea>
          <Separator />
        </section>

        {/* Separator Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Separator
          </h2>
          <div>
            <p className="text-sm text-foreground">Horizontal</p>
            <Separator className="my-2" />
            <p className="text-sm text-foreground">Content after separator</p>
          </div>
          <Separator />
        </section>

        {/* Skeleton Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Skeleton
          </h2>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-8 w-32 rounded" />
          </div>
          <Separator />
        </section>

        {/* Tabs Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Tabs
          </h2>
          <Tabs defaultValue="tab1">
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
              <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1" className="mt-4">
              <p className="text-sm text-muted-foreground">Content for tab 1</p>
            </TabsContent>
            <TabsContent value="tab2" className="mt-4">
              <p className="text-sm text-muted-foreground">Content for tab 2</p>
            </TabsContent>
            <TabsContent value="tab3" className="mt-4">
              <p className="text-sm text-muted-foreground">Content for tab 3</p>
            </TabsContent>
          </Tabs>
          <Separator />
        </section>

        {/* Tooltip Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            Tooltip
          </h2>
          <div className="flex gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tooltip content</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Separator />
        </section>

        {/* DropdownMenu Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">
            DropdownMenu
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Item 1</DropdownMenuItem>
              <DropdownMenuItem>Item 2</DropdownMenuItem>
              <DropdownMenuItem>Item 3</DropdownMenuItem>
              <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </section>
      </div>
    </div>
  );
}
