"use client"

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  itemName?: string
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Delete Item',
  description = 'This action cannot be undone.',
  itemName,
}: DeleteConfirmationDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  
  const isConfirmValid = confirmText.toUpperCase() === 'DELETE'
  
  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm()
      setConfirmText('')
    }
  }
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmText('')
    }
    onOpenChange(open)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span className="block">
              {description}
              {itemName && (
                <span className="block mt-2 font-medium text-foreground">
                  Item: {itemName}
                </span>
              )}
            </span>
            <span className="block pt-2">
              To confirm deletion, please type <strong className="text-destructive">DELETE</strong> below:
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-2">
          <Label htmlFor="confirm-delete" className="sr-only">
            Type DELETE to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="font-mono"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isConfirmValid) {
                handleConfirm()
              }
            }}
          />
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText('')}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}












