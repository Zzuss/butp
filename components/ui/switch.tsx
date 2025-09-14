"use client"

import * as React from "react"

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, checked, defaultChecked, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked || false)
    const isControlled = checked !== undefined
    const checkedValue = isControlled ? checked : internalChecked

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = event.target.checked
      
      if (!isControlled) {
        setInternalChecked(newChecked)
      }
      
      onCheckedChange?.(newChecked)
      props.onChange?.(event)
    }

    return (
      <label className={`relative inline-flex h-6 w-11 cursor-pointer items-center ${className || ''}`}>
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          checked={checkedValue}
          onChange={handleChange}
          {...props}
        />
        <div
          className={`h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${
            checkedValue
              ? 'bg-blue-600'
              : 'bg-gray-200'
          }`}
        >
          <div
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              checkedValue ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
