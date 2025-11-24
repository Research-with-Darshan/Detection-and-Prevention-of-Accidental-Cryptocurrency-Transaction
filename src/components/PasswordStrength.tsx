import { validatePassword } from '@/lib/crypto';
import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[] }>({
    isValid: false,
    errors: [],
  });
  
  useEffect(() => {
    if (password) {
      setValidation(validatePassword(password));
    } else {
      setValidation({ isValid: false, errors: [] });
    }
  }, [password]);
  
  const requirements = [
    { text: 'At least 8 characters', met: password.length >= 8 },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { text: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { text: 'Contains number', met: /[0-9]/.test(password) },
    { text: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  
  const strength = requirements.filter(r => r.met).length;
  const strengthPercent = (strength / requirements.length) * 100;
  
  const strengthColor = strength <= 2 ? 'bg-destructive' : strength <= 4 ? 'bg-warning' : 'bg-success';
  const strengthText = strength <= 2 ? 'Weak' : strength <= 4 ? 'Medium' : 'Strong';
  
  if (!password) return null;
  
  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Password Strength</span>
          <span className={cn(
            'font-medium',
            strength <= 2 ? 'text-destructive' : strength <= 4 ? 'text-warning' : 'text-success'
          )}>
            {strengthText}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn('h-full transition-all duration-300', strengthColor)}
            style={{ width: `${strengthPercent}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {req.met ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={req.met ? 'text-success' : 'text-muted-foreground'}>
              {req.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}