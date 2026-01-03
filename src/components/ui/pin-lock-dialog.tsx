"use client"

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

interface PinLockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  onCancel?: () => void
  correctPin: string
  pageName?: string
}

export function PinLockDialog({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
  correctPin,
  pageName = 'this page',
}: PinLockDialogProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPin('')
      setError(false)
      // Focus input after dialog opens
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (pin === correctPin) {
      setError(false)
      setAttempts(0)
      onSuccess()
      onOpenChange(false)
    } else {
      setError(true)
      setAttempts(prev => prev + 1)
      setPin('')
      
      if (attempts >= 2) {
        toast.error('Too many incorrect attempts')
      }
    }
  }

  const handleCancel = () => {
    setPin('')
    setError(false)
    onOpenChange(false)
    onCancel?.()
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(value)
    setError(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Lock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center">PIN Required</DialogTitle>
          <DialogDescription className="text-center">
            Enter the 4-digit PIN to access {pageName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={handlePinChange}
              placeholder="• • • •"
              className={`text-center text-2xl tracking-[0.5em] font-mono h-14 ${
                error ? 'border-destructive focus-visible:ring-destructive' : ''
              }`}
              autoComplete="off"
            />
            {error && (
              <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                <ShieldAlert className="h-4 w-4" />
                <span>Incorrect PIN. Please try again.</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={pin.length !== 4}
            >
              Unlock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Hook to manage PIN verification state
export function usePinLock(pageKey: string) {
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    // Check if already verified in this session
    const verified = sessionStorage.getItem(`pin_verified_${pageKey}`)
    if (verified === 'true') {
      setIsVerified(true)
    }
  }, [pageKey])

  const verify = () => {
    sessionStorage.setItem(`pin_verified_${pageKey}`, 'true')
    setIsVerified(true)
  }

  const reset = () => {
    sessionStorage.removeItem(`pin_verified_${pageKey}`)
    setIsVerified(false)
  }

  return { isVerified, verify, reset }
}






