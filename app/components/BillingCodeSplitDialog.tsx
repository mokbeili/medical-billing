"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

interface BillingCodeSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  splitDescription: string;
}

export function BillingCodeSplitDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  splitDescription,
}: BillingCodeSplitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Time-Based Billing Code Split</DialogTitle>
          <DialogDescription>
            The system will automatically split your billing codes based on your
            locations of service time ranges.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {splitDescription}
            </pre>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm and Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
