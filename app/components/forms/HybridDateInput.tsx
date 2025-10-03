"use client";

import { Input } from "@/components/ui/input";
import { parseFlexibleDate } from "@/lib/dateUtils";
import { useEffect, useRef, useState } from "react";

interface HybridDateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function HybridDateInput({
  value,
  onChange,
  placeholder = "e.g., 22 Feb 2024, 22/02/2024, or use calendar",
  className = "",
}: HybridDateInputProps) {
  const [inputMode, setInputMode] = useState<"text" | "date">("text");
  const [textValue, setTextValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize text value from prop value
  useEffect(() => {
    if (value && inputMode === "text" && !textValue) {
      // If we have a YYYY-MM-DD value, keep it as is for text mode
      setTextValue(value);
    }
  }, [value, inputMode, textValue]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setTextValue(input);

    // Try to parse the input
    const parsed = parseFlexibleDate(input);
    if (parsed) {
      // Valid date, update the parent with YYYY-MM-DD format
      onChange(parsed);
    } else if (input === "") {
      // Clear the date
      onChange("");
    }
    // If invalid but not empty, keep the text but don't update parent yet
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value; // Already in YYYY-MM-DD format
    onChange(dateValue);
    setTextValue(dateValue);
  };

  const handleCalendarClick = () => {
    setInputMode("date");
    // Small delay to ensure the input type has changed before clicking
    setTimeout(() => {
      inputRef.current?.showPicker?.();
    }, 0);
  };

  const handleBlur = () => {
    // When leaving date mode, validate the current value
    if (inputMode === "date" && value) {
      setTextValue(value);
    }
    // Switch back to text mode after a short delay
    setTimeout(() => {
      setInputMode("text");
    }, 200);
  };

  return (
    <div className="relative">
      {inputMode === "text" ? (
        <>
          <Input
            ref={inputRef}
            type="text"
            value={textValue}
            onChange={handleTextChange}
            placeholder={placeholder}
            className={className}
          />
          <button
            type="button"
            onClick={handleCalendarClick}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Open calendar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </button>
        </>
      ) : (
        <Input
          ref={inputRef}
          type="date"
          value={value}
          onChange={handleDateChange}
          onBlur={handleBlur}
          className={className}
        />
      )}
    </div>
  );
}
