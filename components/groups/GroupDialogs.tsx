"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { createGroup, joinGroup } from "@/app/action/group.action";
import {
  CreateGroupSchema,
  JoinGroupSchema,
  type CreateGroupDTO,
  type JoinGroupDTO,
} from "@/servers/validators/group.validator";

export function GroupDialogs() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          New or join group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Groups</DialogTitle>
          <DialogDescription>
            Create a new group to share a job-application board with friends, or join one with
            an invite code.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="create">
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1">
              Create
            </TabsTrigger>
            <TabsTrigger value="join" className="flex-1">
              Join
            </TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <CreateGroupForm onDone={() => setOpen(false)} />
          </TabsContent>
          <TabsContent value="join">
            <JoinGroupForm onDone={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CreateGroupForm({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateGroupDTO>({ resolver: zodResolver(CreateGroupSchema) });

  const onSubmit = (data: CreateGroupDTO) => {
    startTransition(async () => {
      const result = await createGroup(data);
      if (result && !result.ok) {
        toast.error(result.error);
        return;
      }
      onDone();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="name">Group name</Label>
        <Input id="name" placeholder="e.g. Job Hunt Squad" {...register("name")} />
        {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create group"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function JoinGroupForm({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinGroupDTO>({ resolver: zodResolver(JoinGroupSchema) });

  const onSubmit = (data: JoinGroupDTO) => {
    startTransition(async () => {
      const result = await joinGroup(data);
      if (result && !result.ok) {
        toast.error(result.error);
        return;
      }
      onDone();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="inviteCode">Invite code</Label>
        <Input
          id="inviteCode"
          placeholder="e.g. K3F9QX2A"
          className="uppercase"
          {...register("inviteCode")}
        />
        {errors.inviteCode && (
          <p className="text-destructive text-sm">{errors.inviteCode.message}</p>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Joining..." : "Join group"}
        </Button>
      </DialogFooter>
    </form>
  );
}
