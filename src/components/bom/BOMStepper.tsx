import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface Step {
  id: string;
  title: string;
  description?: string;
  status: 'complete' | 'current' | 'locked' | 'available';
  badge?: string;
}

interface BOMStepperProps {
  steps: Step[];
  currentStep: string;
  onStepClick?: (stepId: string) => void;
}

export function BOMStepper({ steps, currentStep, onStepClick }: BOMStepperProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isComplete = step.status === 'complete';
              const isCurrent = step.status === 'current';
              const isLocked = step.status === 'locked';
              const isClickable = !isLocked && onStepClick;

              return (
                <li key={step.id} className="relative flex-1">
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'absolute left-1/2 top-5 h-0.5 w-full -translate-y-1/2 transition-all duration-300',
                        isComplete ? 'bg-primary' : 'bg-border'
                      )}
                      aria-hidden="true"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick(step.id)}
                    disabled={isLocked || !onStepClick}
                    className={cn(
                      'group relative flex flex-col items-center transition-all duration-200',
                      isClickable && 'cursor-pointer hover:scale-105',
                      isLocked && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {/* Step indicator */}
                    <div
                      className={cn(
                        'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                        isComplete &&
                          'border-primary bg-primary text-primary-foreground',
                        isCurrent &&
                          'border-primary bg-background text-primary ring-4 ring-primary/20',
                        !isComplete &&
                          !isCurrent &&
                          'border-border bg-background text-muted-foreground',
                        isClickable && !isLocked && 'group-hover:scale-110'
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>

                    {/* Step label */}
                    <div className="mt-2 text-center">
                      <p
                        className={cn(
                          'text-sm font-medium transition-colors',
                          isCurrent && 'text-primary',
                          !isCurrent && 'text-muted-foreground'
                        )}
                      >
                        {step.title}
                      </p>
                      {step.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      )}
                      {step.badge && (
                        <Badge
                          variant={isCurrent ? 'default' : 'secondary'}
                          className="mt-1 text-xs"
                        >
                          {step.badge}
                        </Badge>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
